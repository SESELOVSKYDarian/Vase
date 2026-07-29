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
    .from('categorias')
    .select('id, nombre, color')
    .order('nombre');

  if (error) {
    console.log("ERROR CATEGORIAS:", error.message);
  } else {
    console.log("CATEGORIAS:", JSON.stringify(data, null, 2));
  }
}

run();