import { Bell, X } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

export function NotificationToasts() {
  const { toasts, dismiss } = useNotifications();
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,360px)] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 bg-card border border-border shadow-lg rounded-2xl p-3 animate-in slide-in-from-top-2 fade-in"
        >
          <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">
            <Bell className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-foreground text-[14px] truncate">
              {t.title}
            </div>
            <div className="text-[12px] text-muted-foreground truncate">{t.body}</div>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="size-7 grid place-items-center text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
