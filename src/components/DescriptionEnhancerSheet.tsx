import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Check, RotateCcw, Wand2 } from "lucide-react";
import { enhanceDescriptions, type EnhanceTone } from "@/lib/enhance-descriptions.functions";
import { supabase } from "@/integrations/supabase/client";

export type EnhanceableProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  allergens: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  products: EnhanceableProduct[];
  categories: string[];
  onSaved: () => void;
};

type Row = EnhanceableProduct & {
  suggested: string;
  selected: boolean;
};

type Scope = "empty" | "category" | "all";

const TONE_LABELS: Record<EnhanceTone, string> = {
  gourmand: "Gourmand",
  premium: "Premium",
  familial: "Familial",
};

export function DescriptionEnhancerSheet({ open, onClose, products, categories, onSaved }: Props) {
  const enhance = useServerFn(enhanceDescriptions);
  const [tone, setTone] = useState<EnhanceTone>("gourmand");
  const [maxLength, setMaxLength] = useState(140);
  const [scope, setScope] = useState<Scope>("empty");
  const [scopeCat, setScopeCat] = useState<string>(categories[0] ?? "");
  const [step, setStep] = useState<"config" | "preview">("config");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  // Synchronise la catégorie sélectionnée par défaut dès que la liste est chargée
  useEffect(() => {
    if (categories.length > 0 && !scopeCat) {
      setScopeCat(categories[0]);
    }
  }, [categories, scopeCat]);

  const targets = useMemo(() => {
    if (scope === "all") return products;
    if (scope === "empty") return products.filter((p) => !p.description.trim());
    return products.filter((p) => p.category === scopeCat);
  }, [products, scope, scopeCat]);

  if (!open) return null;

  const close = () => {
    if (loading || saving) return;
    setStep("config");
    setRows([]);
    onClose();
  };

  const generate = async () => {
    if (targets.length === 0) {
      toast.warning("Aucun plat à enrichir avec ce filtre.");
      return;
    }
    if (targets.length > 40) {
      toast.warning("Trop de plats : limitez à 40. Filtrez par catégorie.");
      return;
    }
    setLoading(true);
    try {
      const res = await enhance({
        data: {
          tone,
          maxLength,
          items: targets.map((p) => ({
            id: p.id,
            name: p.name,
            currentDescription: p.description,
            category: p.category,
            allergens: p.allergens,
          })),
        },
      });
      const byId = new Map(res.results.map((r) => [r.id, r.suggested]));
      const next: Row[] = targets
        .filter((p) => byId.has(p.id))
        .map((p) => ({
          ...p,
          suggested: byId.get(p.id)!,
          selected: true,
        }));
      if (next.length === 0) {
        toast.error("Aucune suggestion générée.");
        return;
      }
      setRows(next);
      setStep("preview");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de génération");
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const selectedCount = rows.filter((r) => r.selected).length;

  const saveAll = async () => {
    const picks = rows.filter((r) => r.selected && r.suggested.trim());
    if (picks.length === 0) {
      toast.warning("Aucune description sélectionnée.");
      return;
    }
    setSaving(true);
    let ok = 0;
    let fail = 0;
    for (const r of picks) {
      const { error } = await supabase
        .from("products")
        .update({ description: r.suggested.trim().slice(0, maxLength) })
        .eq("id", r.id);
      if (error) fail++;
      else ok++;
    }
    setSaving(false);
    if (ok > 0) toast.success(`${ok} description(s) mise(s) à jour`);
    if (fail > 0) toast.error(`${fail} échec(s)`);
    onSaved();
    close();
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
            <Wand2 className="size-5 text-primary" />
            <h2 className="font-display font-bold text-foreground">
              {step === "config" ? "Améliorer les descriptions" : "Aperçu des suggestions"}
            </h2>
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
          {step === "config" ? (
            <div className="space-y-5">
              <p className="text-[13px] text-muted-foreground leading-snug">
                L'IA reformule les descriptions de vos plats sans inventer d'ingrédient ni modifier
                les allergènes. Vous validerez chaque suggestion avant enregistrement.
              </p>

              <div>
                <label className="block text-[12px] font-semibold text-foreground/80 mb-2">
                  Ton de rédaction
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TONE_LABELS) as EnhanceTone[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={`rounded-xl border px-2 py-2 text-[13px] font-semibold ${
                        tone === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-foreground/70"
                      }`}
                    >
                      {TONE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[12px] font-semibold text-foreground/80">
                    Longueur maximale
                  </label>
                  <span className="text-[12px] text-muted-foreground">{maxLength} caractères</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={220}
                  step={10}
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>Court</span>
                  <span>Détaillé</span>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-foreground/80 mb-2">
                  Plats à traiter
                </label>
                <div className="space-y-2">
                  <ScopeRow
                    active={scope === "empty"}
                    onClick={() => setScope("empty")}
                    label="Sans description"
                    hint={`${products.filter((p) => !p.description.trim()).length} plat(s)`}
                  />
                  <ScopeRow
                    active={scope === "category"}
                    onClick={() => setScope("category")}
                    label="Une catégorie"
                    hint={
                      scope === "category" && scopeCat
                        ? `${products.filter((p) => p.category === scopeCat).length} plat(s)`
                        : "Choisir"
                    }
                  />
                  {scope === "category" && (
                    <select
                      value={scopeCat}
                      onChange={(e) => setScopeCat(e.target.value)}
                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-[13px]"
                    >
                      {categories.length === 0 && <option value="">Aucune catégorie</option>}
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  )}
                  <ScopeRow
                    active={scope === "all"}
                    onClick={() => setScope("all")}
                    label="Tous les plats"
                    hint={`${products.length} plat(s) · max 40`}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-muted/60 border border-border p-3 text-[11.5px] text-muted-foreground leading-snug">
                <strong className="text-foreground/80">Garde-fous IA :</strong> les ingrédients et
                allergènes ne sont jamais modifiés. Aucun élément non présent sur votre carte n'est
                ajouté.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[12px] text-muted-foreground">
                {selectedCount} / {rows.length} sélectionné(s) · ton{" "}
                <strong>{TONE_LABELS[tone].toLowerCase()}</strong> · max {maxLength} car.
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl border bg-card p-3 ${
                    r.selected ? "border-primary/50" : "border-border opacity-70"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => updateRow(r.id, { selected: !r.selected })}
                      className={`mt-0.5 size-5 rounded-md border grid place-items-center shrink-0 ${
                        r.selected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-border text-transparent"
                      }`}
                      aria-label="Garder"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground text-[14px] truncate">
                        {r.name}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">{r.category}</div>
                    </div>
                  </div>

                  {r.description.trim() && (
                    <div className="mt-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">
                        Avant
                      </div>
                      <div className="text-[12px] text-muted-foreground line-clamp-2">
                        {r.description}
                      </div>
                    </div>
                  )}

                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                        Suggestion IA
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {r.suggested.length}/{maxLength}
                      </span>
                    </div>
                    <textarea
                      value={r.suggested}
                      onChange={(e) =>
                        updateRow(r.id, {
                          suggested: e.target.value.slice(0, maxLength),
                        })
                      }
                      rows={2}
                      className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-[13px]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 flex gap-2">
          {step === "config" ? (
            <>
              <button
                onClick={close}
                className="flex-1 rounded-xl border border-border py-2.5 font-semibold text-sm"
              >
                Annuler
              </button>
              <button
                onClick={generate}
                disabled={loading}
                className="flex-[2] rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Générer ({targets.length})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setStep("config");
                  setRows([]);
                }}
                disabled={saving}
                className="rounded-xl border border-border py-2.5 px-3 font-semibold text-sm flex items-center gap-1.5"
              >
                <RotateCcw className="size-4" />
                Refaire
              </button>
              <button
                onClick={saveAll}
                disabled={saving || selectedCount === 0}
                className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Enregistrer ({selectedCount})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeRow({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
        active ? "bg-primary-soft/60 border-primary/40" : "bg-card border-border"
      }`}
    >
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <span className="text-[11.5px] text-muted-foreground">{hint}</span>
    </button>
  );
}
