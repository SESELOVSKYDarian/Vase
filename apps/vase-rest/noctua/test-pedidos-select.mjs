import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  // Let's see what columns exist in pedidos. We can do an insert of just mesa_id
  const { data, error } = await supabase
    .from("pedidos")
    .select("id, mesa_id, total, estado, mesas(numero, zona, capacidad)");

  if (error) {
    console.log("SELECT ERROR:", error.message);
  } else {
    console.log("SELECT SUCCESS:", JSON.stringify(data.slice(0, 2), null, 2));
  }
}

run();