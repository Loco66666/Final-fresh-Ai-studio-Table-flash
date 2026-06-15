import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";

const ItemInput = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(160),
  currentDescription: z.string().trim().max(800).default(""),
  category: z.string().trim().max(80).default(""),
  allergens: z.array(z.string().trim().max(40)).max(30).default([]),
});

const ToneEnum = z.enum(["gourmand", "premium", "familial"]);

const InputSchema = z.object({
  items: z.array(ItemInput).min(1).max(40),
  tone: ToneEnum.default("gourmand"),
  maxLength: z.number().int().min(60).max(240).default(140),
});

export type EnhanceTone = z.infer<typeof ToneEnum>;
export type EnhanceItemInput = z.infer<typeof ItemInput>;
export type EnhanceResult = { id: string; suggested: string };

const TONE_HINTS: Record<EnhanceTone, string> = {
  gourmand:
    "Ton chaleureux et gourmand. Vocabulaire évocateur (fondant, croustillant, parfumé, généreux, maison) mais sobre.",
  premium:
    "Ton raffiné et élégant, légèrement gastronomique. Évite les superlatifs creux et les mots trop familiers.",
  familial:
    "Ton simple, rassurant et chaleureux, accessible à tous. Phrases claires, sans jargon culinaire.",
};

export const enhanceDescriptions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ results: EnhanceResult[] }> => {
    const key = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!key && !geminiKey) {
      throw new Error("Aucune clé API (OpenAI ou Gemini) n'est configurée pour l'IA.");
    }

    const { items, tone, maxLength } = data;

    const system = `Tu réécris des descriptions de plats pour la carte d'un restaurant.
${TONE_HINTS[tone]}

Règles ABSOLUMENT strictes :
- Tu te bases UNIQUEMENT sur le nom du plat et la description actuelle fournis.
- Tu n'inventes JAMAIS d'ingrédient, de garniture, de cuisson, d'accompagnement, d'origine, de label ou de provenance non mentionnés.
- Tu ne modifies JAMAIS la liste d'ingrédients ni les allergènes : si un ingrédient n'est pas mentionné, il n'apparaît pas.
- Si la description actuelle est vide ou trop pauvre pour reformuler sans inventer, écris une phrase neutre et appétissante basée uniquement sur ce que le nom implique CLAIREMENT (ex: "Pizza Margherita" → base tomate, mozzarella, basilic seulement si évident pour ce plat universel ; sinon reste générique).
- Pas d'emojis, pas de prix, pas de superlatifs creux ("le meilleur", "incroyable").
- Longueur MAX ${maxLength} caractères, idéalement 1 phrase fluide.
- Français correct, sans guillemets autour de la phrase.

Réponds UNIQUEMENT en JSON valide de la forme :
{"results":[{"id":"...","suggested":"..."}]}
Un objet par item d'entrée, dans le même ordre, en réutilisant l'id fourni.`;

    const userPayload = {
      tone,
      maxLength,
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        currentDescription: it.currentDescription,
        category: it.category,
        allergens: it.allergens,
      })),
    };

    if (!key && geminiKey) {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ text: system }, { text: JSON.stringify(userPayload) }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              results: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    suggested: { type: Type.STRING },
                  },
                  required: ["id", "suggested"],
                },
              },
            },
          },
        },
      });

      const rawContent = response.text ?? "{}";
      let cleanRaw = rawContent.trim();
      if (cleanRaw.startsWith("```json")) {
        cleanRaw = cleanRaw.substring(7);
      } else if (cleanRaw.startsWith("```")) {
        cleanRaw = cleanRaw.substring(3);
      }
      if (cleanRaw.endsWith("```")) {
        cleanRaw = cleanRaw.substring(0, cleanRaw.length - 3);
      }
      cleanRaw = cleanRaw.trim();

      let parsed: { results?: unknown };
      try {
        parsed = JSON.parse(cleanRaw);
      } catch {
        throw new Error("Réponse de l'IA illisible");
      }

      const ResultSchema = z.object({
        id: z.string().min(1),
        suggested: z
          .string()
          .trim()
          .min(1)
          .transform((s) =>
            s
              .replace(/^["«»]|["«»]$/g, "")
              .trim()
              .slice(0, maxLength),
          ),
      });
      const arr = Array.isArray(parsed.results) ? parsed.results : [];
      const known = new Set(items.map((i) => i.id));
      const results: EnhanceResult[] = arr
        .map((r) => {
          const p = ResultSchema.safeParse(r);
          return p.success && known.has(p.data.id) ? p.data : null;
        })
        .filter((x): x is EnhanceResult => x !== null);

      return { results };
    }

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.7,
          messages: [
            { role: "system", content: system },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        }),
      });
    } catch (err) {
      throw new Error(
        (err as Error).name === "AbortError"
          ? "OpenAI n'a pas répondu à temps. Réessayez."
          : "Échec d'appel OpenAI",
      );
    } finally {
      clearTimeout(t);
    }

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 401) throw new Error("Clé OpenAI invalide.");
      if (res.status === 429) throw new Error("Limite OpenAI atteinte, réessayez dans un instant.");
      throw new Error(`OpenAI error: ${res.status} ${txt.slice(0, 200)}`);
    }

    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let cleanRaw = raw.trim();
    if (cleanRaw.startsWith("```json")) {
      cleanRaw = cleanRaw.substring(7);
    } else if (cleanRaw.startsWith("```")) {
      cleanRaw = cleanRaw.substring(3);
    }
    if (cleanRaw.endsWith("```")) {
      cleanRaw = cleanRaw.substring(0, cleanRaw.length - 3);
    }
    cleanRaw = cleanRaw.trim();

    let parsed: { results?: unknown };
    try {
      parsed = JSON.parse(cleanRaw);
    } catch {
      throw new Error("Réponse OpenAI illisible");
    }

    const ResultSchema = z.object({
      id: z.string().min(1),
      suggested: z
        .string()
        .trim()
        .min(1)
        .transform((s) =>
          s
            .replace(/^["«»]|["«»]$/g, "")
            .trim()
            .slice(0, maxLength),
        ),
    });
    const arr = Array.isArray(parsed.results) ? parsed.results : [];
    const known = new Set(items.map((i) => i.id));
    const results: EnhanceResult[] = arr
      .map((r) => {
        const p = ResultSchema.safeParse(r);
        return p.success && known.has(p.data.id) ? p.data : null;
      })
      .filter((x): x is EnhanceResult => x !== null);

    return { results };
  });
