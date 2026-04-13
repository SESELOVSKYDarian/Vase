import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for backend operations (admin rights / bot) - Use cautiously!
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
