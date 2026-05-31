import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING DRY RUN ---');

  // 1. Find the 'vasescompany' tenant
  const adminTenant = await prisma.tenant.findUnique({
    where: { slug: 'vasescompany' }
  });

  if (!adminTenant) {
    console.log('Could not find tenant with slug "vasescompany".');
  } else {
    console.log(`Found admin tenant: ${adminTenant.name} (${adminTenant.slug})`);
  }

  // 2. Count tenants to delete
  const tenantsToDelete = await prisma.tenant.count({
    where: {
      slug: { not: 'vasescompany' }
    }
  });
  console.log(`Tenants to delete: ${tenantsToDelete}`);

  // 3. Count users to delete
  // We want to keep users who are either part of vasescompany OR are SUPER_ADMIN (just to be safe)
  const usersToDelete = await prisma.user.count({
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
    }
  });
  console.log(`Users to delete (not in vasescompany and not SUPER_ADMIN): ${usersToDelete}`);

  console.log('--- END DRY RUN ---');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
