import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/AppHeader";
import { ChevronRight, Star, BarChart3, Settings, History, Bell, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/plus/")({ component: PlusPage });

function PlusPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const items = [
    {
      to: "/historique",
      icon: History,
      label: "Historique & rapports",
      desc: "Ventes, tendances, export CSV/PDF",
    },
    { to: "/plus/notifications", icon: Bell, label: "Notifications", desc: "Sons & alertes push" },
    { to: "/plus/avis", icon: Star, label: "Avis clients", desc: "Notes et retours" },
    {
      to: "/plus/statistiques",
      icon: BarChart3,
      label: "Statistiques",
      desc: "Activité du service",
    },
    {
      to: "/plus/reglages",
      icon: Settings,
      label: "Réglages",
      desc: "Établissement, horaires, QR",
    },
  ];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div>
      <AppHeader title="Plus" subtitle="Outils & paramètres" />
      <div className="px-5 mt-3 space-y-2 pb-6">
        {items.map(({ to, icon: Icon, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 rounded-2xl bg-card border border-border p-4 shadow-sm"
          >
            <div className="size-11 rounded-full bg-primary-soft text-primary grid place-items-center">
              <Icon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">{label}</div>
              <div className="text-[12px] text-muted-foreground">{desc}</div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        ))}
        <button
          onClick={signOut}
          className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl border border-danger/30 text-danger p-4 font-semibold"
        >
          <LogOut className="size-4" /> Se déconnecter
        </button>
      </div>
    </div>
  );
}
