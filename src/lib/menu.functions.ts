import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public server function — strict QR → restaurant lookup.
 *
 * Security model:
 * - Anonymous clients have ZERO direct database access (no RLS policies for anon).
 * - This server fn validates the table UUID, then loads ONLY the restaurant
 *   that owns that table. A QR cannot reveal another restaurant's data.
 * - Returns 404-shaped error if table missing or inactive.
 * - Uses admin client server-side only; never exposed to browser.
 */

const TableParamSchema = z.object({
  tableId: z.string().uuid("Invalid QR code"),
});

export type MenuPayload = {
  restaurant: {
    id: string;
    name: string;
    welcome_fr: string | null;
    welcome_en: string | null;
    welcome_es: string | null;
    logo_url: string | null;
  };
  table: { id: string; label: string; zone: string };
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string | null;
    allergens: string[];
    badges: string[];
    translations: {
      en?: { name?: string; description?: string };
      es?: { name?: string; description?: string };
    };
  }>;
};

export const getMenuForTable = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => TableParamSchema.parse(input))
  .handler(async ({ data }): Promise<MenuPayload> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Strict QR lookup: find the table, get ONLY its restaurant_id.
    const { data: table, error: tableErr } = await supabaseAdmin
      .from("tables")
      .select("id, label, zone, active, restaurant_id")
      .eq("id", data.tableId)
      .maybeSingle();

    if (tableErr) throw new Error("Lookup failed");
    if (!table || !table.active) {
      throw new Error("QR_NOT_FOUND");
    }

    const restaurantId = table.restaurant_id;

    // 2) Load restaurant scoped strictly to that id.
    const { data: restaurant, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, welcome_fr, welcome_en, welcome_es, logo_url")
      .eq("id", restaurantId)
      .maybeSingle();

    if (restErr || !restaurant) throw new Error("QR_NOT_FOUND");

    // 3) Load products scoped strictly to that restaurant + available only.
    const { data: products, error: prodErr } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, description, price, category, image_url, allergens, badges, translations, position",
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "disponible")
      .order("position", { ascending: true })
      .order("name", { ascending: true });

    if (prodErr) throw new Error("Lookup failed");

    return {
      restaurant,
      table: { id: table.id, label: table.label, zone: table.zone as string },
      products: (products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        price: Number(p.price),
        category: p.category,
        image_url: p.image_url,
        allergens: p.allergens ?? [],
        badges: p.badges ?? [],
        translations: (p.translations ?? {}) as MenuPayload["products"][number]["translations"],
      })),
    };
  });
