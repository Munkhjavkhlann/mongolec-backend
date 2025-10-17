-- Create merch_variants table only
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

-- Create unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'merch_variants_sku_productId_key'
  ) THEN
    CREATE UNIQUE INDEX "merch_variants_sku_productId_key" ON "merch_variants"("sku", "productId");
  END IF;
END $$;

-- Create productId index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'merch_variants_productId_idx'
  ) THEN
    CREATE INDEX "merch_variants_productId_idx" ON "merch_variants"("productId");
  END IF;
END $$;

-- Make SKU nullable in merch_products
DO $$
BEGIN
  ALTER TABLE "merch_products" ALTER COLUMN "sku" DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL; -- SKU is already nullable
END $$;
