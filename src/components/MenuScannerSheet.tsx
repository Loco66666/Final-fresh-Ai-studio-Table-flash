import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Upload, X, Trash2 } from "lucide-react";
import { scanMenu, type ScannedProduct } from "@/lib/scan-menu.functions";
import { supabase } from "@/integrations/supabase/client";
import { findMatchingCategory } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
  onImported: () => void;
  categories?: string[];
};

const MAX_BYTES = 8 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function MenuScannerSheet({
  open,
  onClose,
  restaurantId,
  onImported,
  categories = [],
}: Props) {
  const scan = useServerFn(scanMenu);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ScannedProduct[]>([]);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Fichier trop volumineux (max 8 Mo).");
      return;
    }
    const okType = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!okType) {
      toast.error("Format non supporté. Utilisez une photo ou un PDF.");
      return;
    }
    setLoading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await scan({ data: { fileDataUrl: dataUrl, mimeType: file.type } });
      if (!res.products.length) {
        toast.warning("Aucun plat détecté. Essayez une meilleure photo.");
        return;
      }
      const mapped = (res.products || []).map((p) => ({
        ...p,
        category: findMatchingCategory(p.category, categories || []),
      }));
      setItems(mapped);
      toast.success(`${mapped.length} plat(s) détecté(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  const update = (i: number, patch: Partial<ScannedProduct>) =>
    setItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const remove = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const importAll = async () => {
    if (!items.length) return;
    setSaving(true);
    const catsList = categories || [];
    const mappedItems = items.map((p) => ({
      ...p,
      category: findMatchingCategory(p.category, catsList),
    }));

    // 1) Créer les catégories manquantes pour ce restaurant
    const rawUnique = mappedItems.map((p) => p.category.trim()).filter(Boolean);
    const uniqueCats = Array.from(new Set(rawUnique));
    const missing = uniqueCats.filter((c) => !catsList.includes(c));
    if (missing.length > 0) {
      const rows = missing.map((name, i) => ({
        restaurant_id: restaurantId,
        name,
        position: catsList.length + i,
      }));
      // upsert pour éviter doublon en cas de course
      await supabase
        .from("menu_categories")
        .upsert(rows, { onConflict: "restaurant_id,name", ignoreDuplicates: true });
    }
    // 2) Insérer les produits
    const payload = mappedItems.map((p) => ({
      restaurant_id: restaurantId,
      name: p.name.trim(),
      description: p.description.trim(),
      price: Number(p.price) || 0,
      category: p.category,
      status: "disponible" as const,
      allergens: [],
      badges: [],
      translations: { en: { name: "", description: "" }, es: { name: "", description: "" } },
    }));
    const { error } = await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error("Échec de l'import");
    toast.success(`${payload.length} produit(s) ajouté(s) !`);
    setItems([]);
    onImported();
    onClose();
  };

  const close = () => {
    if (loading || saving) return;
    setItems([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center"
      onClick={close}
    >
      <div
        className="bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h2 className="font-display font-bold text-foreground">Scanner une carte</h2>
          </div>
          <button
            onClick={close}
            className="size-8 grid place-items-center rounded-lg hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Importez une <strong>photo</strong> ou un <strong>PDF</strong> de votre carte. L'IA
                détectera plats, prix et catégories.
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Analyse en cours…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Choisir un fichier
                  </>
                )}
              </button>
              <p className="text-[11px] text-muted-foreground mt-3 text-center">
                Max 8 Mo. JPG, PNG ou PDF.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Vérifiez et modifiez les plats avant import.
              </div>
              {items.map((p, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={p.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Nom du plat"
                      className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-sm font-semibold"
                    />
                    <button
                      onClick={() => remove(i)}
                      className="size-9 rounded-lg bg-danger/10 text-danger grid place-items-center shrink-0"
                      aria-label="Retirer"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <textarea
                    value={p.description}
                    onChange={(e) => update(i, { description: e.target.value })}
                    placeholder="Description"
                    rows={2}
                    className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-[13px]"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        list="scanner-cat-suggest"
                        value={p.category}
                        onChange={(e) => update(i, { category: e.target.value })}
                        placeholder="Catégorie"
                        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[13px]"
                      />
                      <datalist id="scanner-cat-suggest">
                        {Array.from(new Set([...categories, ...items.map((it) => it.category)]))
                          .filter(Boolean)
                          .map((c) => (
                            <option key={c} value={c} />
                          ))}
                      </datalist>
                    </div>
                    <div className="w-28 relative">
                      <input
                        type="number"
                        step="0.10"
                        min="0"
                        value={p.price}
                        onChange={(e) => update(i, { price: Number(e.target.value) })}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-[13px] pr-6 text-right"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        €
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border p-4 flex gap-2">
            <button
              onClick={() => setItems([])}
              disabled={saving}
              className="flex-1 rounded-xl border border-border py-2.5 font-semibold text-sm"
            >
              Recommencer
            </button>
            <button
              onClick={importAll}
              disabled={saving}
              className="flex-[2] rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Importer {items.length} produit{items.length > 1 ? "s" : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
