import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO LIMPIEZA DE BASE DE DATOS ---');

  // 1. Identificar el tenant 'vasescompany'
  const adminTenant = await prisma.tenant.findUnique({
    where: { slug: 'vasescompany' }
  });

  if (!adminTenant) {
    console.error('❌ Error: No se pudo encontrar el tenant administrador con slug "vasescompany".');
    console.error('Abortando la limpieza por seguridad.');
    process.exit(1);
  } else {
    console.log(`✅ Tenant administrador encontrado: ${adminTenant.name} (${adminTenant.slug})`);
  }

  // 2. Buscar usuarios que vamos a eliminar.
  // Vamos a eliminar a todos los usuarios que NO sean SUPER_ADMIN y que NO pertenezcan a vasescompany
  console.log('Buscando usuarios para eliminar...');
  
  const usersToDelete = await prisma.user.findMany({
    where: {
      AND: [
        {
          memberships: {
            none: {
              tenant: {
                slug: 'vasescompany'
              }
            }
          }
        },
        {
          platformRole: {
            not: 'SUPER_ADMIN'
          }
        }
      ]
    },
    select: {
      id: true,
      email: true
    }
  });

  console.log(`⚠️ Se encontraron ${usersToDelete.length} usuarios para eliminar.`);

  if (usersToDelete.length > 0) {
    const userIds = usersToDelete.map(u => u.id);
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { in: userIds }
      }
    });
    console.log(`✅ Se eliminaron ${deletedUsers.count} usuarios correctamente.`);
  }

  // 3. Buscar y eliminar tenants que NO sean vasescompany
  console.log('Buscando tenants (y sus datos asociados) para eliminar...');
  const tenantsToDelete = await prisma.tenant.count({
    where: {
      slug: { not: 'vasescompany' }
    }
  });

  console.log(`⚠️ Se encontraron ${tenantsToDelete} tenants para eliminar.`);

  if (tenantsToDelete > 0) {
    const deletedTenants = await prisma.tenant.deleteMany({
      where: {
        slug: { not: 'vasescompany' }
      }
    });
    console.log(`✅ Se eliminaron ${deletedTenants.count} tenants y sus datos en cascada correctamente.`);
  }

  console.log('--- LIMPIEZA COMPLETADA CON ÉXITO ---');
}

main()
  .catch(e => {
    console.error('❌ Ocurrió un error inesperado durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
