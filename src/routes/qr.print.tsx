import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Printer, UtensilsCrossed, ScanLine, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";

export const Route = createFileRoute("/qr/print")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: PrintPage,
});

type Variant = "classic" | "dark" | "minimal";
type TableRow = { id: string; label: string; zone: string; active: boolean };

const accents: Record<
  Variant,
  { bg: string; fg: string; qrBg: string; qrFg: string; sub: string }
> = {
  classic: { bg: "#ffffff", fg: "#0E7C3A", qrBg: "#ffffff", qrFg: "#0E7C3A", sub: "#4b5563" },
  dark: { bg: "#0E7C3A", fg: "#ffffff", qrBg: "#ffffff", qrFg: "#0E7C3A", sub: "#d1fae5" },
  minimal: { bg: "#ffffff", fg: "#111827", qrBg: "#ffffff", qrFg: "#111827", sub: "#6b7280" },
};

const origin = () => (typeof window !== "undefined" ? window.location.origin : "");

function PrintPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const restaurantName = me?.restaurant?.name ?? "Mon restaurant";
  const [variant, setVariant] = useState<Variant>("classic");
  const [perPage, setPerPage] = useState<2 | 4>(4);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data } = await supabase
        .from("tables")
        .select("id, label, zone, active")
        .eq("restaurant_id", restaurantId)
        .order("label");
      const rows = (data ?? []) as TableRow[];
      setTables(rows);

      // Read preselected IDs from browser URL query parameter if present
      let preselectedIds: string[] = [];
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const idsParam = params.get("ids");
        if (idsParam) {
          preselectedIds = idsParam.split(",");
        }
      }

      if (preselectedIds.length > 0) {
        setSelected(Object.fromEntries(preselectedIds.map((id) => [id, true])));
      } else {
        setSelected(Object.fromEntries(rows.filter((t) => t.active).map((t) => [t.id, true])));
      }
      setLoading(false);
    })();
  }, [restaurantId]);

  const chosen = useMemo(() => tables.filter((t) => selected[t.id]), [tables, selected]);
  const a = accents[variant];

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="print:hidden sticky top-0 z-10 bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center gap-3 flex-wrap">
          <Link to="/qr" className="size-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display font-extrabold text-lg flex-1">Préparer l'impression</h1>
          <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-sm">
            {(["classic", "dark", "minimal"] as Variant[]).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`px-3 py-1.5 rounded-full ${variant === v ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}
              >
                {v === "classic" ? "Classique" : v === "dark" ? "Vert" : "Minimal"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-sm">
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPerPage(n as 2 | 4)}
                className={`px-3 py-1.5 rounded-full ${perPage === n ? "bg-card shadow-sm font-semibold" : "text-muted-foreground"}`}
              >
                {n}/page
              </button>
            ))}
          </div>
          <button
            onClick={() => window.print()}
            className="bg-primary text-primary-foreground rounded-full px-4 py-2 font-semibold flex items-center gap-2"
          >
            <Printer className="size-4" /> Imprimer
          </button>
        </div>
        <div className="max-w-5xl mx-auto px-5 pb-3 flex flex-wrap gap-2">
          {tables.map((t) => (
            <label
              key={t.id}
              className={`px-3 py-1.5 rounded-full border text-sm cursor-pointer ${selected[t.id] ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={!!selected[t.id]}
                onChange={(e) => setSelected((s) => ({ ...s, [t.id]: e.target.checked }))}
              />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-5 print:p-0 print:max-w-none">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        {!loading &&
          chunk(chosen, perPage).map((page, i) => (
            <section
              key={i}
              className="bg-white shadow print:shadow-none mx-auto mb-6 print:mb-0 print:break-after-page"
              style={{ width: "210mm", minHeight: "297mm", padding: "12mm" }}
            >
              <div
                className={`grid gap-4 h-full ${perPage === 2 ? "grid-cols-1 grid-rows-2" : "grid-cols-2 grid-rows-2"}`}
                style={{ minHeight: "273mm" }}
              >
                {page.map((t) => (
                  <Card
                    key={t.id}
                    table={t}
                    a={a}
                    variant={variant}
                    restaurantName={restaurantName}
                  />
                ))}
              </div>
            </section>
          ))}
        {!loading && chosen.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Sélectionnez au moins une table.
          </p>
        )}
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body { background: white !important; } }`}</style>
    </div>
  );
}

function Card({
  table,
  a,
  variant,
  restaurantName,
}: {
  table: TableRow;
  a: (typeof accents)[Variant];
  variant: Variant;
  restaurantName: string;
}) {
  const url = `${origin()}/t/${table.id}`;
  return (
    <div
      className="rounded-3xl flex flex-col items-center justify-between text-center p-6"
      style={{
        background: a.bg,
        color: a.fg,
        border: variant === "minimal" ? "2px dashed #e5e7eb" : "none",
      }}
    >
      <div className="flex items-center gap-2 font-display font-extrabold text-xl">
        <UtensilsCrossed className="size-5" />
        {restaurantName}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm uppercase tracking-widest opacity-70">Commandez en scannant</div>
        <div className="text-4xl font-display font-extrabold">{table.label}</div>
        <div className="text-xs opacity-70">{table.zone}</div>
      </div>
      <div
        className="rounded-2xl p-4"
        style={{
          background: a.qrBg,
          boxShadow: variant === "dark" ? "0 4px 24px rgba(0,0,0,0.2)" : undefined,
        }}
      >
        <QRCodeSVG value={url} size={180} level="H" fgColor={a.qrFg} bgColor={a.qrBg} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ScanLine className="size-4" /> Scannez · Commandez · Réglez au comptoir
        </div>
        <div className="text-[11px] break-all px-2" style={{ color: a.sub }}>
          {url}
        </div>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
