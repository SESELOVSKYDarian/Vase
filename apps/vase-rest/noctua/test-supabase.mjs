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
    .select('id, nombre, precio, categoria_id, stock, disponible, categorias(id, nombre)');

  if (error) {
    console.log("ERROR WITH JOIN:", error.message);

    // Fallback test
    const { data: d2, error: e2 } = await supabase.from('productos').select('*').limit(1);
    console.log("SCHEMA COLUMNS:", d2 && d2[0] ? Object.keys(d2[0]) : e2?.message);
  } else {
    console.log("SUCCESS!", data.length, "productos found");
  }
}

run();