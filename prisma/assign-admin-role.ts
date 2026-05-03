import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET_EMAIL = 'munkhjavkhlan@mongolec.org';

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: TARGET_EMAIL },
    include: {
      tenant: true,
      roles: { include: { role: true } },
    },
  });

  if (!user) {
    console.log(`User ${TARGET_EMAIL} not found`);
    return;
  }

  console.log(`Found user: ${user.email} (tenant: ${user.tenant.name})`);
  console.log(`Current roles: ${user.roles.map(r => r.role.name).join(', ') || 'none'}`);

  const superAdminRole = await prisma.role.findFirst({
    where: { name: 'super_admin', tenantId: user.tenantId },
  });

  if (!superAdminRole) {
    console.log('No super_admin role found for this tenant');
    return;
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id,
      assignedBy: user.id,
    },
  });

  console.log(`✅ Assigned super_admin role to ${TARGET_EMAIL}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
