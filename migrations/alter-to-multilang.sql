-- Multi-language migration for Mongolec CMS
-- This script safely converts existing data to multi-language JSON format

BEGIN;

-- Step 1: Create temporary columns for new structure
ALTER TABLE content ADD COLUMN title_new JSONB;
ALTER TABLE content ADD COLUMN content_new JSONB; 
ALTER TABLE content ADD COLUMN excerpt_new JSONB;

-- Step 2: Migrate existing content data to multi-language format
UPDATE content SET 
  title_new = json_build_object('en', title, 'mn', title),
  content_new = json_build_object('en', content, 'mn', content),
  excerpt_new = CASE 
    WHEN excerpt IS NOT NULL 
    THEN json_build_object('en', excerpt, 'mn', excerpt)
    ELSE NULL 
  END;

-- Step 3: Drop old columns and rename new ones
ALTER TABLE content DROP COLUMN title;
ALTER TABLE content DROP COLUMN content;
ALTER TABLE content DROP COLUMN excerpt;

ALTER TABLE content RENAME COLUMN title_new TO title;
ALTER TABLE content RENAME COLUMN content_new TO content;
ALTER TABLE content RENAME COLUMN excerpt_new TO excerpt;

-- Step 4: Handle tags table
ALTER TABLE tags ADD COLUMN name_new JSONB;
ALTER TABLE tags ADD COLUMN description_new JSONB;

UPDATE tags SET
  name_new = json_build_object('en', name, 'mn', name),
  description_new = CASE
    WHEN description IS NOT NULL
    THEN json_build_object('en', description, 'mn', description) 
    ELSE NULL
  END;

ALTER TABLE tags DROP COLUMN name;
ALTER TABLE tags DROP COLUMN description;

ALTER TABLE tags RENAME COLUMN name_new TO name;
ALTER TABLE tags RENAME COLUMN description_new TO description;

-- Step 5: Handle media table alt and description
ALTER TABLE media ADD COLUMN alt_new JSONB;
ALTER TABLE media ADD COLUMN description_new JSONB;

UPDATE media SET
  alt_new = CASE
    WHEN alt IS NOT NULL 
    THEN json_build_object('en', alt, 'mn', alt)
    ELSE NULL
  END,
  description_new = CASE
    WHEN description IS NOT NULL
    THEN json_build_object('en', description, 'mn', description)
    ELSE NULL
  END;

ALTER TABLE media DROP COLUMN alt;
ALTER TABLE media DROP COLUMN description;

ALTER TABLE media RENAME COLUMN alt_new TO alt;
ALTER TABLE media RENAME COLUMN description_new TO description;

COMMIT;

-- Generate Prisma client after migration
SELECT 'Migration completed! Run: npx prisma generate' as message;