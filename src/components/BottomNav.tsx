import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, UtensilsCrossed, QrCode, MoreHorizontal } from "lucide-react";

type NavItem = {
  to: "/" | "/commandes" | "/menu" | "/qr" | "/plus";
  label: string;
  icon: typeof Home;
  exact?: boolean;
};
const items: NavItem[] = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/commandes", label: "Commandes", icon: ShoppingBag },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed },
  { to: "/qr", label: "QR", icon: QrCode },
  { to: "/plus", label: "Plus", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border pt-2 pb-3 px-2">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname.startsWith(to);
          return (
            <li key={to} className="flex flex-col items-center">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-1 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-6 ${active ? "stroke-[2.2]" : ""}`} />
                <span className={active ? "font-semibold" : ""}>{label}</span>
                {active && <span className="h-0.5 w-5 rounded-full bg-primary mt-0.5" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
