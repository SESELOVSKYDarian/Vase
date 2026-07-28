import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Usamos service role igual que el backend, leido desde variables de entorno.
const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  { auth: { persistSession: false } }
);

async function run() {
  // Test 1: intentar con estado "abierto"
  const { data: d1, error: e1 } = await supabase
    .from("pedidos")
    .insert({ mesa_id: null, estado: "abierto", subtotal: 0, impuestos: 0, total: 0 })
    .select("id")
    .single();

  if (e1) {
    console.log("Estado 'abierto' FALLA:", e1.message);
  } else {
    console.log("Estado 'abierto' OK, id:", d1.id);
    // limpiar
    await supabase.from("pedidos").delete().eq("id", d1.id);
  }

  // Test 2: intentar con estado "pendiente"
  const { data: mesas } = await supabase.from("mesas").select("id").limit(1);
  if (!mesas?.length) return console.log("No hay mesas para probar");

  const { data: d2, error: e2 } = await supabase
    .from("pedidos")
    .insert({ mesa_id: mesas[0].id, estado: "pendiente", subtotal: 0, impuestos: 0, total: 0 })
    .select("id")
    .single();

  if (e2) {
    console.log("Estado 'pendiente' FALLA:", e2.message);
  } else {
    console.log("Estado 'pendiente' OK, id:", d2.id);
    // limpiar
    await supabase.from("pedidos").delete().eq("id", d2.id);
  }
}

run();