import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import {
  ClipboardList,
  Check,
  X,
  ChefHat,
  CheckCircle2,
  Table as TableIcon,
  Loader2,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/_app/commandes")({ component: CommandesPage });

type OrderStatus = "a_traiter" | "en_preparation" | "prete" | "terminee";
type PaymentStatus = "a_payer" | "payee";
type OrderItem = { id: string; product_name: string; qty: number; unit_price: number };
type OrderRow = {
  id: string;
  number: number;
  status: OrderStatus;
  payment: PaymentStatus;
  total: number;
  table_id: string | null;
  created_at: string;
  tables?: { label: string } | null;
  order_items?: OrderItem[];
};

const tabs: { key: OrderStatus; label: string }[] = [
  { key: "a_traiter", label: "À traiter" },
  { key: "en_preparation", label: "En préparation" },
  { key: "prete", label: "Prêtes" },
  { key: "terminee", label: "Terminées" },
];

function playDing() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.55);
  } catch {
    /* silent */
  }
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* noop */
  }
}

function CommandesPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const [tab, setTab] = useState<OrderStatus>("a_traiter");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const knownIds = useRef<Set<string>>(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "id, number, status, payment, total, table_id, created_at, tables(label), order_items(id, product_name, qty, unit_price)",
        )
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as unknown as OrderRow[];
      if (!firstLoad.current) {
        const newOnes = rows.filter((r) => !knownIds.current.has(r.id) && r.status === "a_traiter");
        if (newOnes.length) playDing();
      }
      knownIds.current = new Set(rows.map((r) => r.id));
      firstLoad.current = false;
      setOrders(rows);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const update = async (id: string, patch: Partial<Pick<OrderRow, "status" | "payment">>) => {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase.from("orders").update(patch).eq("id", id);
  };
  const remove = async (id: string) => {
    setOrders((o) => o.filter((x) => x.id !== id));
    await supabase.from("orders").delete().eq("id", id);
  };

  const visible = orders.filter((o) => o.status === tab);
  const counts: Record<OrderStatus, number> = {
    a_traiter: 0,
    en_preparation: 0,
    prete: 0,
    terminee: 0,
  };
  orders.forEach((o) => {
    counts[o.status]++;
  });

  return (
    <div>
      <AppHeader title="Commandes" subtitle="Service en cours" />
      <div className="px-5 mt-2 overflow-x-auto">
        <div className="inline-flex bg-card border border-border rounded-full p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-full text-[13px] whitespace-nowrap flex items-center gap-1.5 ${
                tab === t.key
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-foreground/70"
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className={`min-w-5 px-1 h-5 rounded-full text-[11px] grid place-items-center ${
                    tab === t.key
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3 pb-6">
        {loading && (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">Aucune commande</div>
        )}
        {visible.map((o) => {
          const isOpen = expanded[o.id];
          return (
            <div key={o.id} className="rounded-2xl bg-card border border-border p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div
                  className={`size-11 rounded-full grid place-items-center ${
                    o.status === "a_traiter"
                      ? "bg-warn-soft text-warn"
                      : o.status === "en_preparation"
                        ? "bg-info-soft text-info"
                        : "bg-primary-soft text-primary"
                  }`}
                >
                  {o.status === "en_preparation" ? (
                    <ChefHat className="size-5" />
                  ) : (
                    <ClipboardList className="size-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-display font-bold text-foreground text-[17px]">
                      Commande #{o.number}
                    </div>
                    <StatusPill order={o} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[13px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <TableIcon className="size-4 text-primary" />
                      {o.tables?.label ?? "—"}
                    </div>
                    <div className="text-foreground font-bold text-base">
                      {Number(o.total).toFixed(2)} €
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExpanded((s) => ({ ...s, [o.id]: !s[o.id] }))}
                className="mt-2 w-full text-[12px] text-primary flex items-center justify-center gap-1 py-1"
              >
                {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                {isOpen ? "Masquer le détail" : `Voir le détail (${o.order_items?.length ?? 0})`}
              </button>

              {isOpen && o.order_items && (
                <ul className="mt-1 space-y-1 text-[13px] border-t border-border pt-2">
                  {o.order_items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>
                        {it.qty}× {it.product_name}
                      </span>
                      <span className="text-muted-foreground">
                        {(Number(it.unit_price) * it.qty).toFixed(2)} €
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex gap-2">
                {o.status === "a_traiter" && (
                  <>
                    <button
                      onClick={() => update(o.id, { status: "en_preparation" })}
                      className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 text-[14px]"
                    >
                      <Check className="size-4" strokeWidth={3} /> Accepter
                    </button>
                    <button
                      onClick={() => remove(o.id)}
                      className="px-4 border border-danger/30 text-danger rounded-xl py-3 font-semibold flex items-center justify-center gap-2 text-[14px]"
                    >
                      <X className="size-4" strokeWidth={3} />
                    </button>
                  </>
                )}
                {o.status === "en_preparation" && (
                  <button
                    onClick={() => update(o.id, { status: "prete" })}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 text-[14px]"
                  >
                    <CheckCircle2 className="size-4" /> Marquer prête
                  </button>
                )}
                {o.status === "prete" && (
                  <button
                    onClick={() => update(o.id, { status: "terminee" })}
                    className="flex-1 bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2 text-[14px]"
                  >
                    <Check className="size-4" strokeWidth={3} /> Servie
                  </button>
                )}
                {o.payment === "a_payer" && o.status !== "a_traiter" && (
                  <button
                    onClick={() => update(o.id, { payment: "payee" })}
                    className="px-4 border border-primary text-primary rounded-xl py-3 font-semibold flex items-center justify-center gap-2 text-[14px]"
                  >
                    <CreditCard className="size-4" /> Payée
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ order }: { order: { status: OrderStatus; payment: string } }) {
  if (order.payment === "a_payer")
    return (
      <span className="px-2.5 py-1 rounded-full bg-warn-soft text-warn text-[12px] font-medium">
        À payer
      </span>
    );
  if (order.status === "en_preparation")
    return (
      <span className="px-2.5 py-1 rounded-full bg-info-soft text-info text-[12px] font-medium">
        En préparation
      </span>
    );
  if (order.status === "prete")
    return (
      <span className="px-2.5 py-1 rounded-full bg-primary-soft text-primary text-[12px] font-medium">
        Prête
      </span>
    );
  if (order.status === "terminee")
    return (
      <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[12px] font-medium">
        Terminée
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full bg-primary-soft text-primary text-[12px] font-medium">
      Payée
    </span>
  );
}
