// Generates 7 days of mock historical orders for charts and exports.
export type HistoryOrder = {
  id: string;
  number: number;
  date: string; // ISO
  table: string;
  zone: "Salle" | "Terrasse" | "À emporter";
  items: number;
  total: number;
  payment: "espèces" | "CB" | "ticket";
  status: "terminee" | "annulee";
};

const zones = ["Salle", "Terrasse", "À emporter"] as const;
const payments = ["espèces", "CB", "ticket"] as const;

// Pas de génération de fausses commandes — la source de vérité sera Supabase.
export const historyOrders: HistoryOrder[] = [];

export function dailyTotals(orders: HistoryOrder[]) {
  const map = new Map<string, { day: string; commandes: number; ventes: number; panier: number }>();
  for (const o of orders) {
    if (o.status === "annulee") continue;
    const key = o.date.slice(0, 10);
    const label = new Date(o.date).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "2-digit",
    });
    const cur = map.get(key) ?? { day: label, commandes: 0, ventes: 0, panier: 0 };
    cur.commandes += 1;
    cur.ventes += o.total;
    map.set(key, cur);
  }
  const list = Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, v]) => ({
      ...v,
      ventes: Math.round(v.ventes),
      panier: Math.round((v.ventes / v.commandes) * 10) / 10,
    }));
  return list;
}

export function zoneBreakdown(orders: HistoryOrder[]) {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "annulee") continue;
    map.set(o.zone, (map.get(o.zone) ?? 0) + o.total);
  }
  return Array.from(map.entries()).map(([zone, ventes]) => ({ zone, ventes: Math.round(ventes) }));
}

export function toCSV(orders: HistoryOrder[]) {
  const head = [
    "N°",
    "Date",
    "Heure",
    "Table",
    "Zone",
    "Articles",
    "Total (€)",
    "Paiement",
    "Statut",
  ];
  const rows = orders.map((o) => {
    const d = new Date(o.date);
    return [
      o.number,
      d.toLocaleDateString("fr-FR"),
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      o.table,
      o.zone,
      o.items,
      o.total.toFixed(2),
      o.payment,
      o.status,
    ];
  });
  return [head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\n");
}

export function download(
  filename: string,
  content: string | Blob,
  mime = "text/csv;charset=utf-8",
) {
  const blob = content instanceof Blob ? content : new Blob(["\ufeff" + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
