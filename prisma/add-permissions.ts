import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MISSING_PERMISSIONS = [
  // Merch management
  { resource: 'merch', action: 'create', name: 'Create Merch Products' },
  { resource: 'merch', action: 'read', name: 'Read Merch Products' },
  { resource: 'merch', action: 'update', name: 'Update Merch Products' },
  { resource: 'merch', action: 'delete', name: 'Delete Merch Products' },
  { resource: 'merch', action: 'category:create', name: 'Create Merch Categories' },
  { resource: 'merch', action: 'category:update', name: 'Update Merch Categories' },
  { resource: 'merch', action: 'category:delete', name: 'Delete Merch Categories' },

  // News management
  { resource: 'news', action: 'create', name: 'Create News Articles' },
  { resource: 'news', action: 'read', name: 'Read News Articles' },
  { resource: 'news', action: 'update', name: 'Update News Articles' },
  { resource: 'news', action: 'delete', name: 'Delete News Articles' },
  { resource: 'news', action: 'publish', name: 'Publish News Articles' },
  { resource: 'news', action: 'category:create', name: 'Create News Categories' },
  { resource: 'news', action: 'category:update', name: 'Update News Categories' },
  { resource: 'news', action: 'category:delete', name: 'Delete News Categories' },

  // User management extras
  { resource: 'user', action: 'manage', name: 'Manage Users (approve/reject)' },

  // Rally management
  { resource: 'rally', action: 'create', name: 'Create Rallies' },
  { resource: 'rally', action: 'read', name: 'Read Rallies' },
  { resource: 'rally', action: 'update', name: 'Update Rallies' },
  { resource: 'rally', action: 'delete', name: 'Delete Rallies' },
];

async function main() {
  const tenants = await prisma.tenant.findMany();

  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.name} (${tenant.id})`);

    const superAdminRole = await prisma.role.findFirst({
      where: { name: 'super_admin', tenantId: tenant.id },
    });
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin', tenantId: tenant.id },
    });

    for (const perm of MISSING_PERMISSIONS) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action_tenantId: {
            resource: perm.resource,
            action: perm.action,
            tenantId: tenant.id,
          },
        },
        update: {},
        create: {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          tenantId: tenant.id,
          description: `Permission to ${perm.action} ${perm.resource}`,
        },
      });

      if (superAdminRole) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
      }

      if (adminRole) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id,
          },
        });
      }
    }

    console.log(`  ✅ Added ${MISSING_PERMISSIONS.length} permissions to super_admin and admin roles`);
  }

  console.log('\n✅ Done! All missing permissions have been added.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
