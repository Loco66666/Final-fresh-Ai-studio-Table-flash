import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import jsPDF from "jspdf";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Download, FileText, Search, ShoppingBag, Euro, TrendingUp } from "lucide-react";
import { historyOrders, dailyTotals, zoneBreakdown, toCSV, download } from "@/lib/history";

export const Route = createFileRoute("/_app/historique")({ component: HistoriquePage });

const RANGES = [
  { id: "7", label: "7 jours" },
  { id: "3", label: "3 jours" },
  { id: "1", label: "Aujourd'hui" },
] as const;

function HistoriquePage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("7");
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState<"Tous" | "Salle" | "Terrasse" | "À emporter">("Tous");

  const filtered = useMemo(() => {
    const days = parseInt(range, 10);
    const cutoff = Date.now() - days * 86400000;
    return historyOrders.filter((o) => {
      if (new Date(o.date).getTime() < cutoff) return false;
      if (zone !== "Tous" && o.zone !== zone) return false;
      if (query && !`${o.number} ${o.table}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [range, zone, query]);

  const daily = useMemo(() => dailyTotals(filtered), [filtered]);
  const byZone = useMemo(() => zoneBreakdown(filtered), [filtered]);
  const totals = useMemo(
    () =>
      filtered.reduce((a, o) => (o.status === "annulee" ? a : { c: a.c + 1, v: a.v + o.total }), {
        c: 0,
        v: 0,
      }),
    [filtered],
  );
  const panier = totals.c ? totals.v / totals.c : 0;

  const exportCSV = () => download(`tableflash-${range}j-${Date.now()}.csv`, toCSV(filtered));
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("TableFlash — Rapport de ventes", 14, 18);
    doc.setFontSize(10);
    doc.text(`Période : ${RANGES.find((r) => r.id === range)?.label} — Zone : ${zone}`, 14, 26);
    doc.text(
      `Commandes : ${totals.c}   Ventes : ${totals.v.toFixed(2)} €   Panier moyen : ${panier.toFixed(2)} €`,
      14,
      33,
    );

    doc.setFontSize(11);
    doc.text("Ventes par jour", 14, 46);
    let y = 54;
    doc.setFontSize(9);
    doc.text("Jour", 14, y);
    doc.text("Commandes", 60, y);
    doc.text("Ventes (€)", 110, y);
    doc.text("Panier (€)", 160, y);
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;
    daily.forEach((d) => {
      doc.text(String(d.day), 14, y);
      doc.text(String(d.commandes), 60, y);
      doc.text(d.ventes.toFixed(2), 110, y);
      doc.text(String(d.panier), 160, y);
      y += 6;
    });

    y += 6;
    doc.setFontSize(11);
    doc.text("Dernières commandes", 14, y);
    y += 6;
    doc.setFontSize(8);
    doc.text("N°", 14, y);
    doc.text("Date", 30, y);
    doc.text("Table", 70, y);
    doc.text("Zone", 115, y);
    doc.text("Articles", 145, y);
    doc.text("Total €", 175, y);
    y += 3;
    doc.line(14, y, 196, y);
    y += 5;
    filtered.slice(0, 40).forEach((o) => {
      const d = new Date(o.date);
      doc.text(String(o.number), 14, y);
      doc.text(
        d.toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        30,
        y,
      );
      doc.text(o.table, 70, y);
      doc.text(o.zone, 115, y);
      doc.text(String(o.items), 145, y);
      doc.text(o.total.toFixed(2), 175, y);
      y += 5;
      if (y > 285) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save(`tableflash-${range}j-${Date.now()}.pdf`);
  };

  return (
    <div>
      <AppHeader title="Historique" subtitle="Ventes & tendances" />

      <div className="px-5 mt-1 flex items-center gap-2">
        <Link
          to="/plus"
          className="size-9 rounded-full bg-card border border-border grid place-items-center text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1 flex items-center gap-1 bg-muted rounded-full p-1 text-[12px]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`flex-1 py-1.5 rounded-full ${range === r.id ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-5 mt-3 grid grid-cols-3 gap-2">
        <KPI icon={<ShoppingBag className="size-4" />} value={totals.c} label="commandes" />
        <KPI icon={<Euro className="size-4" />} value={`${totals.v.toFixed(0)} €`} label="ventes" />
        <KPI
          icon={<TrendingUp className="size-4" />}
          value={`${panier.toFixed(1)} €`}
          label="panier moyen"
        />
      </div>

      <Section title="Tendance des ventes">
        <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 10, right: 6, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E7C3A" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#0E7C3A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="ventes"
                  stroke="#0E7C3A"
                  strokeWidth={2.5}
                  fill="url(#g1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section title="Par zone">
        <div className="rounded-2xl bg-card border border-border p-3 shadow-sm">
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byZone} margin={{ top: 6, right: 6, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="zone"
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="ventes" radius={[8, 8, 0, 0]} fill="#0E7C3A" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Section>

      <Section title="Export">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={exportCSV}
            className="rounded-2xl bg-primary text-primary-foreground py-3 font-semibold flex items-center justify-center gap-2"
          >
            <Download className="size-4" /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="rounded-2xl border border-primary text-primary py-3 font-semibold flex items-center justify-center gap-2"
          >
            <FileText className="size-4" /> PDF
          </button>
        </div>
      </Section>

      <Section title={`Commandes (${filtered.length})`}>
        <div className="rounded-2xl bg-card border border-border p-2 shadow-sm">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 mb-2">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="N° ou table…"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="flex gap-1 mb-2 overflow-x-auto">
            {(["Tous", "Salle", "Terrasse", "À emporter"] as const).map((z) => (
              <button
                key={z}
                onClick={() => setZone(z)}
                className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap ${zone === z ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {z}
              </button>
            ))}
          </div>
          <ul className="divide-y divide-border max-h-80 overflow-y-auto">
            {filtered.slice(0, 60).map((o) => {
              const d = new Date(o.date);
              return (
                <li key={o.id} className="flex items-center gap-3 py-2">
                  <div className="size-9 rounded-full bg-primary-soft text-primary text-[12px] font-bold grid place-items-center">
                    #{String(o.number).slice(-2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">
                      #{o.number} · {o.table}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {d.toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {o.payment}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-foreground">{o.total.toFixed(2)} €</div>
                    <div
                      className={`text-[10px] ${o.status === "annulee" ? "text-danger" : "text-muted-foreground"}`}
                    >
                      {o.status}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <div className="h-6" />
    </div>
  );
}

function KPI({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center text-center shadow-sm">
      <div className="size-8 rounded-full bg-primary-soft text-primary grid place-items-center mb-1">
        {icon}
      </div>
      <div className="text-primary font-extrabold leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-5 mt-5">
      <h2 className="font-display font-bold text-foreground text-[16px] mb-2">{title}</h2>
      {children}
    </section>
  );
}
