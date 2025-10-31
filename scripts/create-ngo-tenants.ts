import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to create the 4 NGO tenants
 * Run with: npx ts-node -r tsconfig-paths/register scripts/create-ngo-tenants.ts
 */
async function createNGOTenants() {
  try {
    console.log('🌱 Creating NGO tenants...\n');

    const tenants = [
      {
        name: 'Mongol Ecology Center',
        slug: 'mec',
        status: 'ACTIVE' as const,
        plan: 'PRO' as const,
      },
      {
        name: 'Rally For Rangers',
        slug: 'rally-for-rangers',
        status: 'ACTIVE' as const,
        plan: 'PRO' as const,
      },
      {
        name: 'National Park Academy',
        slug: 'npa',
        status: 'ACTIVE' as const,
        plan: 'PRO' as const,
      },
      {
        name: 'Youth Sustainability Corps',
        slug: 'ysc',
        status: 'ACTIVE' as const,
        plan: 'PRO' as const,
      },
    ];

    for (const tenantData of tenants) {
      const tenant = await prisma.tenant.upsert({
        where: { slug: tenantData.slug },
        update: {
          name: tenantData.name,
          status: tenantData.status,
          plan: tenantData.plan,
        },
        create: {
          ...tenantData,
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
          },
        },
      });

      console.log(`✅ Created/Updated tenant: ${tenant.name} (${tenant.slug})`);
    }

    // Delete the default tenant
    const defaultTenant = await prisma.tenant.findUnique({
      where: { slug: 'default' },
    });

    if (defaultTenant) {
      await prisma.tenant.delete({
        where: { slug: 'default' },
      });
      console.log('\n🗑️  Deleted default tenant');
    }

    console.log('\n🎉 NGO tenants created successfully!');
    console.log('\nTenants:');
    console.log('1. Mongol Ecology Center (mec)');
    console.log('2. Rally For Rangers (rally-for-rangers)');
    console.log('3. National Park Academy (npa)');
    console.log('4. Youth Sustainability Corps (ysc)');
  } catch (error) {
    console.error('❌ Error creating tenants:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createNGOTenants().catch((error) => {
  console.error(error);
  process.exit(1);
});
