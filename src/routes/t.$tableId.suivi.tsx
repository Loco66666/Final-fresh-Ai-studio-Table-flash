import { createFileRoute } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { restaurant } from "@/lib/mock";
import {
  Store,
  Check,
  ChefHat,
  Receipt,
  Table as TableIcon,
  ChevronRight,
  Clock,
  Heart,
  Soup,
} from "lucide-react";

export const Route = createFileRoute("/t/$tableId/suivi")({ component: ClientTracking });

const steps = [
  { key: "envoyee", label: "Commande envoyée", done: true },
  { key: "validation", label: "Validation", done: true },
  { key: "reglement", label: "Règlement", done: true },
  { key: "preparation", label: "Préparation", done: false, current: true },
  { key: "service", label: "Service", done: false },
];

function ClientTracking() {
  const { tableId } = Route.useParams();
  const tableLabel = `Table ${tableId.replace(/\D/g, "") || "1"}`;
  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex items-center gap-3 px-5 pt-6 pb-3">
          <div className="size-11 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Store className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-[20px] font-bold text-foreground leading-tight">
              {restaurant.name}
            </h1>
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5">
              <span className="size-1.5 rounded-full bg-primary" />
              Service en cours
            </div>
          </div>
        </div>

        <div className="mx-5 mt-2 rounded-2xl bg-card border border-border p-4 shadow-sm flex items-center gap-4">
          <div className="size-12 rounded-full bg-primary text-primary-foreground grid place-items-center">
            <Check className="size-6" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <div className="text-primary font-display font-extrabold text-[18px] leading-tight">
              Commande envoyée
            </div>
            <div className="mt-1 flex items-center gap-3 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <TableIcon className="size-4 text-primary" />
                {tableLabel}
              </span>
              <span className="text-border">|</span>
              <span className="inline-flex items-center gap-1 text-primary font-bold">
                <Receipt className="size-4" />
                28,40 €
              </span>
            </div>
          </div>
        </div>

        <div className="mx-5 mt-4 rounded-3xl bg-primary-soft/60 p-6">
          <div className="grid place-items-center">
            <div className="size-28 rounded-full bg-primary-soft grid place-items-center">
              <Soup className="size-14 text-primary" strokeWidth={1.5} />
            </div>
            <div className="text-center mt-3">
              <div className="font-display font-extrabold text-primary text-xl leading-tight">
                Votre commande est
                <br />
                en préparation
              </div>
              <div className="text-muted-foreground text-[13px] mt-2">
                L'équipe prépare votre commande.
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-start justify-between gap-1">
            {steps.map((s, i) => (
              <div key={s.key} className="flex flex-col items-center flex-1 min-w-0 relative">
                {i < steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 ${s.done ? "bg-primary" : "bg-border"}`}
                  />
                )}
                <div
                  className={`relative z-10 size-8 rounded-full grid place-items-center ${
                    s.done
                      ? "bg-primary text-primary-foreground"
                      : s.current
                        ? "bg-primary text-primary-foreground ring-4 ring-primary-soft"
                        : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {s.done ? (
                    <Check className="size-4" strokeWidth={3} />
                  ) : s.current ? (
                    <ChefHat className="size-4" />
                  ) : (
                    <span className="size-2 rounded-full bg-current" />
                  )}
                </div>
                <div
                  className={`text-[10px] mt-1.5 text-center leading-tight ${s.current ? "text-primary font-bold" : "text-muted-foreground"}`}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="px-5 mt-6 font-display font-bold text-foreground">Après le repas</h2>
        <div className="px-5 mt-2 space-y-2">
          <button className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm">
            <div className="size-10 rounded-full bg-card border border-border grid place-items-center font-bold text-[#4285F4]">
              G
            </div>
            <div className="flex-1 text-left font-display font-bold text-foreground">
              Donner un avis sur Google
            </div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm">
            <div className="size-10 rounded-full bg-primary-soft text-primary grid place-items-center">
              <Clock className="size-5" />
            </div>
            <div className="flex-1 text-left font-display font-bold text-foreground">Plus tard</div>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-5 mt-6 text-center">
          <Heart className="size-6 text-primary mx-auto" />
          <div className="mt-1 font-display font-bold text-foreground">
            Merci pour votre confiance !
          </div>
          <div className="text-[13px] text-muted-foreground">
            À très bientôt au Bistrot des Halles.
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}
