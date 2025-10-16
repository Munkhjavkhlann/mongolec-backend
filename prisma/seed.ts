import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed script for initial database setup
 * Creates default tenant, roles, permissions, and admin user
 */
async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create default tenant
    const defaultTenant = await prisma.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: {
        slug: 'default',
        name: 'Default Tenant',
        status: 'ACTIVE',
        plan: 'PRO',
        config: {
          timezone: 'UTC',
          locale: 'en',
          features: {
            cms: true,
            analytics: true,
            customDomain: false,
            api: true,
          },
          limits: {
            users: 100,
            storage: 10 * 1024 * 1024 * 1024, // 10GB
            apiCalls: 100000,
          },
          customization: {
            theme: 'default',
          },
        },
      },
    });

    console.log(`✅ Created default tenant: ${defaultTenant.id}`);

    // Create default permissions
    const permissions = [
      // User management
      { resource: 'user', action: 'create', name: 'Create Users' },
      { resource: 'user', action: 'read', name: 'Read Users' },
      { resource: 'user', action: 'update', name: 'Update Users' },
      { resource: 'user', action: 'delete', name: 'Delete Users' },

      // Role management
      { resource: 'role', action: 'create', name: 'Create Roles' },
      { resource: 'role', action: 'read', name: 'Read Roles' },
      { resource: 'role', action: 'update', name: 'Update Roles' },
      { resource: 'role', action: 'delete', name: 'Delete Roles' },

      // Content management
      { resource: 'content', action: 'create', name: 'Create Content' },
      { resource: 'content', action: 'read', name: 'Read Content' },
      { resource: 'content', action: 'update', name: 'Update Content' },
      { resource: 'content', action: 'delete', name: 'Delete Content' },
      { resource: 'content', action: 'publish', name: 'Publish Content' },

      // Media management
      { resource: 'media', action: 'create', name: 'Upload Media' },
      { resource: 'media', action: 'read', name: 'Read Media' },
      { resource: 'media', action: 'update', name: 'Update Media' },
      { resource: 'media', action: 'delete', name: 'Delete Media' },

      // Settings management
      { resource: 'settings', action: 'read', name: 'Read Settings' },
      { resource: 'settings', action: 'update', name: 'Update Settings' },

      // Analytics
      { resource: 'analytics', action: 'read', name: 'Read Analytics' },

      // API management
      { resource: 'api', action: 'manage', name: 'Manage API Tokens' },

      // Webhook management
      { resource: 'webhook', action: 'manage', name: 'Manage Webhooks' },
    ];

    const createdPermissions = [];
    for (const perm of permissions) {
      const permission = await prisma.permission.upsert({
        where: {
          resource_action_tenantId: {
            resource: perm.resource,
            action: perm.action,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          name: perm.name,
          resource: perm.resource,
          action: perm.action,
          tenantId: defaultTenant.id,
          description: `Permission to ${perm.action} ${perm.resource}`,
        },
      });
      createdPermissions.push(permission);
    }

    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Create default roles
    const superAdminRole = await prisma.role.upsert({
      where: {
        name_tenantId: {
          name: 'super_admin',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        name: 'super_admin',
        description: 'Super Administrator with all permissions',
        isSystem: true,
        tenantId: defaultTenant.id,
      },
    });

    const adminRole = await prisma.role.upsert({
      where: {
        name_tenantId: {
          name: 'admin',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        name: 'admin',
        description: 'Administrator with most permissions',
        isSystem: true,
        tenantId: defaultTenant.id,
      },
    });

    const editorRole = await prisma.role.upsert({
      where: {
        name_tenantId: {
          name: 'editor',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        name: 'editor',
        description: 'Content editor with content management permissions',
        isSystem: true,
        tenantId: defaultTenant.id,
      },
    });

    const authorRole = await prisma.role.upsert({
      where: {
        name_tenantId: {
          name: 'author',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        name: 'author',
        description: 'Content author with limited content permissions',
        isSystem: true,
        tenantId: defaultTenant.id,
      },
    });

    console.log('✅ Created default roles');

    // Assign permissions to roles
    // Super Admin gets all permissions
    for (const permission of createdPermissions) {
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

    // Admin gets most permissions (excluding super admin features)
    const adminPermissions = createdPermissions.filter(
      p => !['api:manage', 'webhook:manage'].includes(`${p.resource}:${p.action}`)
    );
    for (const permission of adminPermissions) {
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

    // Editor gets content and media permissions
    const editorPermissions = createdPermissions.filter(p =>
      ['content', 'media'].includes(p.resource)
    );
    for (const permission of editorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: editorRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: editorRole.id,
          permissionId: permission.id,
        },
      });
    }

    // Author gets limited content permissions
    const authorPermissions = createdPermissions.filter(
      p => p.resource === 'content' && ['create', 'read', 'update'].includes(p.action)
    );
    for (const permission of authorPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: authorRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: authorRole.id,
          permissionId: permission.id,
        },
      });
    }

    console.log('✅ Assigned permissions to roles');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await prisma.user.upsert({
      where: {
        email_tenantId: {
          email: 'admin@mongolec.com',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        email: 'admin@mongolec.com',
        firstName: 'System',
        lastName: 'Administrator',
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        tenantId: defaultTenant.id,
        metadata: {
          source: 'seed',
          createdBy: 'system',
        },
      },
    });

    // Assign super admin role to admin user
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
        assignedBy: adminUser.id,
      },
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create some default settings
    const settings = [
      { key: 'site_title', value: 'Mongolec CMS', type: 'STRING', description: 'Site title' },
      {
        key: 'site_description',
        value: 'Multi-tenant Content Management System',
        type: 'STRING',
        description: 'Site description',
      },
      {
        key: 'maintenance_mode',
        value: false,
        type: 'BOOLEAN',
        description: 'Enable maintenance mode',
      },
      {
        key: 'registration_enabled',
        value: true,
        type: 'BOOLEAN',
        description: 'Allow user registration',
      },
      {
        key: 'email_verification_required',
        value: true,
        type: 'BOOLEAN',
        description: 'Require email verification',
      },
    ];

    for (const setting of settings) {
      await prisma.setting.upsert({
        where: {
          key_tenantId: {
            key: setting.key,
            tenantId: defaultTenant.id,
          },
        },
        update: {},
        create: {
          key: setting.key,
          value: setting.value,
          type: setting.type as any,
          description: setting.description,
          isPublic: ['site_title', 'site_description'].includes(setting.key),
          tenantId: defaultTenant.id,
        },
      });
    }

    console.log('✅ Created default settings');

    // Create some sample content
    const samplePage = await prisma.content.upsert({
      where: {
        slug_tenantId: {
          slug: 'welcome',
          tenantId: defaultTenant.id,
        },
      },
      update: {},
      create: {
        title: 'Welcome to Mongolec CMS',
        slug: 'welcome',
        type: 'PAGE',
        status: 'PUBLISHED',
        content: {
          blocks: [
            {
              type: 'heading',
              data: {
                text: 'Welcome to Mongolec CMS',
                level: 1,
              },
            },
            {
              type: 'paragraph',
              data: {
                text: 'This is a multi-tenant content management system built with GraphQL, TypeScript, and Prisma.',
              },
            },
          ],
        },
        excerpt: 'Welcome page for the CMS',
        publishedAt: new Date(),
        tenantId: defaultTenant.id,
        createdById: adminUser.id,
      },
    });

    console.log(`✅ Created sample content: ${samplePage.title}`);

    console.log('🎉 Database seed completed successfully!');
    console.log('');
    console.log('Default admin credentials:');
    console.log('Email: admin@mongolec.com');
    console.log('Password: admin123');
    console.log('');
    console.log('⚠️  Remember to change the admin password in production!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seed().catch(error => {
  console.error(error);
  process.exit(1);
});
