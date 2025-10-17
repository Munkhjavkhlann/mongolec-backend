/**
 * Localization Utilities
 * Helper functions for handling multi-language content
 */

/**
 * Get localized content from JSON field
 * @param content - The content object containing translations
 * @param language - The target language code
 * @returns The localized content or fallback
 */
export function getLocalizedContent(content: any, language: string): any {
  if (!content) return null;

  if (typeof content === 'object') {
    // Return specific language or fallback to English or first available
    return content[language] || content.en || Object.values(content)[0];
  }

  return content;
}
