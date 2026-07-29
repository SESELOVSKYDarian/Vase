import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('Faltan SUPABASE_URL, SUPABASE_ANON_KEY y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Test con anon key (lo que usa el frontend)
const supabaseAnon = createClient(
  supabaseUrl,
  supabaseAnonKey
);

// Test con service key (lo que usa el backend)
const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  { auth: { persistSession: false } }
);

async function run() {
  const { data: anonData, error: anonErr } = await supabaseAnon
    .from('pedidos')
    .select('id, estado')
    .limit(10);

  console.log('ANON SELECT:', anonErr?.message || `${anonData.length} pedidos encontrados`);

  const { data: adminData, error: adminErr } = await supabaseAdmin
    .from('pedidos')
    .select('id, estado')
    .limit(10);

  console.log('ADMIN SELECT:', adminErr?.message || `${adminData.length} pedidos encontrados`);
}

run();