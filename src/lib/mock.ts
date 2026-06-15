export type ProductStatus = "disponible" | "rupture";
export type OrderStatus = "a_traiter" | "en_preparation" | "prete" | "terminee";
export type PaymentStatus = "a_payer" | "payee";

export type ProductCategory =
  | "Suggestions"
  | "Menu du midi"
  | "Menu du soir"
  | "À partager"
  | "Entrées"
  | "Plats"
  | "Fromages"
  | "Desserts"
  | "Menu enfant"
  | "Boissons"
  | "Vins"
  | "Cocktails"
  | "Digestifs"
  | "Autres";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  status: ProductStatus;
  promo?: boolean;
  image?: string;
  allergens?: string[];
  badges?: string[];
  translations?: {
    en?: { name?: string; description?: string };
    es?: { name?: string; description?: string };
  };
};

export type Order = {
  id: string;
  number: number;
  table: string;
  items: { productId: string; qty: number }[];
  total: number;
  status: OrderStatus;
  payment: PaymentStatus;
  createdAt: string;
};

export type TableQR = {
  id: string;
  label: string;
  zone: "Salle" | "Terrasse" | "À emporter";
  active: boolean;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  table: string;
  orderRef: string;
  ago: string;
  treated: boolean;
};

export const restaurant: {
  name: string;
  serviceLabel: string;
  welcome?: { fr?: string; en?: string; es?: string };
  logo?: string;
} = {
  name: "Mon restaurant",
  serviceLabel: "Service",
  welcome: {
    fr: "Bienvenue, bonne dégustation.",
    en: "Welcome, enjoy your meal.",
    es: "Bienvenido, buen provecho.",
  },
};

// ⚠️ DEPRECATED — kept only as TYPE stubs for legacy dashboard pages.
// The single source of truth is Lovable Cloud (Supabase). These arrays
// MUST stay empty. Do NOT seed, do NOT push to them, do NOT reintroduce
// fictional data. Any background simulator creating orders is forbidden
// (see src/lib/orders.functions.ts and src/lib/notifications.tsx).
export const products: Product[] = [];
export const orders: Order[] = [];
export const tables: TableQR[] = [];
export const reviews: Review[] = [];

export const activity: { h: string; v: number }[] = [];

export const stats = {
  commandes: 0,
  ventes: 0,
  panier: 0,
  note: 0,
  tablesActives: 0,
  scans: 0,
  qrActifs: 0,
  commandesQR: 0,
};
