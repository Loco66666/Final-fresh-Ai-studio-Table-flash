import { useEffect, useState } from "react";
import { X, Languages, ImagePlus, Check } from "lucide-react";
import { toast } from "sonner";

export const CATEGORIES = [
  "Suggestions",
  "Menu du midi",
  "Menu du soir",
  "À partager",
  "Entrées",
  "Plats",
  "Fromages",
  "Desserts",
  "Menu enfant",
  "Boissons",
  "Vins",
  "Cocktails",
  "Digestifs",
  "Autres",
] as const;

export const ALLERGENS: { id: string; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "crustaces", label: "Crustacés" },
  { id: "oeufs", label: "Œufs" },
  { id: "poisson", label: "Poisson" },
  { id: "arachides", label: "Arachides" },
  { id: "soja", label: "Soja" },
  { id: "lait", label: "Lait" },
  { id: "fruits_a_coque", label: "Fruits à coque" },
  { id: "celeri", label: "Céleri" },
  { id: "moutarde", label: "Moutarde" },
  { id: "sesame", label: "Sésame" },
  { id: "sulfites", label: "Sulfites" },
  { id: "lupin", label: "Lupin" },
  { id: "mollusques", label: "Mollusques" },
];

export const BADGES: { id: string; label: string }[] = [
  { id: "fait_maison", label: "Fait maison" },
  { id: "local", label: "Produit local" },
  { id: "vegetarien", label: "Végétarien" },
  { id: "vegan", label: "Vegan" },
  { id: "sans_gluten", label: "Sans gluten" },
  { id: "epice", label: "Épicé" },
  { id: "suggestion_chef", label: "Suggestion du chef" },
  { id: "nouveau", label: "Nouveau" },
  { id: "populaire", label: "Populaire" },
];

export type ProductFormValue = {
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  available: boolean;
  allergens: string[];
  badges: string[];
  translations: {
    en: { name: string; description: string };
    es: { name: string; description: string };
  };
  image_url?: string;
};

const emptyValue: ProductFormValue = {
  name: "",
  description: "",
  price: 0,
  category: "Plats",
  available: true,
  allergens: [],
  badges: [],
  translations: { en: { name: "", description: "" }, es: { name: "", description: "" } },
  image_url: "",
};

export function ProductFormSheet({
  open,
  onClose,
  initial,
  onSubmit,
  uploadImage,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<ProductFormValue> | null;
  onSubmit?: (v: ProductFormValue) => void | Promise<unknown>;
  uploadImage?: (file: File) => Promise<string>;
  categories?: string[];
}) {
  const [v, setV] = useState<ProductFormValue>(emptyValue);
  const [priceStr, setPriceStr] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      const merged = { ...emptyValue, ...(initial ?? {}) } as ProductFormValue;
      merged.translations = {
        en: { name: "", description: "", ...(initial?.translations?.en ?? {}) },
        es: { name: "", description: "", ...(initial?.translations?.es ?? {}) },
      };
      merged.allergens = initial?.allergens ?? [];
      merged.badges = initial?.badges ?? [];
      // Pré-sélectionne la première catégorie disponible si nécessaire
      if (
        (!merged.category || merged.category === "Plats") &&
        categories &&
        categories.length > 0 &&
        !categories.includes(merged.category)
      ) {
        merged.category = categories[0];
      }
      setV(merged);
      setPriceStr(merged.price ? merged.price.toFixed(2).replace(".", ",") : "");
    }
  }, [open, initial, categories]);

  if (!open) return null;

  const isEdit = !!initial?.id;
  const toggleArr = (key: "allergens" | "badges", id: string) =>
    setV((s) => ({
      ...s,
      [key]: s[key].includes(id) ? s[key].filter((x) => x !== id) : [...s[key], id],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.name.trim()) return toast.error("Le nom du plat est requis.");
    const price = parseFloat(priceStr.replace(",", "."));
    if (isNaN(price) || price < 0) return toast.error("Prix invalide.");
    if (!v.category) return toast.error("Catégorie requise.");
    await onSubmit?.({ ...v, price });
    toast.success(isEdit ? "Produit enregistré." : "Produit ajouté.");
    onClose();
  };

  const handleFile = async (f: File) => {
    if (!uploadImage) {
      const reader = new FileReader();
      reader.onload = () => setV((s) => ({ ...s, image_url: String(reader.result) }));
      reader.readAsDataURL(f);
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(f);
      setV((s) => ({ ...s, image_url: url }));
    } catch {
      toast.error("Upload de la photo impossible.");
    } finally {
      setUploading(false);
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
              {isEdit ? "Modifier le produit" : "Ajouter un produit"}
            </h2>
            <p className="text-[12px] text-muted-foreground">
              Renseignez les informations du plat.
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

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">
          {/* Nom */}
          <Field label="Nom du plat" required>
            <input
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
              placeholder="Exemple : Filet de dorade royale"
              className="input"
              required
            />
          </Field>

          {/* Description */}
          <Field label="Description courte" hint="Restez court et appétissant.">
            <textarea
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              placeholder="Exemple : Légumes de saison, sauce vierge, pommes grenailles"
              rows={3}
              className="input resize-none"
            />
          </Field>

          {/* Prix */}
          <Field label="Prix" required>
            <div className="relative">
              <input
                inputMode="decimal"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value.replace(/[^0-9.,]/g, ""))}
                placeholder="0,00"
                className="input pr-10"
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                €
              </span>
            </div>
          </Field>

          {/* Catégorie */}
          <Field label="Catégorie" required>
            <select
              value={v.category}
              onChange={(e) => setV({ ...v, category: e.target.value })}
              className="input appearance-none"
              required
            >
              {(categories && categories.length > 0
                ? categories
                : (CATEGORIES as readonly string[])
              ).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {/* Si la catégorie initiale n'existe plus, on l'affiche tout de même */}
              {v.category &&
                !(categories ?? (CATEGORIES as readonly string[])).includes(v.category) && (
                  <option value={v.category}>{v.category} (ancienne)</option>
                )}
            </select>
          </Field>

          {/* Disponibilité */}
          <div className="rounded-2xl border border-border bg-card p-3.5 flex items-start gap-3">
            <button
              type="button"
              onClick={() => setV({ ...v, available: !v.available })}
              role="switch"
              aria-checked={v.available}
              className={`shrink-0 mt-0.5 relative h-6 w-11 rounded-full transition-colors ${
                v.available ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                  v.available ? "translate-x-5" : ""
                }`}
              />
            </button>
            <div className="min-w-0">
              <div className="font-semibold text-[14px]">Disponible à la carte</div>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Désactivez ce plat s'il est temporairement indisponible.
              </p>
            </div>
          </div>

          {/* Allergènes */}
          <section>
            <SectionTitle
              title="Allergènes"
              hint="Sélectionnez les allergènes présents dans ce plat."
            />
            <div className="flex flex-wrap gap-2">
              {ALLERGENS.map((a) => (
                <Chip
                  key={a.id}
                  active={v.allergens.includes(a.id)}
                  onClick={() => toggleArr("allergens", a.id)}
                  label={a.label}
                />
              ))}
            </div>
          </section>

          {/* Badges */}
          <section>
            <SectionTitle
              title="Labels et indications"
              hint="Ajoutez des indications utiles pour vos clients."
            />
            <div className="flex flex-wrap gap-2">
              {BADGES.map((b) => (
                <Chip
                  key={b.id}
                  active={v.badges.includes(b.id)}
                  onClick={() => toggleArr("badges", b.id)}
                  label={b.label}
                />
              ))}
            </div>
          </section>

          {/* Traductions */}
          <section>
            <SectionTitle title="Traductions" hint="Proposez votre carte en plusieurs langues." />
            <div className="space-y-3">
              <LangBlock
                flag="🇬🇧"
                title="Anglais"
                name={v.translations.en.name}
                desc={v.translations.en.description}
                onName={(x) =>
                  setV({
                    ...v,
                    translations: { ...v.translations, en: { ...v.translations.en, name: x } },
                  })
                }
                onDesc={(x) =>
                  setV({
                    ...v,
                    translations: {
                      ...v.translations,
                      en: { ...v.translations.en, description: x },
                    },
                  })
                }
              />
              <LangBlock
                flag="🇪🇸"
                title="Espagnol"
                name={v.translations.es.name}
                desc={v.translations.es.description}
                onName={(x) =>
                  setV({
                    ...v,
                    translations: { ...v.translations, es: { ...v.translations.es, name: x } },
                  })
                }
                onDesc={(x) =>
                  setV({
                    ...v,
                    translations: {
                      ...v.translations,
                      es: { ...v.translations.es, description: x },
                    },
                  })
                }
              />
              <button
                type="button"
                onClick={() => toast.info("Fonction de traduction bientôt disponible.")}
                className="w-full rounded-xl border border-dashed border-border bg-card py-2.5 text-[13px] font-medium text-primary flex items-center justify-center gap-2"
              >
                <Languages className="size-4" /> Générer les traductions
              </button>
            </div>
          </section>

          {/* Photo */}
          <section>
            <SectionTitle
              title="Photo du plat"
              hint="Optionnel. Ajoutez une photo si vous en avez une."
            />
            {v.image_url ? (
              <div className="relative">
                <img src={v.image_url} alt="" className="w-full h-44 object-cover rounded-2xl" />
                <button
                  type="button"
                  onClick={() => setV({ ...v, image_url: "" })}
                  className="absolute top-2 right-2 size-8 rounded-full bg-black/60 text-white grid place-items-center"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-card py-7 cursor-pointer text-muted-foreground hover:text-primary hover:border-primary/40 transition">
                {uploading ? (
                  <span className="text-[13px] font-medium">Envoi…</span>
                ) : (
                  <>
                    <ImagePlus className="size-6" />
                    <span className="text-[13px] font-medium">Ajouter une photo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                  }}
                />
              </label>
            )}
          </section>

          {/* Submit */}
          <div className="pt-2 sticky bottom-0 bg-background pb-2 -mx-5 px-5 border-t border-border">
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2"
            >
              <Check className="size-5" />
              {isEdit ? "Enregistrer le produit" : "Ajouter le produit"}
            </button>
          </div>
        </form>

        <style>{`
          .input { width:100%; border-radius: 0.75rem; border:1px solid hsl(var(--border, 0 0% 90%)); background: var(--card, #fff); padding: 0.7rem 0.85rem; font-size: 14px; outline: none; }
          .input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px color-mix(in oklab, hsl(var(--primary)) 15%, transparent); }
        `}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11.5px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h3 className="font-display font-bold text-[15px]">{title}</h3>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[12.5px] border transition ${
        active
          ? "bg-primary text-primary-foreground border-primary font-semibold"
          : "bg-card border-border text-foreground/70"
      }`}
    >
      {label}
    </button>
  );
}

function LangBlock({
  flag,
  title,
  name,
  desc,
  onName,
  onDesc,
}: {
  flag: string;
  title: string;
  name: string;
  desc: string;
  onName: (s: string) => void;
  onDesc: (s: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 text-[13px] font-semibold">
        <span className="text-base">{flag}</span> {title}
      </div>
      <input
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="Nom traduit"
        className="input"
      />
      <textarea
        value={desc}
        onChange={(e) => onDesc(e.target.value)}
        placeholder="Description traduite"
        rows={2}
        className="input resize-none"
      />
    </div>
  );
}
