import { createClient } from "@supabase/supabase-js";

const supabaseUrl      = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? "";
const serviceRoleKey   = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("[supabase] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados");
}

// Admin client — uses service role key, bypasses RLS.
// NEVER expose this on the client side.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
