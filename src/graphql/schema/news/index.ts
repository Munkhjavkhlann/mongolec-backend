import gql from 'graphql-tag';

/**
 * News Schema
 * News articles and categories management
 */
export const newsSchema = gql`
  # ============================================
  # News Types
  # ============================================

  type NewsArticle {
    id: ID!
    slug: String!
    title: JSON!
    subtitle: JSON
    excerpt: JSON
    byline: JSON
    blocks: JSON!
    featuredImage: String
    socialImage: String
    categoryId: String
    category: NewsCategory
    location: JSON
    source: String
    priority: String!
    isBreaking: Boolean!
    isFeatured: Boolean!
    metaTitle: JSON
    metaDescription: JSON
    keywords: JSON
    status: String!
    publishedAt: DateTime
    scheduledAt: DateTime
    author: User!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type NewsCategory {
    id: ID!
    name: JSON!
    slug: String!
    description: JSON
    color: String
    icon: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateNewsArticleInput {
    slug: String!
    title: JSON!
    subtitle: JSON
    excerpt: JSON
    byline: JSON
    blocks: JSON!
    featuredImage: String
    socialImage: String
    categoryId: ID
    location: JSON
    source: String
    priority: String!
    isBreaking: Boolean
    isFeatured: Boolean
    metaTitle: JSON
    metaDescription: JSON
    keywords: JSON
    status: String!
    publishedAt: DateTime
    scheduledAt: DateTime
  }

  input UpdateNewsArticleInput {
    slug: String
    title: JSON
    subtitle: JSON
    excerpt: JSON
    byline: JSON
    blocks: JSON
    featuredImage: String
    socialImage: String
    categoryId: ID
    location: JSON
    source: String
    priority: String
    isBreaking: Boolean
    isFeatured: Boolean
    metaTitle: JSON
    metaDescription: JSON
    keywords: JSON
    status: String
    publishedAt: DateTime
    scheduledAt: DateTime
  }

  input CreateNewsCategoryInput {
    name: JSON!
    slug: String!
    description: JSON
    color: String
  }

  input UpdateNewsCategoryInput {
    name: JSON
    slug: String
    description: JSON
    color: String
  }

  # ============================================
  # News Queries
  # ============================================

  extend type Query {
    newsArticles(
      language: String
      status: String
      priority: String
      categoryId: ID
      limit: Int
      offset: Int
    ): [NewsArticle!]!
    newsArticleById(id: ID!, language: String): NewsArticle
    newsCategories(language: String): [NewsCategory!]!
    newsCategoryById(id: ID!, language: String): NewsCategory
  }

  # ============================================
  # News Mutations
  # ============================================

  extend type Mutation {
    createNewsArticle(input: CreateNewsArticleInput!): NewsArticle!
    updateNewsArticle(id: ID!, input: UpdateNewsArticleInput!): NewsArticle!
    deleteNewsArticle(id: ID!): Boolean!
    createNewsCategory(input: CreateNewsCategoryInput!): NewsCategory!
    updateNewsCategory(id: ID!, input: UpdateNewsCategoryInput!): NewsCategory!
    deleteNewsCategory(id: ID!): Boolean!
  }
`;
