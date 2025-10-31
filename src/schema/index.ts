import gql from 'graphql-tag';

/**
 * GraphQL Type Definitions
 * Complete schema for multi-tenant CMS with auth, news, and merch
 */
export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  # ============================================
  # Auth Types
  # ============================================

  type User {
    id: ID!
    email: String!
    firstName: String!
    lastName: String!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum TenantStatus {
    ACTIVE
    INACTIVE
    SUSPENDED
    PENDING
    ARCHIVED
  }

  enum TenantPlan {
    FREE
    BASIC
    PRO
    ENTERPRISE
  }

  type Tenant {
    id: ID!
    name: String!
    slug: String!
    domain: String
    isActive: Boolean!
    status: TenantStatus!
    plan: TenantPlan!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateTenantInput {
    name: String!
    slug: String!
    domain: String
    isActive: Boolean
    status: TenantStatus
    plan: TenantPlan
  }

  input UpdateTenantInput {
    name: String
    slug: String
    domain: String
    isActive: Boolean
    status: TenantStatus
    plan: TenantPlan
  }

  type AuthPayload {
    success: Boolean!
    message: String
    user: User!
  }

  type AuthResponse {
    user: User!
    token: String!
  }

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
  # Merch Types
  # ============================================

  type MerchProduct {
    id: ID!
    sku: String!
    name: JSON!
    description: JSON
    shortDescription: JSON
    price: Float!
    compareAtPrice: Float
    costPrice: Float
    currency: String
    inventory: Int!
    trackInventory: Boolean!
    allowBackorder: Boolean
    minStock: Int
    maxStock: Int
    weight: Float
    dimensions: JSON
    featuredImage: String
    images: JSON
    categoryId: String
    category: MerchCategory
    tags: JSON
    hasVariants: Boolean
    variants: JSON
    options: JSON
    metaTitle: JSON
    metaDescription: JSON
    searchKeywords: JSON
    status: String!
    isFeatured: Boolean!
    isDigital: Boolean
    publishedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type MerchCategory {
    id: ID!
    name: JSON!
    slug: String!
    description: JSON
    color: String
    icon: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateMerchProductInput {
    sku: String!
    name: JSON!
    description: JSON
    shortDescription: JSON
    price: Float!
    compareAtPrice: Float
    costPrice: Float
    currency: String
    inventory: Int
    trackInventory: Boolean
    allowBackorder: Boolean
    minStock: Int
    maxStock: Int
    weight: Float
    dimensions: JSON
    featuredImage: String
    images: JSON
    categoryId: ID
    tags: JSON
    hasVariants: Boolean
    variants: JSON
    options: JSON
    metaTitle: JSON
    metaDescription: JSON
    searchKeywords: JSON
    status: String!
    isFeatured: Boolean
    isDigital: Boolean
    publishedAt: DateTime
  }

  input UpdateMerchProductInput {
    sku: String
    name: JSON
    description: JSON
    shortDescription: JSON
    price: Float
    compareAtPrice: Float
    costPrice: Float
    currency: String
    inventory: Int
    trackInventory: Boolean
    allowBackorder: Boolean
    minStock: Int
    maxStock: Int
    weight: Float
    dimensions: JSON
    featuredImage: String
    images: JSON
    categoryId: ID
    tags: JSON
    hasVariants: Boolean
    variants: JSON
    options: JSON
    metaTitle: JSON
    metaDescription: JSON
    searchKeywords: JSON
    status: String
    isFeatured: Boolean
    isDigital: Boolean
    publishedAt: DateTime
  }

  input CreateMerchCategoryInput {
    name: JSON!
    slug: String!
    description: JSON
  }

  input UpdateMerchCategoryInput {
    name: JSON
    slug: String
    description: JSON
  }

  # ============================================
  # Content Types (Simple)
  # ============================================

  type Content {
    id: ID!
    title: String!
    slug: String!
    content: String!
    status: String!
    tenant: Tenant
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input CreateContentInput {
    title: String!
    slug: String!
    content: String!
    status: String
  }

  input UpdateContentInput {
    title: String
    slug: String
    content: String
    status: String
  }

  # ============================================
  # Health Check
  # ============================================

  type Health {
    status: String!
    timestamp: String!
    version: String!
  }

  # ============================================
  # Queries
  # ============================================

  type Query {
    # Health & Info
    health: Health!
    hello: String!

    # Auth
    me: User
    tenants: [Tenant!]!
    tenantById(id: ID!): Tenant
    tenantBySlug(slug: String!): Tenant

    # News
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

    # Merch
    merchProducts(
      language: String
      status: String
      categoryId: ID
      isFeatured: Boolean
      limit: Int
      offset: Int
    ): [MerchProduct!]!
    merchProductById(id: ID!, language: String): MerchProduct
    merchCategories(language: String): [MerchCategory!]!
    merchCategoryById(id: ID!, language: String): MerchCategory

    # Content (Simple)
    content: [Content!]!
    contentById(id: ID!): Content
  }

  # ============================================
  # Upload Types
  # ============================================

  type PresignedUrl {
    uploadUrl: String!
    fileUrl: String!
  }

  # ============================================
  # Mutations
  # ============================================

  type Mutation {
    # Auth
    login(email: String!, password: String!): AuthPayload!
    register(
      email: String!
      password: String!
      firstName: String!
      lastName: String!
      tenantSlug: String!
    ): AuthPayload!
    logout: Boolean!

    # Tenant Management
    createTenant(input: CreateTenantInput!): Tenant!
    updateTenant(id: ID!, input: UpdateTenantInput!): Tenant!
    deleteTenant(id: ID!): Boolean!

    # News
    createNewsArticle(input: CreateNewsArticleInput!): NewsArticle!
    updateNewsArticle(id: ID!, input: UpdateNewsArticleInput!): NewsArticle!
    deleteNewsArticle(id: ID!): Boolean!
    createNewsCategory(input: CreateNewsCategoryInput!): NewsCategory!
    updateNewsCategory(id: ID!, input: UpdateNewsCategoryInput!): NewsCategory!
    deleteNewsCategory(id: ID!): Boolean!

    # Merch
    createMerchProduct(input: CreateMerchProductInput!): MerchProduct!
    updateMerchProduct(id: ID!, input: UpdateMerchProductInput!): MerchProduct!
    deleteMerchProduct(id: ID!): Boolean!
    createMerchCategory(input: CreateMerchCategoryInput!): MerchCategory!
    updateMerchCategory(id: ID!, input: UpdateMerchCategoryInput!): MerchCategory!
    deleteMerchCategory(id: ID!): Boolean!

    # Content (Simple)
    createContent(input: CreateContentInput!): Content!
    updateContent(id: ID!, input: UpdateContentInput!): Content!
    deleteContent(id: ID!): Boolean!

    # File Upload
    createPresignedUploadUrl(fileType: String!): PresignedUrl!
  }
`;

export default typeDefs;
