import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  // Keep the app runnable in dev without Supabase configured.
  // Pages that need data should handle missing env and show an ErrorState.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env vars missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
