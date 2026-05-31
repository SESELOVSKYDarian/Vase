import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO LIMPIEZA TOTAL DE BASE DE DATOS (VASE PLATFORM) ---');

  try {
    // 1. Eliminar todos los tenants
    // Esto debería eliminar en cascada memberships, projects, categories, etc., según schema.prisma
    console.log('Buscando tenants (y sus datos asociados en cascada) para eliminar...');
    const tenantsToDelete = await prisma.tenant.count();
    
    if (tenantsToDelete > 0) {
      const deletedTenants = await prisma.tenant.deleteMany({});
      console.log(`✅ Se eliminaron todos los tenants (${deletedTenants.count}) y sus datos en cascada correctamente.`);
    } else {
      console.log('ℹ️ No hay tenants para eliminar.');
    }

    // 2. Eliminar todos los usuarios
    console.log('Buscando todos los usuarios para eliminar...');
    const usersToDelete = await prisma.user.count();
    
    if (usersToDelete > 0) {
      const deletedUsers = await prisma.user.deleteMany({});
      console.log(`✅ Se eliminaron todos los usuarios (${deletedUsers.count}) correctamente.`);
    } else {
      console.log('ℹ️ No hay usuarios para eliminar.');
    }

    console.log('--- LIMPIEZA TOTAL COMPLETADA CON ÉXITO ---');
    console.log('La base de datos de Vase está ahora completamente vacía (sin tenants ni usuarios).');

  } catch (error) {
    console.error('❌ Ocurrió un error inesperado durante la limpieza:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
