import { supabaseAdmin } from './src/config/supabaseAdmin.js';

async function fix() {
  console.log("Obteniendo productos...");
  const { data: productos, error: errProd } = await supabaseAdmin.from('productos').select('categoria_id');
  
  if (errProd) {
    console.error("Error:", errProd);
    return;
  }

  const uniqueCategoriaIds = [...new Set(productos.filter(p => p.categoria_id).map(p => p.categoria_id))];
  console.log("IDs de categoría huérfanos:", uniqueCategoriaIds);

  const mockNames = ["Cafetería", "Restaurante", "Bebidas", "Combos", "Postres", "Varios"];
  
  for (let i = 0; i < uniqueCategoriaIds.length; i++) {
    const id = uniqueCategoriaIds[i];
    const nombre = mockNames[i] || `Categoría ${i + 1}`;
    
    console.log(`Insertando categoría: ${nombre} (${id})`);
    
    const { error } = await supabaseAdmin.from('categorias').insert([{
      id,
      nombre,
      color: 'bg-[#1a1a1a]'
    }]);

    if (error) {
      console.error(`Error insertando ${id}:`, error.message);
    } else {
      console.log(`✅ Categoría ${nombre} insertada.`);
    }
  }
  
  console.log("¡Listo!");
}

fix();
