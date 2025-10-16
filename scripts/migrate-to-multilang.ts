import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateToMultiLanguage() {
  console.log('🚀 Starting multi-language migration...')

  try {
    // Get all existing content
    const contents = await prisma.$queryRaw`
      SELECT id, title, content, excerpt FROM content
    ` as any[]

    console.log(`📝 Found ${contents.length} content items to migrate`)

    // Transform each content item
    for (const content of contents) {
      const multiLangTitle = {
        en: content.title || '',
        mn: content.title || '' // You can provide Mongolian translations later
      }

      const multiLangContent = {
        en: content.content || {},
        mn: content.content || {} // You can provide Mongolian translations later
      }

      const multiLangExcerpt = content.excerpt ? {
        en: content.excerpt,
        mn: content.excerpt // You can provide Mongolian translations later
      } : null

      // Update the content with new structure
      await prisma.$executeRaw`
        UPDATE content 
        SET 
          title = ${JSON.stringify(multiLangTitle)}::jsonb,
          content = ${JSON.stringify(multiLangContent)}::jsonb,
          excerpt = ${multiLangExcerpt ? JSON.stringify(multiLangExcerpt) + '::jsonb' : 'NULL'}
        WHERE id = ${content.id}
      `

      console.log(`✅ Migrated content: ${content.title}`)
    }

    // Get all existing tags
    const tags = await prisma.$queryRaw`
      SELECT id, name, description FROM tags
    ` as any[]

    console.log(`🏷️ Found ${tags.length} tags to migrate`)

    // Transform each tag
    for (const tag of tags) {
      const multiLangName = {
        en: tag.name || '',
        mn: tag.name || '' // You can provide Mongolian translations later
      }

      const multiLangDescription = tag.description ? {
        en: tag.description,
        mn: tag.description // You can provide Mongolian translations later
      } : null

      await prisma.$executeRaw`
        UPDATE tags 
        SET 
          name = ${JSON.stringify(multiLangName)}::jsonb,
          description = ${multiLangDescription ? JSON.stringify(multiLangDescription) + '::jsonb' : 'NULL'}
        WHERE id = ${tag.id}
      `

      console.log(`✅ Migrated tag: ${tag.name}`)
    }

    console.log('🎉 Migration completed successfully!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateToMultiLanguage()
  .catch(console.error)