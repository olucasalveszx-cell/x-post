import { createClient } from "@supabase/supabase-js";

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL  ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function assertSupabaseConfigured() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase não configurado. Adicione NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do Vercel e faça um novo deploy."
    );
  }
}

// Admin client — uses service role key, bypasses RLS.
// NEVER expose this on the client side.
export const supabaseAdmin = createClient(supabaseUrl || "https://placeholder.supabase.co", serviceRoleKey || "placeholder", {
  auth: { persistSession: false },
});
