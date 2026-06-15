import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";

// Les catégories sont désormais libres : chaque restaurant gère les siennes
// dans `menu_categories`. L'import via IA crée à la volée les catégories
// manquantes côté front (cf. _app.menu.tsx → ensureCategory).

const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024; // ~12MB base64 (~8MB binaire)
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const InputSchema = z.object({
  fileDataUrl: z
    .string()
    .min(20)
    .max(MAX_PAYLOAD_BYTES, "Fichier trop volumineux (max 8 Mo)")
    .refine((s) => s.startsWith("data:"), "Format de fichier invalide"),
  mimeType: z
    .string()
    .refine(
      (m) => ALLOWED_MIME.includes(m),
      "Format non supporté. Utilisez JPG, PNG, WEBP ou PDF.",
    ),
});

export type ScannedProduct = {
  name: string;
  description: string;
  price: number;
  category: string;
};

export const scanMenu = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<{ products: ScannedProduct[] }> => {
    const key = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!key && !geminiKey) {
      throw new Error("Aucune clé API (OpenAI ou Gemini) n'est configurée pour l'IA.");
    }

    const isPdf = data.mimeType === "application/pdf";
    const base64 = data.fileDataUrl.includes(",")
      ? data.fileDataUrl.split(",")[1]
      : data.fileDataUrl;

    const systemPrompt = `Tu es un OCR expert spécialisé dans les cartes de restaurant. Ton unique mission : retranscrire FIDÈLEMENT ce qui est ÉCRIT sur le document, sans rien inventer.

PROCESSUS OBLIGATOIRE (suis-le mentalement avant de répondre) :
1. Balaye le document zone par zone, de haut en bas, de gauche à droite. Lis CHAQUE ligne lentement, comme si tu zoomais dessus.
2. Identifie les sections/catégories visibles (titres, encadrés, séparateurs).
3. Pour chaque plat, repère exactement : son nom, sa description (si présente), son prix (si présent).
4. Avant d'inclure un plat, vérifie qu'il est RÉELLEMENT visible sur le document. Si tu hésites, EXCLUS-LE.
5. Re-scanne une seconde fois pour t'assurer qu'aucun plat affiché n'a été oublié, et qu'aucun plat inventé n'a été ajouté.

FORMAT DE RÉPONSE — JSON strict UNIQUEMENT :
{"products":[{"name":"string","description":"string","price":number,"category":"string"}]}

RÈGLES ABSOLUES (fiabilité 99%) :
- INTERDICTION TOTALE d'inventer : aucun plat, ingrédient, garniture, cuisson, accompagnement, origine ou détail qui ne soit pas LITTÉRALEMENT écrit sur le document.
- Si un mot est illisible ou ambigu, ne le devine pas : recopie ce que tu vois ou exclus le plat.
- "name" : copie EXACTEMENT le nom imprimé sur la carte (respecte la casse d'origine si possible, corrige uniquement les fautes de frappe ÉVIDENTES type lettre manquante).
- "price" : nombre en euros (ex : 12.5). Si aucun prix n'est imprimé pour ce plat → 0. Ne déduis JAMAIS un prix.
- "category" : utilise le nom de section RÉELLEMENT imprimé sur la carte ("Entrées", "Pizzas", "Desserts"...). Si aucune section n'est visible, mets "Autres". Ne crée pas de catégories fantaisistes.
- "description" :
  • Si la carte donne une description / liste d'ingrédients → recopie-la fidèlement (tu peux légèrement la reformuler pour la rendre fluide, mais SANS ajouter d'ingrédient ni de qualificatif non présent).
  • Si la carte ne donne AUCUNE description → laisse une chaîne vide "". N'invente rien à partir du seul nom.
  • Jamais d'emoji, de superlatif creux ("le meilleur"), de prix, ni de mention marketing absente du document.
- Doublons : si un plat apparaît plusieurs fois (ex : tailles différentes), ne le liste qu'une seule fois avec le prix le plus bas, sauf si les noms diffèrent clairement.
- Éléments non-plats (logo, adresse, horaires, mentions légales, allergènes seuls, "menu enfant" sans détail) → IGNORE.
- Document illisible, flou, ou ne contenant pas de carte → renvoie {"products":[]}.

Rappel : mieux vaut renvoyer 10 plats 100% exacts que 20 plats dont certains inventés.`;

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
        contents: [
          {
            inlineData: {
              mimeType: data.mimeType,
              data: base64,
            },
          },
          { text: systemPrompt },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              products: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    price: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                  },
                  required: ["name", "description", "price", "category"],
                },
              },
            },
          },
        },
      });

      const raw = response.text ?? "{}";
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

      let parsed: { products?: unknown };
      try {
        parsed = JSON.parse(cleanRaw);
      } catch {
        throw new Error("Réponse de l'IA illisible");
      }

      const parsePrice = (v: unknown): number => {
        if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.round(v * 100) / 100);
        if (typeof v !== "string") return 0;
        const cleaned = v
          .replace(/[€$£\s]/g, "")
          .replace(",", ".")
          .replace(/[^\d.]/g, "");
        const n = parseFloat(cleaned);
        return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
      };

      const ItemSchema = z.object({
        name: z.string().trim().min(1).max(120),
        description: z
          .string()
          .default("")
          .transform((s) => s.trim().slice(0, 500)),
        price: z.unknown().transform(parsePrice),
        category: z
          .string()
          .trim()
          .default("Autres")
          .transform((c) => (c && c.length <= 60 ? c : "Autres")),
      });
      const items = Array.isArray(parsed.products) ? parsed.products : [];
      const cleaned: ScannedProduct[] = items
        .map((p) => {
          const r = ItemSchema.safeParse(p);
          if (!r.success) return null;
          return r.data;
        })
        .filter((x): x is ScannedProduct => x !== null);

      return { products: cleaned };
    }

    const callOpenAI = async (attempt: number): Promise<Response> => {
      const isPdf = data.mimeType === "application/pdf";
      const base64 = data.fileDataUrl.includes(",")
        ? data.fileDataUrl.split(",")[1]
        : data.fileDataUrl;

      const contentBlock = isPdf
        ? {
            type: "file" as const,
            file: {
              filename: "menu.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
          }
        : {
            type: "image_url" as const,
            image_url: {
              url: `data:${data.mimeType};base64,${base64}`,
              detail: "high" as const,
            },
          };

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90_000);
      try {
        return await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: ctrl.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Lis attentivement cette carte ligne par ligne et extrais UNIQUEMENT les plats réellement imprimés dessus. N'invente rien.",
                  },
                  contentBlock,
                ],
              },
            ],
          }),
        });
      } catch (err) {
        if (attempt < 2 && (err as Error).name === "AbortError") {
          return callOpenAI(attempt + 1);
        }
        throw new Error("OpenAI n'a pas répondu à temps. Réessaie avec une photo plus légère.");
      } finally {
        clearTimeout(t);
      }
    };

    let res = await callOpenAI(0);
    // Retry once on transient 5xx / 429
    if ((res.status >= 500 || res.status === 429) && res.status !== 401) {
      await new Promise((r) => setTimeout(r, 800));
      res = await callOpenAI(1);
    }

    if (!res.ok) {
      const txt = await res.text();
      if (res.status === 429) throw new Error("Limite OpenAI atteinte, réessaie dans un instant.");
      if (res.status === 401) throw new Error("Clé OpenAI invalide.");
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

    let parsed: { products?: unknown };
    try {
      parsed = JSON.parse(cleanRaw);
    } catch {
      throw new Error("Réponse OpenAI illisible");
    }

    // Normalisation prix: "12,50 €", "€12.50", "12.5" → 12.5
    const parsePrice = (v: unknown): number => {
      if (typeof v === "number" && isFinite(v)) return Math.max(0, Math.round(v * 100) / 100);
      if (typeof v !== "string") return 0;
      const cleaned = v
        .replace(/[€$£\s]/g, "")
        .replace(",", ".")
        .replace(/[^\d.]/g, "");
      const n = parseFloat(cleaned);
      return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
    };

    const ItemSchema = z.object({
      name: z.string().trim().min(1).max(120),
      description: z
        .string()
        .default("")
        .transform((s) => s.trim().slice(0, 500)),
      price: z.unknown().transform(parsePrice),
      category: z
        .string()
        .trim()
        .default("Autres")
        .transform((c) => (c && c.length <= 60 ? c : "Autres")),
    });
    const items = Array.isArray(parsed.products) ? parsed.products : [];
    const cleaned: ScannedProduct[] = items
      .map((p) => {
        const r = ItemSchema.safeParse(p);
        if (!r.success) return null;
        return r.data;
      })
      .filter((x): x is ScannedProduct => x !== null);

    return { products: cleaned };
  });
