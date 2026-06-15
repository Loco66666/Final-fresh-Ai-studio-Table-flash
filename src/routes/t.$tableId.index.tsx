import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhoneFrame } from "@/components/PhoneFrame";
import { getMenuForTable, type MenuPayload } from "@/lib/menu.functions";
import { createOrderForTable, createReviewForTable } from "@/lib/orders.functions";
import {
  Store,
  Star,
  Sun,
  Moon,
  Users,
  Leaf,
  UtensilsCrossed,
  Cookie,
  Cake,
  Baby,
  Coffee,
  Wine,
  Martini,
  GlassWater,
  MoreHorizontal,
  ShoppingBasket,
  ChevronRight,
  BellRing,
  MessageSquare,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/t/$tableId/")({ component: ClientMenu });

type Lang = "fr" | "en" | "es";
type ProductDTO = MenuPayload["products"][number];

const HIGHLIGHTED_CATS = new Set(["Suggestions", "Menu du midi", "Menu du soir"]);

const cats: { key: string; icon: typeof Star; highlight?: boolean }[] = [
  { key: "Suggestions", icon: Star, highlight: true },
  { key: "Menu du midi", icon: Sun, highlight: true },
  { key: "Menu du soir", icon: Moon, highlight: true },
  { key: "À partager", icon: Users },
  { key: "Entrées", icon: Leaf },
  { key: "Plats", icon: UtensilsCrossed },
  { key: "Fromages", icon: Cookie },
  { key: "Desserts", icon: Cake },
  { key: "Menu enfant", icon: Baby },
  { key: "Boissons", icon: Coffee },
  { key: "Vins", icon: Wine },
  { key: "Cocktails", icon: Martini },
  { key: "Digestifs", icon: GlassWater },
  { key: "Autres", icon: MoreHorizontal },
];

const i18n = {
  fr: {
    welcome: "Bienvenue chez",
    table: "Table",
    callServer: "Appeler un serveur",
    leaveReview: "Laisser un avis",
    cart: "Panier",
    confirm: "Confirmer",
    add: "Ajouter",
    allergens: "Allergènes",
    empty: "Le menu sera bientôt disponible.",
    emptyCat: "Aucun produit dans cette catégorie",
    serverSent: "Votre demande a été envoyée à l'équipe.",
    reviewThanks: "Merci, votre avis est précieux.",
    language: "Langue",
    serviceTitle: "Un besoin ?",
    loading: "Chargement du menu…",
    errorTitle: "QR code introuvable",
    errorBody: "Ce QR ne correspond à aucune table active. Demandez à l'équipe de vérifier.",
  },
  en: {
    welcome: "Welcome to",
    table: "Table",
    callServer: "Call a waiter",
    leaveReview: "Leave a review",
    cart: "Cart",
    confirm: "Confirm",
    add: "Add",
    allergens: "Allergens",
    empty: "Menu coming soon.",
    emptyCat: "No items in this category",
    serverSent: "Your request has been sent to the team.",
    reviewThanks: "Thank you, your feedback matters.",
    language: "Language",
    serviceTitle: "Need anything?",
    loading: "Loading the menu…",
    errorTitle: "QR code not found",
    errorBody: "This QR doesn't match an active table. Please ask the team.",
  },
  es: {
    welcome: "Bienvenido a",
    table: "Mesa",
    callServer: "Llamar al camarero",
    leaveReview: "Dejar una opinión",
    cart: "Cesta",
    confirm: "Confirmar",
    add: "Añadir",
    allergens: "Alérgenos",
    empty: "El menú estará disponible pronto.",
    emptyCat: "No hay productos en esta categoría",
    serverSent: "Tu petición ha sido enviada al equipo.",
    reviewThanks: "Gracias, tu opinión es importante.",
    language: "Idioma",
    serviceTitle: "¿Algo más?",
    loading: "Cargando el menú…",
    errorTitle: "Código QR no encontrado",
    errorBody: "Este QR no corresponde a una mesa activa. Pide al equipo que lo revise.",
  },
} as const;

function localized(p: ProductDTO, lang: Lang) {
  if (lang === "fr") return { name: p.name, description: p.description };
  return {
    name: p.translations?.[lang]?.name || p.name,
    description: p.translations?.[lang]?.description || p.description,
  };
}

function formatPrice(n: number) {
  return Number.isInteger(n) ? `${n} €` : `${n.toFixed(2).replace(".", ",")} €`;
}

function ClientMenu() {
  const { tableId } = Route.useParams();
  const [lang, setLang] = useState<Lang>("fr");
  const t = i18n[lang];

  const fetchMenu = useServerFn(getMenuForTable);
  const placeOrder = useServerFn(createOrderForTable);
  const sendReview = useServerFn(createReviewForTable);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["menu", tableId],
    queryFn: () => fetchMenu({ data: { tableId } }),
    retry: false,
  });

  const [cat, setCat] = useState<string>("Suggestions");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  const products = data?.products ?? [];
  const visibleCats = useMemo(
    () => cats.filter(({ key }) => products.some((p) => p.category === key)),
    [products],
  );

  useEffect(() => {
    if (visibleCats.length > 0 && !visibleCats.some((c) => c.key === cat)) {
      setCat(visibleCats[0].key);
    }
  }, [visibleCats, cat]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const orderMutation = useMutation({
    mutationFn: (items: { productId: string; qty: number }[]) =>
      placeOrder({ data: { tableId, items } }),
    onSuccess: () => {
      setCart({});
      setToast(t.serverSent);
    },
    onError: () => setToast(t.errorTitle),
  });

  const reviewMutation = useMutation({
    mutationFn: () => sendReview({ data: { tableId, rating: 5 } }),
    onSuccess: () => setToast(t.reviewThanks),
    onError: () => setToast(t.errorTitle),
  });

  // ===== LOADING =====
  if (isLoading) {
    return (
      <PhoneFrame>
        <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> {t.loading}
          </div>
        </div>
      </PhoneFrame>
    );
  }

  // ===== ERROR: invalid QR / table not found =====
  if (isError || !data) {
    return (
      <PhoneFrame>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-3">
          <div className="size-14 rounded-full bg-destructive/10 text-destructive grid place-items-center">
            <AlertTriangle className="size-7" />
          </div>
          <h1 className="font-display font-bold text-foreground text-lg">{t.errorTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.errorBody}</p>
        </div>
      </PhoneFrame>
    );
  }

  const { restaurant, table } = data;
  const tableLabel = `${t.table} ${table.label}`;
  const welcomeMsg =
    lang === "fr"
      ? restaurant.welcome_fr
      : lang === "en"
        ? restaurant.welcome_en || restaurant.welcome_fr
        : restaurant.welcome_es || restaurant.welcome_fr;

  const visible = products.filter((p) => p.category === cat);
  const cartItems = Object.entries(cart).filter(([, q]) => q > 0);
  const cartCount = cartItems.reduce((s, [, q]) => s + q, 0);
  const cartTotal = cartItems.reduce((s, [id, q]) => {
    const p = products.find((x) => x.id === id);
    return s + (p ? p.price * q : 0);
  }, 0);

  const isHighlightedCat = HIGHLIGHTED_CATS.has(cat);

  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-6 pb-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {restaurant.logo_url ? (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="size-12 rounded-full object-cover shrink-0 border border-border"
                />
              ) : (
                <div className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
                  <Store className="size-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {t.welcome}
                </div>
                <h1 className="font-display text-[20px] font-bold text-foreground leading-tight truncate">
                  {restaurant.name}
                </h1>
                <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mt-0.5">
                  <span className="size-1.5 rounded-full bg-primary" />
                  {tableLabel}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1 rounded-full bg-card border border-border p-0.5 shrink-0"
              role="group"
              aria-label={t.language}
            >
              {(["fr", "en", "es"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide transition ${
                    lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  aria-pressed={lang === l}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          {welcomeMsg && (
            <p className="text-[13px] text-muted-foreground mt-3 leading-snug">{welcomeMsg}</p>
          )}
        </div>

        {visibleCats.length > 0 ? (
          <>
            <div className="px-5 mt-1 overflow-x-auto scrollbar-none">
              <div className="flex gap-2 min-w-max pb-1">
                {visibleCats.map(({ key, icon: Icon, highlight }) => {
                  const active = cat === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setCat(key)}
                      className={`px-3.5 py-2 rounded-full text-[13px] border flex items-center gap-1.5 whitespace-nowrap transition ${
                        active
                          ? "bg-primary text-primary-foreground border-primary font-semibold shadow-sm"
                          : highlight
                            ? "bg-primary-soft/60 border-primary/20 text-primary"
                            : "bg-card border-border text-foreground/70"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" /> {key}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-5 mt-4 space-y-3">
              {visible.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-12">{t.emptyCat}</div>
              ) : (
                visible.map((p) => {
                  const L = localized(p, lang);
                  const hasImage = Boolean(p.image_url);
                  const hasBadges = p.badges.length > 0;
                  const hasAllergens = p.allergens.length > 0;
                  return (
                    <article
                      key={p.id}
                      className={`rounded-2xl bg-card border shadow-sm overflow-hidden ${
                        isHighlightedCat
                          ? "border-primary/30 ring-1 ring-primary/10"
                          : "border-border"
                      }`}
                    >
                      <div className="flex">
                        {hasImage && (
                          <img
                            src={p.image_url!}
                            alt={L.name}
                            className="w-28 sm:w-32 object-cover shrink-0"
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 p-3.5 flex flex-col min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-display font-bold text-foreground text-[16px] leading-tight min-w-0">
                              {L.name}
                            </h3>
                            <div className="text-primary font-extrabold text-[15px] whitespace-nowrap shrink-0">
                              {formatPrice(p.price)}
                            </div>
                          </div>
                          {L.description && (
                            <p className="text-[12.5px] text-muted-foreground mt-1 leading-snug">
                              {L.description}
                            </p>
                          )}
                          {hasBadges && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {p.badges.map((b) => (
                                <span
                                  key={b}
                                  className="text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary border border-primary/10"
                                >
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                          {hasAllergens && (
                            <div className="mt-2 text-[11px] text-muted-foreground">
                              <span className="font-medium">{t.allergens} :</span>{" "}
                              {p.allergens.join(", ")}
                            </div>
                          )}
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}
                              className="text-primary text-[12.5px] font-semibold hover:underline"
                            >
                              + {t.add}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="px-5 mt-12 text-center text-muted-foreground text-sm">{t.empty}</div>
        )}

        <div className="px-5 mt-6 pb-32">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
            {t.serviceTitle}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setToast(t.serverSent)}
              className="rounded-2xl bg-card border border-border p-3 flex items-center gap-2 text-foreground shadow-sm active:scale-[0.99] transition"
            >
              <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">
                <BellRing className="size-4" />
              </div>
              <span className="text-[13px] font-semibold leading-tight text-left">
                {t.callServer}
              </span>
            </button>
            <button
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
              className="rounded-2xl bg-card border border-border p-3 flex items-center gap-2 text-foreground shadow-sm active:scale-[0.99] transition disabled:opacity-60"
            >
              <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">
                <MessageSquare className="size-4" />
              </div>
              <span className="text-[13px] font-semibold leading-tight text-left">
                {t.leaveReview}
              </span>
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-24 z-50 bg-foreground text-background rounded-full px-4 py-2 text-[13px] shadow-lg flex items-center gap-2">
          <Check className="size-4" /> {toast}
        </div>
      )}

      {cartCount > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-3">
          <div className="flex items-center gap-3">
            <div className="relative size-11 rounded-xl bg-primary-soft text-primary grid place-items-center shrink-0">
              <ShoppingBasket className="size-5" />
              <span className="absolute -top-1 -right-1 size-5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold grid place-items-center">
                {cartCount}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-muted-foreground">
                {t.cart} · {cartCount}
              </div>
              <div className="font-extrabold text-primary text-base leading-tight">
                {formatPrice(cartTotal)}
              </div>
            </div>
            <button
              onClick={() =>
                orderMutation.mutate(cartItems.map(([productId, qty]) => ({ productId, qty })))
              }
              disabled={orderMutation.isPending}
              className="bg-primary text-primary-foreground rounded-xl px-3.5 py-2.5 text-[13px] font-semibold flex items-center gap-1 shrink-0 disabled:opacity-60"
            >
              {t.confirm} <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Suivi link kept as a discreet option for the user. */}
      <Link to="/t/$tableId/suivi" params={{ tableId }} className="hidden" aria-hidden />
    </PhoneFrame>
  );
}
