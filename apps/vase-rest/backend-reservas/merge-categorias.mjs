import { supabaseAdmin } from './src/config/supabaseAdmin.js';

async function mergeCategories() {
  console.log("=== INICIANDO CONCILIACIÓN DE CATEGORÍAS ===");

  // 1. Obtener todas las categorías y productos
  const { data: categorias, error: errorCat } = await supabaseAdmin
    .from('categorias')
    .select('*');

  if (errorCat) {
    console.error("Error al obtener categorías:", errorCat);
    return;
  }

  const { data: productos, error: errorProd } = await supabaseAdmin
    .from('productos')
    .select('id, nombre, categoria_id');

  if (errorProd) {
    console.error("Error al obtener productos:", errorProd);
    return;
  }

  console.log(`Categorías encontradas: ${categorias.length}`);
  console.log(`Productos encontrados: ${productos.length}`);

  // Normalización de nombres para encontrar duplicados
  // Eliminamos tildes, convertimos a minúscula y recortamos espacios
  const normalize = (name) => {
    return name
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // Remueve acentos
  };

  // Agrupar categorías por su nombre normalizado
  const groups = {};
  for (const cat of categorias) {
    const key = normalize(cat.nombre);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(cat);
  }

  // Mapa de reemplazo de IDs (antiguo -> nuevo)
  const idReplacements = {};
  const categoriesToKeep = [];
  const categoriesToDelete = [];

  // Definir nombres bonitos y colores para cada categoría principal
  const beautifiedCategories = {
    "cafeteria": { nombre: "Cafetería", color: "#eab308" }, // Amber
    "comida": { nombre: "Comida", color: "#ec4899" }, // Pink
    "bebidas": { nombre: "Bebidas", color: "#3b82f6" }, // Blue
    "postres": { nombre: "Postres", color: "#a855f7" }, // Purple
    "hamburguesas": { nombre: "Hamburguesas", color: "#22c55e" }, // Green
    "pizzas": { nombre: "Pizzas", color: "#f97316" } // Orange
  };

  for (const [key, catList] of Object.entries(groups)) {
    // Si hay más de una categoría con el mismo nombre normalizado, elegimos una como "principal"
    // Preferimos la que tenga la primera letra mayúscula, tenga un color asignado, o simplemente la primera.
    catList.sort((a, b) => {
      const aHasColor = !!a.color;
      const bHasColor = !!b.color;
      if (aHasColor && !bHasColor) return -1;
      if (!aHasColor && bHasColor) return 1;
      
      const aIsCapitalized = a.nombre[0] === a.nombre[0].toUpperCase();
      const bIsCapitalized = b.nombre[0] === b.nombre[0].toUpperCase();
      if (aIsCapitalized && !bIsCapitalized) return -1;
      if (!aIsCapitalized && bIsCapitalized) return 1;

      return 0;
    });

    const primary = catList[0];
    const beautified = beautifiedCategories[key] || { nombre: primary.nombre.charAt(0).toUpperCase() + primary.nombre.slice(1), color: primary.color || '#6b7280' };

    console.log(`Grupo [${key}]:`);
    console.log(`  -> Principal: ${primary.nombre} (${primary.id}) con color ${primary.color}`);

    // Si el nombre actual no está embellecido o no tiene color, lo actualizamos
    if (primary.nombre !== beautified.nombre || !primary.color) {
      console.log(`  -> Actualizando principal a: "${beautified.nombre}" con color ${beautified.color}`);
      const { error: updateError } = await supabaseAdmin
        .from('categorias')
        .update({ nombre: beautified.nombre, color: beautified.color })
        .eq('id', primary.id);

      if (updateError) {
        console.error(`  ❌ Error actualizando categoría principal:`, updateError.message);
      }
    }

    categoriesToKeep.push(primary.id);

    // Los demás en la lista son duplicados que serán eliminados y sus productos reasignados
    for (let i = 1; i < catList.length; i++) {
      const duplicate = catList[i];
      console.log(`  -> Duplicada a eliminar: ${duplicate.nombre} (${duplicate.id})`);
      idReplacements[duplicate.id] = primary.id;
      categoriesToDelete.push(duplicate);
    }
  }

  // 2. Reasignar productos de categorías duplicadas a las principales
  for (const [oldId, newId] of Object.entries(idReplacements)) {
    const productsToUpdate = productos.filter(p => p.categoria_id === oldId);
    if (productsToUpdate.length > 0) {
      console.log(`Reasignando ${productsToUpdate.length} productos del ID antiguo ${oldId} al nuevo ${newId}...`);
      for (const prod of productsToUpdate) {
        console.log(`  - Reasignando: ${prod.nombre} (${prod.id})`);
      }
      
      const { error: updateProdError } = await supabaseAdmin
        .from('productos')
        .update({ categoria_id: newId })
        .eq('categoria_id', oldId);

      if (updateProdError) {
        console.error(`❌ Error al reasignar productos:`, updateProdError.message);
      } else {
        console.log(`✅ Productos reasignados correctamente.`);
      }
    }
  }

  // 3. Eliminar categorías duplicadas de la base de datos
  for (const catToDelete of categoriesToDelete) {
    console.log(`Eliminando categoría duplicada: ${catToDelete.nombre} (${catToDelete.id})...`);
    const { error: deleteError } = await supabaseAdmin
      .from('categorias')
      .delete()
      .eq('id', catToDelete.id);

    if (deleteError) {
      console.error(`❌ Error al eliminar categoría ${catToDelete.id}:`, deleteError.message);
    } else {
      console.log(`✅ Categoría eliminada.`);
    }
  }

  console.log("=== CONCILIACIÓN DE CATEGORÍAS COMPLETADA CON ÉXITO ===");
}

mergeCategories();
