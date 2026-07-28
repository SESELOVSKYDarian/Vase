import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, precio, categoria_id, stock, disponible, categorias(id, nombre)')
    .limit(3);

  if (error) {
    console.log("ERROR:", error.message);
  } else {
    console.log("DATA:", JSON.stringify(data, null, 2));
  }
}

run();