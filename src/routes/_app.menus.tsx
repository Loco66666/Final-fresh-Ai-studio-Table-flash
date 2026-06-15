import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Clock, CalendarDays, Power } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { useServerFn } from "@tanstack/react-start";
import { deleteMenu } from "@/lib/menus.functions";
import { MenuFormSheet, type MenuFormValue } from "@/components/MenuFormSheet";
import { MenuProductsToggle } from "@/components/MenuProductsToggle";

export const Route = createFileRoute("/_app/menus")({ component: MenusPage });

type MenuRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  status: "actif" | "inactif";
  available_days: string[];
  available_from: string | null;
  available_to: string | null;
  image_url: string | null;
  position: number;
};

const DAY_LABELS: Record<string, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mer",
  thu: "Jeu",
  fri: "Ven",
  sat: "Sam",
  sun: "Dim",
};

function MenusPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const [menus, setMenus] = useState<MenuRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<MenuFormValue> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const removeFn = useServerFn(deleteMenu);

  const load = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("menus")
      .select(
        "id, name, description, price, status, available_days, available_from, available_to, image_url, position",
      )
      .eq("restaurant_id", restaurantId)
      .order("position");
    if (error) toast.error("Chargement impossible");
    setMenus((data ?? []) as MenuRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load(); /* eslint-disable-next-line */
  }, [restaurantId]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = async (m: MenuRow) => {
    // Charger sections + choices
    const { data: secs } = await supabase
      .from("menu_items")
      .select("id, course, label, position, menu_item_choices(product_id, extra_price, position)")
      .eq("menu_id", m.id)
      .order("position");
    const sections = (secs ?? []).map(
      (s: {
        course: string;
        label: string;
        position: number;
        menu_item_choices: { product_id: string; extra_price: number; position: number }[];
      }) => ({
        course: s.course as MenuFormValue["sections"][number]["course"],
        label: s.label,
        position: s.position,
        choices: (s.menu_item_choices ?? [])
          .sort((a, b) => a.position - b.position)
          .map((c) => ({
            product_id: c.product_id,
            extra_price: Number(c.extra_price),
            position: c.position,
          })),
      }),
    );
    setEditing({
      id: m.id,
      name: m.name,
      description: m.description,
      price: Number(m.price),
      status: m.status,
      available_days: m.available_days ?? [],
      available_from: m.available_from,
      available_to: m.available_to,
      image_url: m.image_url,
      position: m.position,
      sections,
    });
    setFormOpen(true);
  };

  const remove = (m: MenuRow) => {
    setDeleteConfirm({ id: m.id, name: m.name });
  };

  const toggleStatus = async (m: MenuRow) => {
    const next = m.status === "actif" ? "inactif" : "actif";
    setMenus((prev) => prev.map((x) => (x.id === m.id ? { ...x, status: next } : x)));
    const { error } = await supabase.from("menus").update({ status: next }).eq("id", m.id);
    if (error) {
      toast.error("Échec");
      void load();
    }
  };

  return (
    <div>
      <AppHeader title="Menu" subtitle="Vos formules à prix fixe" />
      <div className="px-5 mt-2">
        <MenuProductsToggle />
      </div>

      <div className="px-5 mt-3">
        <button
          onClick={openCreate}
          className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2"
        >
          <span className="size-7 rounded-full bg-primary-foreground text-primary grid place-items-center">
            <Plus className="size-4" strokeWidth={3} />
          </span>
          Créer un menu / une formule
        </button>
      </div>

      <div className="px-5 mt-4 space-y-3 pb-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && menus.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Aucun menu. Créez votre première formule (entrée + plat + dessert à prix fixe).
          </div>
        )}
        {menus.map((m) => (
          <article key={m.id} className="rounded-2xl bg-card border border-border p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-foreground text-[16px] truncate">
                    {m.name}
                  </h3>
                  <span
                    className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${
                      m.status === "actif"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {m.status === "actif" ? "Actif" : "Inactif"}
                  </span>
                </div>
                {m.description && (
                  <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                    {m.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
                  {m.available_days?.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {m.available_days.map((d) => DAY_LABELS[d] ?? d).join(", ")}
                    </span>
                  )}
                  {(m.available_from || m.available_to) && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {m.available_from ?? "?"} – {m.available_to ?? "?"}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-primary font-extrabold text-[16px] whitespace-nowrap">
                {Number(m.price).toFixed(2).replace(".", ",")} €
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => toggleStatus(m)}
                className="text-[12px] inline-flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1"
              >
                <Power className="size-3.5" /> {m.status === "actif" ? "Désactiver" : "Activer"}
              </button>
              <div className="flex-1" />
              <button
                onClick={() => openEdit(m)}
                className="size-9 rounded-xl bg-primary-soft text-primary grid place-items-center"
                aria-label="Modifier"
              >
                <Pencil className="size-4" />
              </button>
              <button
                onClick={() => remove(m)}
                className="size-9 rounded-xl bg-danger/10 text-danger grid place-items-center"
                aria-label="Supprimer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {restaurantId && (
        <MenuFormSheet
          open={formOpen}
          onClose={() => setFormOpen(false)}
          restaurantId={restaurantId}
          initial={editing}
          onSaved={load}
        />
      )}

      {/* Dialogue de Confirmation de Suppression de Menu/Formule */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-sm rounded-[24px] bg-card border border-border p-6 shadow-2xl animate-scale-up">
            <h3 className="font-display font-bold text-foreground text-[18px]">
              Supprimer le menu
            </h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le menu{" "}
              <strong>{deleteConfirm.name}</strong> ? Cette action est irréversible.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl bg-muted py-2.5 font-semibold text-[13.5px] text-foreground hover:bg-muted/80 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  try {
                    setDeleting(true);
                    await removeFn({ data: { id: deleteConfirm.id } });
                    toast.success("Menu supprimé");
                    void load();
                  } catch (e) {
                    toast.error((e as Error).message || "Échec");
                  } finally {
                    setDeleting(false);
                    setDeleteConfirm(null);
                  }
                }}
                className="flex-1 rounded-xl bg-danger py-2.5 font-semibold text-[13.5px] text-white hover:bg-danger/90 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
