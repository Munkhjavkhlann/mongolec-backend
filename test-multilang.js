// Test multi-language content creation
const mutation = `
  mutation CreateMultiLangNews {
    createContent(
      title: {
        en: "Breaking News: Important Update"
        mn: "Яаралтай мэдээ: Чухал мэдээлэл"
      }
      content: {
        en: "This is important news content in English..."
        mn: "Энэ бол монгол хэл дээрх чухал мэдээний агуулга..."
      }
      excerpt: {
        en: "Important update summary"
        mn: "Чухал мэдээний хураангуй"
      }
      slug: "breaking-news-update"
      type: "POST"
    ) {
      id
      title
      slug
      content
      excerpt
      createdAt
    }
  }
`;

// Query content in different languages
const queryEn = `
  query GetContentEnglish {
    content(language: "en") {
      id
      title
      content
      excerpt
    }
  }
`;

const queryMn = `
  query GetContentMongolian {
    content(language: "mn") {
      id
      title
      content
      excerpt
    }
  }
`;

console.log('📝 Multi-language GraphQL Mutations and Queries:');
console.log('');
console.log('🆕 CREATE CONTENT (Multi-language):');
console.log(mutation);
console.log('');
console.log('🔍 QUERY CONTENT (English):');
console.log(queryEn);
console.log('');
console.log('🔍 QUERY CONTENT (Mongolian):');
console.log(queryMn);
console.log('');
console.log('🚀 Test these at: http://localhost:4000/graphql');
console.log('📖 Remember to include Authorization header with JWT token!');