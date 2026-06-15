import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createMyRestaurant } from "@/lib/auth.functions";
import { PhoneFrame } from "@/components/PhoneFrame";
import { Loader2, Store } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useServerFn(createMyRestaurant);
  const [name, setName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await create({ data: { name, welcome_fr: welcome || undefined } });
      await qc.invalidateQueries({ queryKey: ["my-restaurant"] });
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setBusy(false);
    }
  }

  return (
    <PhoneFrame>
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <div className="size-14 rounded-2xl bg-primary-soft text-primary grid place-items-center mb-4">
          <Store className="size-7" />
        </div>
        <h1 className="font-display font-extrabold text-2xl text-foreground">
          Créer mon restaurant
        </h1>
        <p className="mt-2 text-muted-foreground text-sm">
          Quelques infos et c'est parti. Vous deviendrez automatiquement propriétaire.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground">Nom du restaurant</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">
              Message d'accueil (optionnel)
            </label>
            <input
              type="text"
              maxLength={200}
              value={welcome}
              onChange={(e) => setWelcome(e.target.value)}
              placeholder="Bienvenue, bonne dégustation !"
              className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy || name.trim().length < 2}
            className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            Créer mon restaurant
          </button>
        </form>
      </div>
    </PhoneFrame>
  );
}
