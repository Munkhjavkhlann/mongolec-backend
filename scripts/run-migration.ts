import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    console.log('Running migration: create merch_variants table');

    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "merch_variants" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sku" TEXT NOT NULL,
        "barcode" TEXT,
        "title" JSONB,
        "optionValues" JSONB NOT NULL,
        "price" DOUBLE PRECISION NOT NULL,
        "compareAtPrice" DOUBLE PRECISION,
        "costPrice" DOUBLE PRECISION,
        "inventory" INTEGER NOT NULL DEFAULT 0,
        "weight" DOUBLE PRECISION,
        "dimensions" JSONB,
        "image" TEXT,
        "position" INTEGER NOT NULL DEFAULT 0,
        "isAvailable" BOOLEAN NOT NULL DEFAULT true,
        "productId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deletedAt" TIMESTAMP(3),
        CONSTRAINT "merch_variants_productId_fkey" FOREIGN KEY ("productId")
          REFERENCES "merch_products"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      );
    `);
    console.log('✓ Created merch_variants table');

    // Create unique index for SKU
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "merch_variants_sku_productId_key"
      ON "merch_variants"("sku", "productId");
    `);
    console.log('✓ Created unique index on SKU');

    // Create productId index
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "merch_variants_productId_idx"
      ON "merch_variants"("productId");
    `);
    console.log('✓ Created index on productId');

    // Make SKU nullable in merch_products
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "merch_products" ALTER COLUMN "sku" DROP NOT NULL;
      `);
      console.log('✓ Made SKU nullable in merch_products');
    } catch (e: any) {
      if (e.message.includes('column "sku" of relation "merch_products" is already nullable')) {
        console.log('✓ SKU already nullable in merch_products');
      } else {
        throw e;
      }
    }

    console.log('\n✓ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
