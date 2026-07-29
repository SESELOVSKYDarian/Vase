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

async function fix() {
  console.log("Obteniendo productos...");
  const { data: productos, error: errProd } = await supabase.from('productos').select('categoria_id');

  if (errProd) {
    console.error("Error:", errProd);
    return;
  }

  const uniqueCategoriaIds = [...new Set(productos.filter(p => p.categoria_id).map(p => p.categoria_id))];
  console.log("IDs de categoria huerfanos:", uniqueCategoriaIds);

  const mockNames = ["Cafeteria", "Restaurante", "Bebidas", "Combos", "Postres", "Varios"];

  for (let i = 0; i < uniqueCategoriaIds.length; i++) {
    const id = uniqueCategoriaIds[i];
    const nombre = mockNames[i] || `Categoria ${i + 1}`;

    console.log(`Insertando categoria: ${nombre} (${id})`);

    const { error } = await supabase.from('categorias').insert([{
      id,
      nombre,
      color: 'bg-[#1a1a1a]'
    }]);

    if (error) {
      console.error(`Error insertando ${id}:`, error.message);
    } else {
      console.log(`Categoria ${nombre} insertada.`);
    }
  }

  console.log("Listo!");
}

fix();