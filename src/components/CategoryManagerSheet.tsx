import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Plus, GripVertical, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type Category = { id: string; name: string; position: number };

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  categories: Category[];
  counts: Record<string, number>;
  onChanged: () => void | Promise<void>;
};

export function CategoryManagerSheet({
  open,
  onClose,
  restaurantId,
  categories,
  counts,
  onChanged,
}: Props) {
  const [items, setItems] = useState<Category[]>(categories);
  const [newName, setNewName] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) setItems(categories);
  }, [open, categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  );

  if (!open) return null;

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((c) => c.id === active.id);
    const newIdx = items.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(items, oldIdx, newIdx).map((c, i) => ({ ...c, position: i }));
    setItems(reordered);
    setSavingOrder(true);
    const updates = reordered.map((c) =>
      supabase.from("menu_categories").update({ position: c.position }).eq("id", c.id),
    );
    const results = await Promise.all(updates);
    setSavingOrder(false);
    if (results.some((r) => r.error)) {
      toast.error("Échec du réordonnancement");
      void onChanged();
    } else {
      toast.success("Ordre enregistré");
      void onChanged();
    }
  };

  const addCategory = async () => {
    const name = newName.trim();
    if (!name) return;
    if (items.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Cette catégorie existe déjà");
    }
    const position = items.length;
    const { data, error } = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name, position })
      .select("id, name, position")
      .single();
    if (error || !data) return toast.error("Impossible d'ajouter");
    setItems((prev) => [...prev, data]);
    setNewName("");
    toast.success(`"${name}" ajoutée`);
    void onChanged();
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const saveEdit = async (c: Category) => {
    const newN = editName.trim();
    if (!newN || newN === c.name) {
      setEditingId(null);
      return;
    }
    if (items.some((x) => x.id !== c.id && x.name.toLowerCase() === newN.toLowerCase())) {
      return toast.error("Une catégorie porte déjà ce nom");
    }
    // 1) renommer la catégorie
    const { error: e1 } = await supabase
      .from("menu_categories")
      .update({ name: newN })
      .eq("id", c.id);
    if (e1) return toast.error("Renommage impossible");
    // 2) propager aux produits liés (compat colonne texte products.category)
    const { error: e2 } = await supabase
      .from("products")
      .update({ category: newN })
      .eq("restaurant_id", restaurantId)
      .eq("category", c.name);
    if (e2)
      toast.warning("Catégorie renommée, mais certains produits n'ont pas pu être mis à jour");
    setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, name: newN } : x)));
    setEditingId(null);
    toast.success("Renommée");
    void onChanged();
  };

  const removeCategory = (c: Category) => {
    const used = counts[c.name] ?? 0;
    if (used > 0) {
      return toast.error(
        `Impossible : ${used} produit(s) utilisent cette catégorie. Réassignez-les d'abord.`,
      );
    }
    setDeleteConfirm({ id: c.id, name: c.name });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-background border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[18px]">Gérer les catégories</h2>
            <p className="text-[12px] text-muted-foreground">
              Réorganisez, renommez ou supprimez vos catégories.
              {savingOrder && (
                <span className="ml-2 inline-flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" /> enregistrement…
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-full grid place-items-center hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Ajout rapide */}
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
              placeholder="Ex : Pizzas, Burgers, Cocktails maison…"
              className="flex-1 rounded-xl border border-border bg-card px-3 py-2.5 text-[14px] outline-none focus:border-primary"
            />
            <button
              onClick={addCategory}
              disabled={!newName.trim()}
              className="bg-primary text-primary-foreground rounded-xl px-3 py-2.5 font-semibold text-[13px] inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Plus className="size-4" /> Ajouter
            </button>
          </div>

          {items.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              Aucune catégorie. Créez-en une au-dessus.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {items.map((c) => (
                    <SortableRow
                      key={c.id}
                      cat={c}
                      count={counts[c.name] ?? 0}
                      editing={editingId === c.id}
                      editName={editName}
                      onEditNameChange={setEditName}
                      onStartEdit={() => startEdit(c)}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => saveEdit(c)}
                      onRemove={() => removeCategory(c)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <p className="text-[11.5px] text-muted-foreground leading-snug">
            Astuce : maintenez l'icône <GripVertical className="size-3 inline -mt-0.5" /> et glissez
            pour réordonner. L'ordre est appliqué à votre carte client.
          </p>
        </div>
      </div>

      {/* Dialogue de Confirmation de Suppression de Catégorie */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] bg-card border border-border p-6 shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-bold text-foreground text-[18px]">
              Supprimer la catégorie
            </h3>
            <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la catégorie{" "}
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
                    const { error } = await supabase
                      .from("menu_categories")
                      .delete()
                      .eq("id", deleteConfirm.id);
                    if (error) {
                      toast.error("Suppression impossible");
                    } else {
                      setItems((prev) => prev.filter((x) => x.id !== deleteConfirm.id));
                      toast.success("Catégorie supprimée");
                      void onChanged();
                    }
                  } catch (e) {
                    toast.error("Échec de suppression");
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

function SortableRow({
  cat,
  count,
  editing,
  editName,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRemove,
}: {
  cat: Category;
  count: number;
  editing: boolean;
  editName: string;
  onEditNameChange: (s: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: cat.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="size-8 grid place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
        aria-label="Réordonner"
      >
        <GripVertical className="size-4" />
      </button>
      {editing ? (
        <>
          <input
            autoFocus
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSaveEdit();
              }
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 rounded-lg border border-primary bg-background px-2 py-1.5 text-[14px] outline-none"
          />
          <button
            onClick={onSaveEdit}
            className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center"
            aria-label="Enregistrer"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={onCancelEdit}
            className="size-8 rounded-lg bg-muted grid place-items-center"
            aria-label="Annuler"
          >
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[14px] truncate">{cat.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {count} produit{count > 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onStartEdit}
            className="size-8 rounded-lg bg-primary-soft text-primary grid place-items-center"
            aria-label="Renommer"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onRemove}
            disabled={count > 0}
            title={count > 0 ? "Réassignez d'abord les produits" : "Supprimer"}
            className="size-8 rounded-lg bg-danger/10 text-danger grid place-items-center disabled:opacity-40"
            aria-label="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </>
      )}
    </li>
  );
}
