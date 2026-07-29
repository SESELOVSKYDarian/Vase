import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function run() {
  const { data, error } = await supabase
    .from("pedidos")
    .insert({
      mesa_id: "ced06afd-b878-409d-84c2-6fe7991b7de0", // dummy uuid
      numero_mesa: 1,
      zona: "salon",
      personas: 2,
      total: 100,
      estado: "pendiente",
    })
    .select();

  if (error) {
    console.log("INSERT ERROR:", error.message);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}

run();