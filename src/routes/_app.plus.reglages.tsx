import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import {
  Building2,
  Clock,
  CreditCard,
  QrCode,
  Star,
  Brush,
  Save,
  Check,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/_app/plus/reglages")({ component: ReglagesPage });

function ReglagesPage() {
  const rows = [
    { icon: Building2, title: "Établissement", desc: "Nom, adresse, téléphone" },
    { icon: Clock, title: "Horaires", desc: "Service midi · Service soir" },
    { icon: CreditCard, title: "Commandes", desc: "Paiement sur place" },
    { icon: QrCode, title: "QR", desc: "Instruction QR" },
    { icon: Star, title: "Avis Google", desc: "Lien Google Avis" },
    { icon: Brush, title: "Apparence", desc: "Classique premium" },
  ];
  return (
    <div>
      <AppHeader title="Réglages" />
      <div className="mx-5 mt-2 rounded-2xl bg-primary-soft p-4 flex items-center gap-4">
        <div className="size-14 rounded-full bg-primary text-primary-foreground grid place-items-center">
          <Check className="size-7" strokeWidth={3} />
        </div>
        <div>
          <div className="text-primary text-[14px]">État de préparation</div>
          <div className="text-primary font-display font-extrabold text-2xl leading-tight">
            100% prêt
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-2">
        {rows.map(({ icon: Icon, title, desc }) => (
          <button
            key={title}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm text-left"
          >
            <div className="size-11 rounded-full bg-primary-soft text-primary grid place-items-center">
              <Icon className="size-5" />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-foreground">{title}</div>
              <div className="text-[12px] text-muted-foreground">{desc}</div>
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      <div className="px-5 mt-4 pb-6">
        <button className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2">
          <Save className="size-5" /> Enregistrer
        </button>
      </div>
    </div>
  );
}
