-- Migration: Add Merch Variants Table
-- Created: 2025-01-17
-- Description: Adds MerchVariant model for product variant management with multi-language support

-- Create merch_variants table
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
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),

  CONSTRAINT "merch_variants_productId_fkey" FOREIGN KEY ("productId")
    REFERENCES "merch_products"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create unique constraint for SKU per product
CREATE UNIQUE INDEX "merch_variants_sku_productId_key" ON "merch_variants"("sku", "productId");

-- Create index for productId for faster queries
CREATE INDEX "merch_variants_productId_idx" ON "merch_variants"("productId");

-- Create index for position ordering
CREATE INDEX "merch_variants_position_idx" ON "merch_variants"("position");

-- Remove the old JSON-based variants and options columns are kept for backward compatibility
-- They can be removed later if needed
-- ALTER TABLE "merch_products" DROP COLUMN IF EXISTS "variants";

-- Make SKU nullable in merch_products since it's now optional (variants have their own SKUs)
ALTER TABLE "merch_products" ALTER COLUMN "sku" DROP NOT NULL;

COMMENT ON TABLE "merch_variants" IS 'Product variants with multi-language support for options';
COMMENT ON COLUMN "merch_variants"."optionValues" IS 'JSON array of option values: [{"option": {"en": "Color", "mn": "Өнгө"}, "value": {"en": "Blue", "mn": "Цэнхэр"}}]';
COMMENT ON COLUMN "merch_variants"."title" IS 'Multi-language variant title: {"en": "Blue / Large", "mn": "Цэнхэр / Том"}';
