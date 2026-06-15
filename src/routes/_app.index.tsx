import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import {
  Check,
  QrCode,
  CreditCard,
  ShoppingBag,
  Star,
  ChevronRight,
  ClipboardList,
  Plus,
  Printer,
  Euro,
  Table as TableIcon,
} from "lucide-react";

export const Route = createFileRoute("/_app/")({ component: Home });

type Today = {
  commandes: number;
  ventes: number;
  note: number;
  tablesActives: number;
  toTreat: number;
};

function Home() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const restaurantName = me?.restaurant?.name ?? "Mon restaurant";
  const [today, setToday] = useState<Today>({
    commandes: 0,
    ventes: 0,
    note: 0,
    tablesActives: 0,
    toTreat: 0,
  });

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      const [ordersRes, reviewsRes, tablesRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, total, status")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", since.toISOString()),
        supabase.from("reviews").select("rating").eq("restaurant_id", restaurantId),
        supabase.from("tables").select("id").eq("restaurant_id", restaurantId).eq("active", true),
      ]);
      const orders = ordersRes.data ?? [];
      const reviews = reviewsRes.data ?? [];
      setToday({
        commandes: orders.length,
        ventes: Math.round(orders.reduce((s, o) => s + Number(o.total), 0)),
        note: reviews.length
          ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
          : 0,
        tablesActives: (tablesRes.data ?? []).length,
        toTreat: orders.filter((o) => o.status === "a_traiter").length,
      });
    };
    load();
    const ch = supabase
      .channel(`home-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [restaurantId]);

  return (
    <div>
      <AppHeader title={restaurantName} subtitle="Tableau de bord" />

      <div className="mx-5 mt-2 rounded-2xl bg-primary-soft p-4 flex items-center gap-4">
        <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center shrink-0">
          <Check className="size-7" strokeWidth={3} />
        </div>
        <div className="flex-1">
          <div className="text-primary font-bold text-xl leading-tight">Service ouvert</div>
          <div className="mt-1.5 space-y-1 text-[13px] text-primary/90">
            <div className="flex items-center gap-2">
              <QrCode className="size-4" /> Commandes QR actives
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4" /> Paiement sur place
            </div>
          </div>
        </div>
      </div>

      <Section title="À faire maintenant">
        {today.toTreat > 0 ? (
          <Link
            to="/commandes"
            className="rounded-2xl bg-warn-soft border border-warn/30 px-4 py-4 flex items-center justify-between gap-3"
          >
            <div>
              <div className="font-display font-bold text-warn text-[15px]">
                {today.toTreat} commande{today.toTreat > 1 ? "s" : ""} à traiter
              </div>
              <div className="text-[12px] text-warn/80">Toucher pour ouvrir le service</div>
            </div>
            <ChevronRight className="size-5 text-warn" />
          </Link>
        ) : (
          <div className="rounded-2xl bg-card border border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Aucune action pour le moment.
          </div>
        )}
      </Section>

      <Section title="Aujourd'hui">
        <div className="grid grid-cols-4 gap-2">
          <StatTile
            icon={<ShoppingBag className="size-4" />}
            value={`${today.commandes}`}
            label="commandes"
          />
          <StatTile icon={<Euro className="size-4" />} value={`${today.ventes} €`} label="CA" />
          <StatTile
            icon={<Star className="size-4" />}
            value={today.note ? `${today.note}/5` : "—"}
            label="note"
          />
          <StatTile
            icon={<TableIcon className="size-4" />}
            value={`${today.tablesActives}`}
            label="tables"
          />
        </div>
      </Section>

      <Section title="Actions rapides">
        <div className="grid grid-cols-3 gap-2">
          <QuickAction
            to="/commandes"
            icon={<ClipboardList className="size-5" />}
            label="Voir commandes"
          />
          <QuickAction to="/menu" icon={<Plus className="size-5" />} label="Ajouter produit" />
          <QuickAction to="/qr" icon={<Printer className="size-5" />} label="Imprimer QR" />
        </div>
      </Section>
      <div className="h-6" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 mt-6">
      <h2 className="font-display font-bold text-foreground text-[17px] mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-2.5 flex flex-col items-center text-center shadow-sm">
      <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center mb-1.5">
        {icon}
      </div>
      <div className="text-primary font-extrabold text-[15px] leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-2xl bg-card border border-border p-3 shadow-sm flex flex-col gap-3"
    >
      <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center">
        {icon}
      </div>
      <div className="flex items-center justify-between gap-1">
        <div className="text-[12px] font-semibold text-foreground leading-tight">{label}</div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
