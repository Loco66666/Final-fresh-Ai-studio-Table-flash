import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Archive, Loader2, User, ExternalLink, Save } from "lucide-react";

export const Route = createFileRoute("/_app/plus/avis")({ component: AvisPage });

type Review = {
  id: string;
  rating: number;
  author: string | null;
  comment: string | null;
  treated: boolean;
  created_at: string;
};

function AvisPage() {
  const qc = useQueryClient();
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleUrl, setGoogleUrl] = useState("");
  const [savingUrl, setSavingUrl] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("google_review_url")
        .eq("id", restaurantId)
        .maybeSingle();
      setGoogleUrl(data?.google_review_url ?? "");
    })();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, author, comment, treated, created_at")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setReviews((data ?? []) as Review[]);
        setLoading(false);
      }
    };
    load();
    const channel = supabase
      .channel(`reviews-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reviews",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "0";
  const toTreat = reviews.filter((r) => !r.treated).length;
  const positive = reviews.filter((r) => r.rating >= 4).length;

  const archive = async (id: string) => {
    setReviews((r) => r.map((x) => (x.id === id ? { ...x, treated: true } : x)));
    await supabase.from("reviews").update({ treated: true }).eq("id", id);
  };

  const saveGoogleUrl = async () => {
    if (!restaurantId) return;
    setSavingUrl(true);
    const url = googleUrl.trim() || null;
    const { error } = await supabase
      .from("restaurants")
      .update({ google_review_url: url })
      .eq("id", restaurantId);
    setSavingUrl(false);
    if (error) return toast.error("Échec");
    toast.success("Lien Google enregistré");
    qc.invalidateQueries({ queryKey: ["my-restaurant"] });
  };

  return (
    <div>
      <AppHeader title="Avis clients" subtitle="Service après-vente" />

      <div className="px-5 mt-2 grid grid-cols-3 gap-2">
        <Tile value={avg} label="moyenne" />
        <Tile value={String(toTreat)} label="à traiter" />
        <Tile value={String(positive)} label="positifs" />
      </div>

      <div className="px-5 mt-4">
        <div className="rounded-2xl bg-card border border-border p-3.5 shadow-sm">
          <div className="font-display font-bold text-foreground text-[14px] mb-2 flex items-center gap-1.5">
            <ExternalLink className="size-4 text-primary" /> Lien Google Avis
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">
            Proposé aux clients satisfaits sur la page QR pour les inciter à laisser un avis Google.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={googleUrl}
              onChange={(e) => setGoogleUrl(e.target.value)}
              placeholder="https://g.page/r/..."
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            />
            <button
              onClick={saveGoogleUrl}
              disabled={savingUrl}
              className="bg-primary text-primary-foreground rounded-xl px-4 font-semibold flex items-center gap-1.5 text-sm disabled:opacity-60"
            >
              {savingUrl ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3 pb-6">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        )}
        {!loading && reviews.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            Aucun avis pour le moment.
          </div>
        )}
        {reviews.map((r) => (
          <div
            key={r.id}
            className={`rounded-2xl border p-4 shadow-sm ${r.treated ? "bg-muted/30 border-border" : "bg-card border-border"}`}
          >
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center">
                <User className="size-4" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground text-[14px]">
                  {r.author ?? "Anonyme"}
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`size-3.5 ${i < r.rating ? "fill-warn text-warn" : "text-muted-foreground"}`}
                    />
                  ))}
                </div>
              </div>
              {!r.treated && (
                <button
                  onClick={() => archive(r.id)}
                  className="text-muted-foreground"
                  title="Archiver"
                >
                  <Archive className="size-4" />
                </button>
              )}
            </div>
            {r.comment && <p className="mt-2 text-[13px] text-foreground/80">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center shadow-sm">
      <div className="text-primary font-extrabold text-lg">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
