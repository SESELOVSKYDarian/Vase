import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

// Cliente con service role usado solo en backend para operaciones de Supabase.
export const supabaseAdmin = createClient(
  env.supabaseUrl,
  env.supabaseServiceRoleKey
);
