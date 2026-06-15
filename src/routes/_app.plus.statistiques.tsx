import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { ShoppingBag, Euro, ShoppingCart, Star, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export const Route = createFileRoute("/_app/plus/statistiques")({ component: StatsPage });

type Filter = "today" | "7d" | "30d";
const filters: { key: Filter; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
];

type OrderLite = {
  id: string;
  total: number;
  created_at: string;
  status: string;
  order_items: { product_name: string; qty: number; unit_price: number }[];
};

function StatsPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const [filter, setFilter] = useState<Filter>("today");
  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      setLoading(true);
      const since = new Date();
      if (filter === "today") since.setHours(0, 0, 0, 0);
      else if (filter === "7d") since.setDate(since.getDate() - 7);
      else since.setDate(since.getDate() - 30);

      const [ordersRes, reviewsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, created_at, status, order_items(product_name, qty, unit_price)")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("reviews").select("rating").eq("restaurant_id", restaurantId),
      ]);
      setOrders((ordersRes.data ?? []) as unknown as OrderLite[]);
      const ratings = reviewsRes.data ?? [];
      setAvgRating(ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : 0);
      setLoading(false);
    })();
  }, [restaurantId, filter]);

  const ca = orders.reduce((s, o) => s + Number(o.total), 0);
  const nbCmd = orders.length;
  const panier = nbCmd ? ca / nbCmd : 0;

  const topProducts = useMemo(() => {
    const map = new Map<string, { qty: number; ca: number }>();
    orders.forEach((o) => {
      (o.order_items ?? []).forEach((it) => {
        const cur = map.get(it.product_name) ?? { qty: 0, ca: 0 };
        cur.qty += it.qty;
        cur.ca += it.qty * Number(it.unit_price);
        map.set(it.product_name, cur);
      });
    });
    return [...map.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [orders]);

  const activity = useMemo(() => {
    if (filter === "today") {
      const buckets: Record<number, number> = {};
      for (let h = 0; h < 24; h++) buckets[h] = 0;
      orders.forEach((o) => {
        const h = new Date(o.created_at).getHours();
        buckets[h] = (buckets[h] ?? 0) + Number(o.total);
      });
      return Object.entries(buckets).map(([h, v]) => ({ h: `${h}h`, v }));
    }
    const days = filter === "7d" ? 7 : 30;
    const buckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      buckets[d.toISOString().slice(5, 10)] = 0;
    }
    orders.forEach((o) => {
      const k = o.created_at.slice(5, 10);
      if (k in buckets) buckets[k] += Number(o.total);
    });
    return Object.entries(buckets).map(([h, v]) => ({ h, v }));
  }, [orders, filter]);

  const peakHour = useMemo(() => {
    if (filter !== "today" || !orders.length) return null;
    const counts: Record<number, number> = {};
    orders.forEach((o) => {
      const h = new Date(o.created_at).getHours();
      counts[h] = (counts[h] ?? 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]}h` : null;
  }, [orders, filter]);

  return (
    <div>
      <AppHeader title="Statistiques" subtitle="Vue d'ensemble de votre activité" />

      <div className="px-5 mt-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-full text-[13px] border ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-card border-border text-foreground/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-4 rounded-2xl bg-card border border-border p-3 grid grid-cols-4 gap-2 shadow-sm">
        <Mini icon={<ShoppingBag className="size-4" />} value={`${nbCmd}`} label="commandes" />
        <Mini icon={<Euro className="size-4" />} value={`${ca.toFixed(0)} €`} label="CA" />
        <Mini
          icon={<ShoppingCart className="size-4" />}
          value={`${panier.toFixed(2).replace(".", ",")} €`}
          label="panier moy."
        />
        <Mini icon={<Star className="size-4" />} value={`${avgRating.toFixed(1)}/5`} label="note" />
      </div>

      <div className="mx-5 mt-3 rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="font-display font-bold text-foreground mb-2">Activité</div>
        {loading ? (
          <div className="h-44 flex items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.46 0.14 150)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.46 0.14 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(0.92 0.01 150)"
                />
                <XAxis
                  dataKey="h"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: "oklch(0.5 0.02 240)" }}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="oklch(0.46 0.14 150)"
                  strokeWidth={2.5}
                  fill="url(#g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mx-5 mt-3 rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="font-display font-bold text-foreground mb-2">Top produits</div>
        {topProducts.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            Aucune donnée sur la période.
          </div>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div
                  className={`size-7 rounded-full grid place-items-center text-[13px] font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-[14px] truncate">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {p.qty} ventes · {p.ca.toFixed(0)} €
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mx-5 mt-3 rounded-2xl bg-card border border-border p-4 shadow-sm">
        <div className="font-display font-bold text-foreground mb-2">À retenir</div>
        <ul className="text-sm text-foreground/80 space-y-1">
          {nbCmd === 0 && <li>Aucune commande sur la période.</li>}
          {nbCmd > 0 && (
            <li>
              • Panier moyen : <b>{panier.toFixed(2).replace(".", ",")} €</b>
            </li>
          )}
          {peakHour && (
            <li>
              • Heure de pointe aujourd'hui : <b>{peakHour}</b>
            </li>
          )}
          {topProducts[0] && (
            <li>
              • Best-seller : <b>{topProducts[0].name}</b> ({topProducts[0].qty} ventes)
            </li>
          )}
        </ul>
      </div>

      <div className="h-6" />
    </div>
  );
}

function Mini({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center">
        {icon}
      </div>
      <div className="text-primary font-extrabold text-[14px] mt-1 leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
    </div>
  );
}
