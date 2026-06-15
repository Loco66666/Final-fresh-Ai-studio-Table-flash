import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
// 10 years signed URL — bucket is private; this is the cheapest way to embed
// in <img src> without re-signing on every render.
const SIGN_TTL_SECONDS = 60 * 60 * 24 * 365 * 10;

export async function uploadProductImage(restaurantId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (signErr || !data) throw signErr ?? new Error("Sign failed");
  return data.signedUrl;
}
