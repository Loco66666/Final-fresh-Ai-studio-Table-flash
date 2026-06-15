import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Bell, Volume2, VolumeX, Check, AlertCircle } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export const Route = createFileRoute("/_app/plus/notifications")({ component: NotifPage });

function NotifPage() {
  const {
    soundEnabled,
    setSoundEnabled,
    pushEnabled,
    permission,
    requestPush,
    disablePush,
    notify,
  } = useNotifications();

  return (
    <div>
      <AppHeader title="Notifications" subtitle="Alertes nouvelles commandes" />

      <div className="px-5 mt-3 space-y-3">
        <Row
          icon={soundEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          title="Alerte sonore"
          desc="Bip court à chaque nouvelle commande."
          checked={soundEnabled}
          onToggle={() => setSoundEnabled(!soundEnabled)}
        />

        <Row
          icon={<Bell className="size-5" />}
          title="Notifications push"
          desc={
            permission === "unsupported"
              ? "Ce navigateur ne prend pas en charge les notifications."
              : permission === "denied"
                ? "Bloquées par le navigateur — autorisez-les dans les réglages du site."
                : pushEnabled
                  ? "Activées — vous serez prévenu même hors de l'onglet."
                  : "Recevoir une notification système quand un client commande."
          }
          checked={pushEnabled}
          disabled={permission === "unsupported" || permission === "denied"}
          onToggle={() => (pushEnabled ? disablePush() : requestPush())}
        />

        {permission === "denied" && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft/40 p-3 text-[12px] text-danger flex gap-2">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            Pour réactiver, ouvrez les paramètres du site dans votre navigateur et autorisez les
            notifications.
          </div>
        )}

        <button
          onClick={() => notify("Test de notification", "Une commande vient d'arriver · Table 3")}
          className="w-full rounded-2xl border border-primary text-primary py-3 font-semibold flex items-center justify-center gap-2"
        >
          <Bell className="size-4" /> Tester
        </button>
      </div>
    </div>
  );
}

function Row({
  icon,
  title,
  desc,
  checked,
  disabled,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-sm text-left disabled:opacity-60"
    >
      <div className="size-11 rounded-full bg-primary-soft text-primary grid place-items-center">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-display font-bold text-foreground">{title}</div>
        <div className="text-[12px] text-muted-foreground">{desc}</div>
      </div>
      <div
        className={`w-11 h-6 rounded-full relative transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow grid place-items-center transition-transform ${checked ? "translate-x-5" : ""}`}
        >
          {checked && <Check className="size-3 text-primary" strokeWidth={3} />}
        </span>
      </div>
    </button>
  );
}
