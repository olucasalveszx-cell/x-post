import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export const VIDEOS_BUCKET = "videos";

export async function ensureVideosBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === VIDEOS_BUCKET);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(VIDEOS_BUCKET, {
      public: true,
      fileSizeLimit: 524288000, // 500MB
      allowedMimeTypes: ["video/mp4", "video/quicktime", "video/webm", "image/jpeg", "image/png", "image/webp"],
    });
  }
}
