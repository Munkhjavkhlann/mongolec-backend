import { gql } from 'graphql-tag';

export const rallyQueries = gql`
  # ============================================
  # RALLY QUERIES
  # ============================================

  extend type Query {
    # Get all rallies with pagination and filters
    rallies(
      page: Int
      limit: Int
      status: RallyStatus
      search: String
      orderBy: String
      orderDirection: String
    ): PaginatedRallies!

    # Get single rally by slug or ID
    rally(slug: String, id: ID): Rally

    # Get upcoming rallies
    upcomingRallies(
      page: Int
      limit: Int
    ): PaginatedRallies!

    # Get past rallies
    pastRallies(
      page: Int
      limit: Int
    ): PaginatedRallies!

    # Get recruiting rallies (accepting applications)
    recruitingRallies: [Rally!]!
  }

  # ============================================
  # RALLY APPLICATION QUERIES
  # ============================================

  extend type Query {
    # Get all applications with filters
    applications(
      page: Int
      limit: Int
      status: ApplicationStatus
      rallyId: ID
      search: String
      orderBy: String
      orderDirection: String
    ): PaginatedApplications!

    # Get single application by ID
    application(id: ID!): RallyApplication

    # Get pending applications
    pendingApplications(
      page: Int
      limit: Int
    ): PaginatedApplications!

    # Get approved applications
    approvedApplications(
      page: Int
      limit: Int
      rallyId: ID
    ): PaginatedApplications!

    # Get application stats
    applicationStats(
      rallyId: ID
    ): ApplicationStats

    # Check if email has already applied to a rally
    hasApplied(rallyId: ID!, email: String!): Boolean!
  }

  # Application Statistics
  type ApplicationStats {
    totalApplications: Int!
    pendingApplications: Int!
    approvedApplications: Int!
    rejectedApplications: Int!
    waitlistedApplications: Int!
    confirmedApplications: Int!
    riderCount: Int!
    supporterCount: Int!
    totalRaising: Float! # Total fundraising amount
  }

  # ============================================
  # PARK NOMINATION QUERIES
  # ============================================

  extend type Query {
    # Get all nominations with filters
    nominations(
      page: Int
      limit: Int
      status: NominationStatus
      country: String
      orderBy: String
      orderDirection: String
    ): PaginatedNominations!

    # Get single nomination by ID
    nomination(id: ID!): ParkNomination

    # Get pending nominations
    pendingNominations(
      page: Int
      limit: Int
    ): PaginatedNominations!

    # Get approved nominations
    approvedNominations(
      page: Int
      limit: Int
      rallyId: ID
    ): PaginatedNominations!

    # Get nominations by country
    nominationsByCountry(
      country: String!
      page: Int
      limit: Int
    ): PaginatedNominations!

    # Get nomination stats
    nominationStats: NominationStats

    # Check if email has already nominated a park for a rally
    hasNominated(rallyId: ID!, email: String!): Boolean!
  }

  type NominationStats {
    totalNominations: Int!
    pendingNominations: Int!
    approvedNominations: Int!
    selectedNominations: Int!
    countriesRepresented: Int!
  }

  # ============================================
  # PARK PARTNERSHIP QUERIES
  # ============================================

  extend type Query {
    # Get all park partnerships
    parkPartnerships(
      page: Int
      limit: Int
      status: PartnershipStatus
      country: String
    ): [ParkPartnership!]!

    # Get single partnership by ID
    parkPartnership(id: ID!): ParkPartnership

    # Get active partnerships
    activePartnerships: [ParkPartnership!]!

    # Get partnerships by country
    partnershipsByCountry(country: String!): [ParkPartnership!]!

    # Get partnership statistics
    partnershipStats(rallyId: ID): PartnershipStats
  }

  type PartnershipStats {
    totalPartnerships: Int!
    activePartnerships: Int!
    prospectivePartnerships: Int!
    confirmedPartnerships: Int!
    uniqueCountryCount: Int!
  }

  # ============================================
  # STORY QUERIES
  # ============================================

  extend type Query {
    # Get all stories with pagination and filters
    stories(
      page: Int
      limit: Int
      type: StoryType
      status: ContentStatus
      featured: Boolean
      rallyId: ID
      search: String
      orderBy: String
      orderDirection: String
    ): PaginatedStories!

    # Get single story by slug or ID
    story(slug: String, id: ID): Story

    # Get published stories (public)
    publishedStories(
      page: Int
      limit: Int
      type: StoryType
      rallyId: ID
    ): PaginatedStories!

    # Get featured stories
    featuredStories(limit: Int): [Story!]!

    # Get stories by type
    storiesByType(
      type: StoryType!
      page: Int
      limit: Int
    ): PaginatedStories!

    # Get ranger profiles
    rangerProfiles: [Story!]!

    # Get rider profiles
    riderProfiles: [Story!]!

    # Get impact stories
    impactStories(page: Int, limit: Int): PaginatedStories!

    # Get draft stories (admin only)
    draftStories(
      page: Int
      limit: Int
    ): PaginatedStories!

    # Get story statistics (admin only)
    storyStats(rallyId: ID): StoryStats

    # Get related stories
    relatedStories(storyId: ID!): [Story!]!
  }

  type StoryStats {
    totalStories: Int!
    publishedStories: Int!
    draftStories: Int!
    featuredStories: Int!
    impactStories: Int!
    riderStories: Int!
    rallyStories: Int!
  }

  # ============================================
  # RALLY MEDIA QUERIES
  # ============================================

  extend type Query {
    # Get all media for a rally
    rallyMedia(rallyId: ID!): [RallyMedia!]!

    # Get single media by ID
    media(id: ID!): RallyMedia

    # Get featured media for a rally
    featuredRallyMedia(rallyId: ID!): [RallyMedia!]!

    # Get media by type
    rallyMediaByType(rallyId: ID!, type: MediaTypeR!): [RallyMedia!]!

    # Get single media item by ID
    rallyMediaItem(id: ID!): RallyMedia
  }

  # ============================================
  # NEWSLETTER QUERIES
  # ============================================

  extend type Query {
    # Get all newsletter subscriptions
    newsletterSubscriptions(
      page: Int
      limit: Int
      status: SubscriptionStatus
    ): [NewsletterSubscription!]!

    # Get subscription by email
    newsletterSubscription(email: String!): NewsletterSubscription

    # Check if email is subscribed
    isSubscribed(email: String!): Boolean!

    # Get subscriber stats
    subscriberStats: SubscriberStats

    # Get newsletter statistics
    newsletterStats: NewsletterStats
  }

  type NewsletterStats {
    totalSubscriptions: Int!
    activeSubscriptions: Int!
    unsubscribed: Int!
    bounced: Int!
  }

  type SubscriberStats {
    totalSubscribers: Int!
    activeSubscribers: Int!
    unsubscribed: Int!
    bounced: Int!
    averageOpenRate: Float!
    averageClickRate: Float!
  }
`;
