import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { X, Plus, Trash2, Check, Loader2, ChevronDown, GripVertical } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { upsertMenu, type MenuSection } from "@/lib/menus.functions";
import { supabase } from "@/integrations/supabase/client";

type Product = { id: string; name: string; price: number; category: string };

export type MenuFormValue = {
  id?: string;
  name: string;
  description: string;
  price: number;
  status: "actif" | "inactif";
  available_days: string[];
  available_from: string | null;
  available_to: string | null;
  image_url: string | null;
  position: number;
  sections: MenuSection[];
};

const COURSES: { value: MenuSection["course"]; label: string }[] = [
  { value: "entree", label: "Entrée" },
  { value: "plat", label: "Plat" },
  { value: "fromage", label: "Fromage" },
  { value: "dessert", label: "Dessert" },
  { value: "boisson", label: "Boisson" },
  { value: "autre", label: "Autre" },
];

const DAYS = [
  { v: "mon", l: "Lun" },
  { v: "tue", l: "Mar" },
  { v: "wed", l: "Mer" },
  { v: "thu", l: "Jeu" },
  { v: "fri", l: "Ven" },
  { v: "sat", l: "Sam" },
  { v: "sun", l: "Dim" },
];

const emptyValue: MenuFormValue = {
  name: "",
  description: "",
  price: 0,
  status: "actif",
  available_days: [],
  available_from: null,
  available_to: null,
  image_url: null,
  position: 0,
  sections: [
    { course: "entree", label: "Entrée au choix", position: 0, choices: [] },
    { course: "plat", label: "Plat au choix", position: 1, choices: [] },
    { course: "dessert", label: "Dessert au choix", position: 2, choices: [] },
  ],
};

export function MenuFormSheet({
  open,
  onClose,
  restaurantId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  initial?: Partial<MenuFormValue> | null;
  onSaved: () => void | Promise<void>;
}) {
  const [v, setV] = useState<MenuFormValue>(emptyValue);
  const [priceStr, setPriceStr] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const save = useServerFn(upsertMenu);

  useEffect(() => {
    if (!open) return;
    const merged: MenuFormValue = { ...emptyValue, ...(initial ?? {}) } as MenuFormValue;
    merged.sections =
      initial?.sections && initial.sections.length > 0 ? initial.sections : emptyValue.sections;
    setV(merged);
    setPriceStr(merged.price ? merged.price.toFixed(2).replace(".", ",") : "");
    // Charger les produits du restaurant pour les choix
    supabase
      .from("products")
      .select("id, name, price, category")
      .eq("restaurant_id", restaurantId)
      .order("category")
      .order("name")
      .then(({ data }) => setProducts((data ?? []) as Product[]));
  }, [open, initial, restaurantId]);

  if (!open) return null;

  const isEdit = !!initial?.id;

  const updateSection = (idx: number, patch: Partial<MenuSection>) =>
    setV((s) => ({
      ...s,
      sections: s.sections.map((sec, i) => (i === idx ? { ...sec, ...patch } : sec)),
    }));

  const addSection = () =>
    setV((s) => ({
      ...s,
      sections: [
        ...s.sections,
        { course: "autre", label: "Nouvelle section", position: s.sections.length, choices: [] },
      ],
    }));

  const removeSection = (idx: number) =>
    setV((s) => ({ ...s, sections: s.sections.filter((_, i) => i !== idx) }));

  const addChoice = (sIdx: number, productId: string) =>
    setV((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === sIdx
          ? {
              ...sec,
              choices: sec.choices.some((c) => c.product_id === productId)
                ? sec.choices
                : [
                    ...sec.choices,
                    { product_id: productId, extra_price: 0, position: sec.choices.length },
                  ],
            }
          : sec,
      ),
    }));

  const removeChoice = (sIdx: number, productId: string) =>
    setV((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === sIdx
          ? { ...sec, choices: sec.choices.filter((c) => c.product_id !== productId) }
          : sec,
      ),
    }));

  const setChoiceExtra = (sIdx: number, productId: string, extra: number) =>
    setV((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === sIdx
          ? {
              ...sec,
              choices: sec.choices.map((c) =>
                c.product_id === productId ? { ...c, extra_price: extra } : c,
              ),
            }
          : sec,
      ),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return toast.error("Le nom du menu est requis");
    const price = parseFloat(priceStr.replace(",", "."));
    if (isNaN(price) || price < 0) return toast.error("Prix invalide");
    setSaving(true);
    try {
      await save({
        data: {
          ...v,
          price,
          restaurant_id: restaurantId,
          sections: v.sections.map((s, i) => ({ ...s, position: i })),
        },
      });
      toast.success(isEdit ? "Menu enregistré" : "Menu créé");
      await onSaved();
      onClose();
    } catch (err) {
      toast.error((err as Error).message || "Échec");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-background border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[18px]">
              {isEdit ? "Modifier le menu" : "Créer un menu"}
            </h2>
            <p className="text-[12px] text-muted-foreground">Composez votre formule à prix fixe.</p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-full grid place-items-center hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5">
              Nom du menu <span className="text-danger">*</span>
            </label>
            <input
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder="Menu du midi, Formule Express, Menu dégustation…"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5">Description</label>
            <textarea
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              placeholder="Entrée + plat + dessert servi du lundi au vendredi midi"
              rows={2}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">
                Prix fixe <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={priceStr}
                  onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-border bg-card px-3 py-2.5 pr-9 text-[14px] outline-none focus:border-primary"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Statut</label>
              <select
                value={v.status}
                onChange={(e) => setV({ ...v, status: e.target.value as "actif" | "inactif" })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary appearance-none"
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5">Jours de service</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = v.available_days.includes(d.v);
                return (
                  <button
                    type="button"
                    key={d.v}
                    onClick={() =>
                      setV((s) => ({
                        ...s,
                        available_days: on
                          ? s.available_days.filter((x) => x !== d.v)
                          : [...s.available_days, d.v],
                      }))
                    }
                    className={`px-2.5 py-1 rounded-full text-[12px] border ${
                      on
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : "bg-card border-border"
                    }`}
                  >
                    {d.l}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">Servi de</label>
              <input
                type="time"
                value={v.available_from ?? ""}
                onChange={(e) => setV({ ...v, available_from: e.target.value || null })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-1.5">à</label>
              <input
                type="time"
                value={v.available_to ?? ""}
                onChange={(e) => setV({ ...v, available_to: e.target.value || null })}
                className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Composition */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-[15px]">Composition</h3>
              <button
                type="button"
                onClick={addSection}
                className="text-primary text-[12.5px] font-semibold inline-flex items-center gap-1"
              >
                <Plus className="size-3.5" /> Section
              </button>
            </div>
            <p className="text-[12px] text-muted-foreground mb-3">
              Chaque section propose plusieurs choix piochés dans vos produits. Ajoutez un
              supplément si nécessaire.
            </p>
            <div className="space-y-3">
              {v.sections.map((s, idx) => (
                <SectionEditor
                  key={idx}
                  section={s}
                  products={products}
                  onChange={(patch) => updateSection(idx, patch)}
                  onRemove={() => removeSection(idx)}
                  onAddChoice={(pid) => addChoice(idx, pid)}
                  onRemoveChoice={(pid) => removeChoice(idx, pid)}
                  onChangeExtra={(pid, extra) => setChoiceExtra(idx, pid, extra)}
                />
              ))}
            </div>
          </section>

          <div className="pt-2 sticky bottom-0 bg-background pb-2 -mx-5 px-5 border-t border-border">
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
              {isEdit ? "Enregistrer le menu" : "Créer le menu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionEditor({
  section,
  products,
  onChange,
  onRemove,
  onAddChoice,
  onRemoveChoice,
  onChangeExtra,
}: {
  section: MenuSection;
  products: Product[];
  onChange: (patch: Partial<MenuSection>) => void;
  onRemove: () => void;
  onAddChoice: (productId: string) => void;
  onRemoveChoice: (productId: string) => void;
  onChangeExtra: (productId: string, extra: number) => void;
}) {
  const [picker, setPicker] = useState("");
  const used = useMemo(() => new Set(section.choices.map((c) => c.product_id)), [section.choices]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <GripVertical className="size-4 text-muted-foreground shrink-0" />
        <select
          value={section.course}
          onChange={(e) => onChange({ course: e.target.value as MenuSection["course"] })}
          className="rounded-lg border border-border bg-background px-2 py-1 text-[12.5px]"
        >
          {COURSES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={section.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Libellé (ex: Au choix parmi)"
          className="flex-1 rounded-lg border border-border bg-background px-2 py-1 text-[13px] min-w-0"
        />
        <button
          type="button"
          onClick={onRemove}
          className="size-7 rounded-lg bg-danger/10 text-danger grid place-items-center"
          aria-label="Supprimer la section"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <ul className="space-y-1.5 mb-2">
        {section.choices.length === 0 && (
          <li className="text-[12px] text-muted-foreground italic">Aucun choix pour le moment.</li>
        )}
        {section.choices.map((c) => {
          const p = productById.get(c.product_id);
          return (
            <li
              key={c.product_id}
              className="flex items-center gap-2 rounded-lg bg-background border border-border px-2 py-1.5"
            >
              <span className="flex-1 text-[13px] truncate">{p?.name ?? "—"}</span>
              <div className="relative">
                <input
                  inputMode="decimal"
                  value={c.extra_price ? String(c.extra_price).replace(".", ",") : ""}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value.replace(",", "."));
                    onChangeExtra(c.product_id, isNaN(n) ? 0 : Math.max(0, n));
                  }}
                  placeholder="+0,00"
                  className="w-16 rounded-md border border-border bg-card px-2 py-0.5 text-[12px] outline-none pr-5 text-right"
                />
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
                  €
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemoveChoice(c.product_id)}
                className="text-muted-foreground hover:text-danger"
                aria-label="Retirer"
              >
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="relative">
        <select
          value={picker}
          onChange={(e) => {
            const id = e.target.value;
            if (id) {
              onAddChoice(id);
              setPicker("");
            }
          }}
          className="w-full appearance-none rounded-lg border border-dashed border-border bg-background px-3 py-2 text-[12.5px] pr-7"
        >
          <option value="">+ Ajouter un produit comme choix</option>
          {products
            .filter((p) => !used.has(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.category} — {p.name}
              </option>
            ))}
        </select>
        <ChevronDown className="size-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
