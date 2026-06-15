import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import {
  Plus,
  Search,
  Pencil,
  Loader2,
  Trash2,
  Sparkles,
  Upload,
  CheckSquare,
  Square,
  X,
  Settings2,
} from "lucide-react";
import { ProductFormSheet, type ProductFormValue } from "@/components/ProductFormSheet";
import { uploadProductImage } from "@/lib/storage";
import { MenuScannerSheet } from "@/components/MenuScannerSheet";
import { CategoryManagerSheet, type Category } from "@/components/CategoryManagerSheet";
import { MenuProductsToggle } from "@/components/MenuProductsToggle";
import { DescriptionEnhancerSheet } from "@/components/DescriptionEnhancerSheet";
import { findMatchingCategory } from "@/lib/utils";

export const Route = createFileRoute("/_app/menu")({ component: MenuPage });

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: "disponible" | "rupture";
  image_url: string | null;
  allergens: string[];
  badges: string[];
  translations: ProductFormValue["translations"];
  position: number;
};

function MenuPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const [cat, setCat] = useState<string>("Toutes");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ProductFormValue> | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [enhancerOpen, setEnhancerOpen] = useState(false);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id?: string;
    name?: string;
    count?: number;
    isBulk: boolean;
  } | null>(null);

  const loadCategories = async () => {
    if (!restaurantId) return;
    const { data } = await supabase
      .from("menu_categories")
      .select("id, name, position")
      .eq("restaurant_id", restaurantId)
      .order("position")
      .order("name");
    setCategories((data ?? []) as Category[]);
  };

  const load = async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, description, price, category, status, image_url, allergens, badges, translations, position",
      )
      .eq("restaurant_id", restaurantId)
      .order("category")
      .order("position")
      .order("name");
    if (error) toast.error("Erreur de chargement");
    setItems((data ?? []) as unknown as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!restaurantId) return;
    void Promise.all([load(), loadCategories()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of items) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [items]);

  // Catégories visibles = celles déclarées (dans l'ordre) qui ont ≥1 produit
  //   + catégories "orphelines" présentes sur des produits mais pas déclarées
  const visibleCats = useMemo(() => {
    const declared = categories.map((c) => c.name).filter((n) => (counts[n] ?? 0) > 0);
    const declaredSet = new Set(categories.map((c) => c.name));
    const orphans = Array.from(new Set(items.map((p) => p.category))).filter(
      (n) => !declaredSet.has(n),
    );
    return [...declared, ...orphans];
  }, [categories, counts, items]);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const categoryOrderMap = useMemo(() => {
    const map: Record<string, number> = {};
    categories.forEach((c, idx) => {
      map[c.name] = idx;
    });
    return map;
  }, [categories]);

  const products = useMemo(() => {
    const filtered = items.filter(
      (p) =>
        (cat === "Toutes" || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()),
    );
    return [...filtered].sort((a, b) => {
      const posA = categoryOrderMap[a.category] ?? 9999;
      const posB = categoryOrderMap[b.category] ?? 9999;
      if (posA !== posB) return posA - posB;
      if (a.position !== b.position) return a.position - b.position;
      return a.name.localeCompare(b.name);
    });
  }, [items, cat, q, categoryOrderMap]);

  // Si la catégorie active n'a plus de produit, revenir à "Toutes"
  useEffect(() => {
    if (cat !== "Toutes" && !visibleCats.includes(cat) && items.length > 0) {
      setCat("Toutes");
    }
  }, [visibleCats, cat, items.length]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: ProductRow) => {
    setEditing({
      id: p.id,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      category: p.category,
      available: p.status === "disponible",
      image_url: p.image_url ?? "",
      allergens: p.allergens ?? [],
      badges: p.badges ?? [],
      translations: p.translations ?? {
        en: { name: "", description: "" },
        es: { name: "", description: "" },
      },
    });
    setFormOpen(true);
  };

  const toggleAvailable = async (p: ProductRow) => {
    const next = p.status === "disponible" ? "rupture" : "disponible";
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
    const { error } = await supabase.from("products").update({ status: next }).eq("id", p.id);
    if (error) {
      toast.error("Échec");
      load();
    }
  };

  const remove = (p: ProductRow) => {
    setDeleteConfirm({ id: p.id, name: p.name, isBulk: false });
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const selectAllVisible = () => setSelected(new Set(products.map((p) => p.id)));

  const bulkDelete = () => {
    if (selected.size === 0) return;
    setDeleteConfirm({ count: selected.size, isBulk: true });
  };

  const ensureCategory = async (name: string) => {
    if (!restaurantId) return;
    if (categories.some((c) => c.name === name)) return;
    await supabase.from("menu_categories").insert({
      restaurant_id: restaurantId,
      name,
      position: categories.length,
    });
    void loadCategories();
  };

  const handleSubmit = async (v: ProductFormValue) => {
    if (!restaurantId) return;
    const finalCategory = findMatchingCategory(v.category, categoryNames);
    // Si l'utilisateur a saisi une catégorie inconnue, on la crée
    await ensureCategory(finalCategory);
    const payload = {
      restaurant_id: restaurantId,
      name: v.name.trim(),
      description: v.description.trim(),
      price: v.price,
      category: finalCategory,
      status: (v.available ? "disponible" : "rupture") as "disponible" | "rupture",
      image_url: v.image_url || null,
      allergens: v.allergens,
      badges: v.badges,
      translations: v.translations,
    };
    if (v.id) {
      const { error } = await supabase.from("products").update(payload).eq("id", v.id);
      if (error) return toast.error("Échec de l'enregistrement");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) return toast.error("Échec de la création");
    }
    load();
  };

  return (
    <div>
      <AppHeader title="Menu" subtitle="Gérez vos produits et catégories" />
      <div className="px-5 mt-2">
        <MenuProductsToggle />
      </div>

      {/* 1. Carte Analyseur de Menu IA */}
      <div className="px-5 mt-3">
        <div className="rounded-2xl border border-primary/15 bg-primary-soft/40 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-foreground text-[15px]">
                  Analyseur de Menu intelligent
                </h3>
                <span className="text-[10px] font-semibold tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                  IA
                </span>
              </div>
              <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                Importez un PDF de vos menus ou photographiez votre carte. L'IA extrait vos plats,
                prix et traductions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!restaurantId) return toast.error("Restaurant introuvable");
              setScannerOpen(true);
            }}
            className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold text-[14px] flex items-center justify-center gap-2"
          >
            <Upload className="size-4" />
            Scanner une carte (Photo / PDF)
          </button>
        </div>

        {/* Carte IA — Améliorer les descriptions */}
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-foreground text-[15px]">
                  Améliorer les descriptions
                </h3>
                <span className="text-[10px] font-semibold tracking-wide bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                  IA · optionnel
                </span>
              </div>
              <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                Reformule vos descriptions de manière alléchante, sans modifier vos ingrédients ni
                allergènes. Aperçu avant enregistrement.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!restaurantId) return toast.error("Restaurant introuvable");
              if (items.length === 0) return toast.warning("Ajoutez d'abord des plats.");
              setEnhancerOpen(true);
            }}
            className="mt-3 w-full bg-foreground text-background rounded-xl py-2.5 font-semibold text-[14px] flex items-center justify-center gap-2"
          >
            <Sparkles className="size-4" />
            Générer un aperçu
          </button>
        </div>
      </div>

      {/* 2. Ajouter un produit manuellement */}
      <div className="px-5 mt-3">
        <button
          onClick={openCreate}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2"
        >
          <span className="size-7 rounded-full bg-primary-foreground text-primary grid place-items-center">
            <Plus className="size-4" strokeWidth={3} />
          </span>
          Ajouter un produit manuellement
        </button>
      </div>

      {/* 3. Recherche + bouton sélection */}
      <div className="px-5 mt-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2.5">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit..."
            className="flex-1 bg-transparent outline-none text-[14px]"
          />
        </div>
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          className={`shrink-0 rounded-xl border px-3 py-2.5 text-[13px] font-semibold ${
            selectMode
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground/80"
          }`}
        >
          {selectMode ? "Annuler" : "Sélectionner"}
        </button>
      </div>

      {/* 4. Catégories dynamiques + gestion */}
      <div className="px-5 mt-3 flex items-center gap-2">
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <CategoryPill
              label="Toutes"
              count={items.length}
              active={cat === "Toutes"}
              onClick={() => setCat("Toutes")}
            />
            {visibleCats.map((c) => (
              <CategoryPill
                key={c}
                label={c}
                count={counts[c] ?? 0}
                active={cat === c}
                onClick={() => setCat(c)}
              />
            ))}
          </div>
        </div>
        <button
          onClick={() => setCatManagerOpen(true)}
          className="shrink-0 size-10 rounded-full bg-card border border-border grid place-items-center text-foreground/70"
          aria-label="Gérer les catégories"
          title="Gérer les catégories"
        >
          <Settings2 className="size-4" />
        </button>
      </div>

      {visibleCats.length === 0 && !loading && items.length === 0 && (
        <div className="px-5 mt-2 text-[12px] text-muted-foreground">
          Vos catégories apparaîtront ici. Créez-les via{" "}
          <button
            onClick={() => setCatManagerOpen(true)}
            className="text-primary font-semibold underline"
          >
            Gérer les catégories
          </button>
          .
        </div>
      )}

      <div className="px-5 mt-4 space-y-3 pb-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && products.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Aucun produit. Ajoutez votre premier plat.
          </div>
        )}
        {products.map((p) => {
          const isSel = selected.has(p.id);
          return (
            <div
              key={p.id}
              onClick={selectMode ? () => toggleSelect(p.id) : undefined}
              className={`rounded-2xl bg-card border p-3 shadow-sm flex gap-3 transition ${
                selectMode ? "cursor-pointer" : ""
              } ${isSel ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            >
              {selectMode && (
                <div className="self-center shrink-0">
                  {isSel ? (
                    <CheckSquare className="size-5 text-primary" />
                  ) : (
                    <Square className="size-5 text-muted-foreground" />
                  )}
                </div>
              )}
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="size-20 rounded-xl object-cover shrink-0"
                />
              ) : (
                <div className="size-20 rounded-xl bg-primary-soft shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-foreground text-[16px] truncate">
                  {p.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{p.category}</div>
                <div className="text-primary font-extrabold mt-0.5">
                  {Number(p.price).toFixed(2).replace(".", ",")} €
                </div>
                {!selectMode && (
                  <button
                    onClick={() => toggleAvailable(p)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[12px]"
                  >
                    {p.status === "disponible" ? (
                      <>
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span className="text-primary">Disponible</span>
                      </>
                    ) : (
                      <>
                        <span className="size-1.5 rounded-full bg-danger" />
                        <span className="text-danger">Rupture</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {!selectMode && (
                <div className="flex flex-col gap-2 self-start">
                  <button
                    onClick={() => openEdit(p)}
                    className="size-9 rounded-xl bg-primary-soft text-primary grid place-items-center"
                    aria-label="Modifier"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="size-9 rounded-xl bg-danger/10 text-danger grid place-items-center"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Barre d'action sélection multiple */}
      {selectMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 max-w-[92vw]">
          <span className="text-[13px] font-semibold px-2">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <button
            onClick={selectAllVisible}
            className="text-[12px] rounded-lg px-2.5 py-1.5 bg-background/15 hover:bg-background/25"
          >
            Tout ({products.length})
          </button>
          <button
            onClick={bulkDelete}
            disabled={selected.size === 0 || bulkDeleting}
            className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3 py-1.5 bg-danger text-white disabled:opacity-40"
          >
            {bulkDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Supprimer
          </button>
          <button
            onClick={exitSelectMode}
            className="size-8 grid place-items-center rounded-lg hover:bg-background/15"
            aria-label="Quitter"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <ProductFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSubmit={handleSubmit}
        uploadImage={restaurantId ? (file) => uploadProductImage(restaurantId, file) : undefined}
        categories={categoryNames}
      />

      {restaurantId && (
        <>
          <MenuScannerSheet
            open={scannerOpen}
            onClose={() => setScannerOpen(false)}
            restaurantId={restaurantId}
            onImported={async () => {
              await load();
              await loadCategories();
            }}
            categories={categoryNames}
          />
          <CategoryManagerSheet
            open={catManagerOpen}
            onClose={() => setCatManagerOpen(false)}
            restaurantId={restaurantId}
            categories={categories}
            counts={counts}
            onChanged={async () => {
              await loadCategories();
              await load();
            }}
          />
          <DescriptionEnhancerSheet
            open={enhancerOpen}
            onClose={() => setEnhancerOpen(false)}
            products={items.map((p) => ({
              id: p.id,
              name: p.name,
              description: p.description ?? "",
              category: p.category,
              allergens: p.allergens ?? [],
            }))}
            categories={categoryNames}
            onSaved={load}
          />
        </>
      )}

      {/* Dialogue de Confirmation de Suppression */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-[24px] bg-card border border-border p-6 shadow-2xl animate-scale-up">
            <h3 className="font-display font-bold text-foreground text-[18px]">
              {deleteConfirm.isBulk ? "Supprimer les produits" : "Supprimer le produit"}
            </h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
              {deleteConfirm.isBulk
                ? `Êtes-vous sûr de vouloir supprimer définitivement ces ${deleteConfirm.count} produit(s) ? Cette action est irréversible.`
                : `Êtes-vous sûr de vouloir supprimer définitivement le produit "${deleteConfirm.name}" ? Cette action est irréversible.`}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl bg-muted py-2.5 font-semibold text-[13.5px] text-foreground hover:bg-muted/80 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={async () => {
                  if (deleteConfirm.isBulk) {
                    setBulkDeleting(true);
                    const ids = Array.from(selected);
                    const { error } = await supabase.from("products").delete().in("id", ids);
                    setBulkDeleting(false);
                    if (error) {
                      toast.error("Suppression impossible");
                    } else {
                      setItems((prev) => prev.filter((x) => !selected.has(x.id)));
                      toast.success(`${ids.length} produit(s) supprimé(s)`);
                      exitSelectMode();
                    }
                  } else {
                    setBulkDeleting(true);
                    const { error } = await supabase
                      .from("products")
                      .delete()
                      .eq("id", deleteConfirm.id!);
                    setBulkDeleting(false);
                    if (error) {
                      toast.error("Suppression impossible");
                    } else {
                      setItems((prev) => prev.filter((x) => x.id !== deleteConfirm.id));
                      toast.success("Produit supprimé");
                    }
                  }
                  setDeleteConfirm(null);
                }}
                className="flex-1 rounded-xl bg-danger py-2.5 font-semibold text-[13.5px] text-white hover:bg-danger/90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {bulkDeleting && <Loader2 className="size-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-[13px] border inline-flex items-center gap-1.5 ${
        active
          ? "bg-primary text-primary-foreground border-primary font-semibold"
          : "bg-card border-border text-foreground/70"
      }`}
    >
      <span>{label}</span>
      <span
        className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
          active
            ? "bg-primary-foreground/20 text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
