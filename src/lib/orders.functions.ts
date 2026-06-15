import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * SAFEGUARD — order creation invariant.
 *
 * 1. The `public.orders` table has NO INSERT grant for `authenticated` and NO
 *    RLS policy permitting INSERT. Only `service_role` can insert rows.
 * 2. The only code path that can call `service_role` is a server function or
 *    a server route handler, both of which require explicit human-written
 *    code. There is NO setInterval / setTimeout / cron / database trigger
 *    that creates orders. Verified by grep at audit time.
 * 3. This function is the SINGLE legitimate entry point for QR order
 *    creation. It validates:
 *      - the table UUID exists and is active,
 *      - every product belongs to the table's restaurant,
 *      - quantities are positive integers,
 *      - prices are recomputed server-side (never trusted from the client).
 * 4. Background simulators in `src/lib/notifications.tsx#useOrderSimulator`
 *    are no-ops (verified). Do not reintroduce them.
 */

const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        qty: z.number().int().min(1).max(50),
      }),
    )
    .min(1)
    .max(50),
});

export const createOrderForTable = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Validate the table.
    const { data: table } = await supabaseAdmin
      .from("tables")
      .select("id, restaurant_id, active")
      .eq("id", data.tableId)
      .maybeSingle();

    if (!table || !table.active) throw new Error("QR_NOT_FOUND");

    // 2) Load the requested products and confirm they all belong to this
    //    restaurant. This prevents a malicious client from referencing
    //    another restaurant's product ids.
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, price, restaurant_id, status")
      .in("id", productIds);

    if (!products || products.length !== productIds.length) {
      throw new Error("INVALID_PRODUCT");
    }
    for (const p of products) {
      if (p.restaurant_id !== table.restaurant_id) {
        throw new Error("CROSS_RESTAURANT_FORBIDDEN");
      }
      if (p.status !== "disponible") throw new Error("PRODUCT_UNAVAILABLE");
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const total = data.items.reduce((s, it) => {
      const p = productMap.get(it.productId)!;
      return s + Number(p.price) * it.qty;
    }, 0);

    // 3) Insert the order then its items.
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        restaurant_id: table.restaurant_id,
        table_id: table.id,
        total,
      })
      .select("id, number")
      .single();

    if (orderErr || !order) throw new Error("Order creation failed");

    const itemsPayload = data.items.map((it) => {
      const p = productMap.get(it.productId)!;
      return {
        order_id: order.id,
        product_id: p.id,
        qty: it.qty,
        unit_price: Number(p.price),
        product_name: p.name,
      };
    });

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemsPayload);

    if (itemsErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Order items creation failed");
    }

    return { orderId: order.id, number: order.number, total };
  });

/**
 * Server fn to leave a review. Same safeguard: anonymous clients cannot
 * insert directly into reviews — only this validated path.
 */
const CreateReviewSchema = z.object({
  tableId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  author: z.string().trim().max(80).optional(),
  comment: z.string().trim().max(500).optional(),
});

export const createReviewForTable = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateReviewSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: table } = await supabaseAdmin
      .from("tables")
      .select("id, restaurant_id, active")
      .eq("id", data.tableId)
      .maybeSingle();

    if (!table || !table.active) throw new Error("QR_NOT_FOUND");

    const { error } = await supabaseAdmin.from("reviews").insert({
      restaurant_id: table.restaurant_id,
      table_id: table.id,
      rating: data.rating,
      author: data.author ?? null,
      comment: data.comment ?? null,
    });

    if (error) throw new Error("Review creation failed");
    return { ok: true };
  });
