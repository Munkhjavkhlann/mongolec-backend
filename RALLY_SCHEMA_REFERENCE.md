# Rally for Rangers - Database Schema Reference

## Overview

Complete database schema for Rally for Rangers backend, supporting park nominations, rider applications, donations, sponsorships, partnerships, and content management.

---

## Models Added

### 1. Rally
**Purpose**: Main rally/event management

**Key Fields**:
- `title`, `description` - Multi-language (JSON)
- `startDate`, `endDate`, `duration`
- `location` - JSON with coordinates
- `status` - DRAFT, UPCOMING, ONGOING, COMPLETED, CANCELLED
- `targetAudience` - JSON array: riders, non-riders, volunteers
- `maxParticipants`, `currentParticipants`
- `heroImage`, `heroVideo`, `gallery`, `highlights`
- `impactOverview`, `conservationActivities` - JSON
- `isRecruiting`, `applicationDeadline`
- `cost`, `depositAmount` - JSON with currency

**Relations**:
- `applications[]` - RallyApplication
- `donations[]` - Donation
- `sponsors[]` - Sponsor
- `media[]` - RallyMedia
- `stories[]` - Story

---

### 2. RallyApplication
**Purpose**: Rider and supporter applications

**Key Fields**:
- Personal Info: `firstName`, `lastName`, `email`, `phone`, `country`, `city`, `address`, `birthdate`
- `hasValidPassport`
- Participation: `isRider` (true=rider, false=supporter)
- Rider Info: `hasMotorcycleLicense`, `ridingExperience` (JSON), `ridingVideoUrl`
- Medical: `isMedicalProfessional`, `medicalCertificationType`, `medicalConditions`, `dietaryRestrictions`
- Emergency Contact: `emergencyContactFirstName`, `emergencyContactLastName`, `emergencyContactPhone`, `emergencyContactEmail`, `emergencyContactRelationship`
- Social: `socialMediaLinks` (JSON)
- Questions: `motivation`, `travelExperience`, `futureLocations`, `howHeard`
- `selectedRallies` - JSON array of rally IDs
- Payment: `depositPaid`, `depositAmount`, `fullyPaid`, `totalAmount`, `fundraisingStatus`
- Terms: `agreedToTerms`, `agreedToLiability`
- Admin: `reviewedAt`, `reviewedBy`, `reviewNotes`
- Status: PENDING, UNDER_REVIEW, APPROVED, WAITLIST, REJECTED, CANCELLED, CONFIRMED

**Application Form Mapping**:
- ✅ Name (as on passport)
- ✅ Address
- ✅ Birthdate
- ✅ Phone number
- ✅ Email
- ✅ Valid passport
- ✅ Motorcycle license
- ✅ Riding experience (detailed)
- ✅ Riding video URL
- ✅ Medical professional certification
- ✅ Food allergies/dietary needs
- ✅ Emergency contact (all fields)
- ✅ Social media links
- ✅ Why participate (motivation)
- ✅ International travel experience
- ✅ How heard about rally
- ✅ Selected rallies (multi-select)
- ✅ Future location preferences
- ✅ Terms & conditions agreement

---

### 3. ParkNomination
**Purpose**: Park nomination forms for future rallies

**Key Fields**:
- Park Info: `country`, `parkNames` (JSON array), `parkWebsites` (JSON array)
- Park Contact: `parkContactFirstName`, `parkContactLastName`, `parkContactEmail`
- Partner Org: `partnerOrganizationName`, `partnerContactFirstName`, `partnerContactLastName`, `partnerContactEmail`, `partnerWebsite`, `partnerAddress` (JSON)
- Mission: `primaryMission` (JSON), `motorcycleSupport` (JSON - 3 ways), `partnerLogisticsSupport` (JSON)
- Additional: `otherInfo`, `howHeard`
- Admin: `status`, `reviewedAt`, `reviewedBy`, `reviewNotes`
- Status: PENDING, UNDER_REVIEW, APPROVED, REJECTED, SELECTED, NOT_SELECTED

**Nomination Form Mapping**:
- ✅ Country
- ✅ Park primary contact (first/last name, email)
- ✅ Park website(s)
- ✅ Primary mission
- ✅ 3 ways motorcycles will help
- ✅ Partner organization name
- ✅ Partner contact (first/last name, email)
- ✅ Partner website
- ✅ Partner address (all fields)
- ✅ Partner logistics support
- ✅ Other information
- ✅ How heard about Rally for Rangers

---

### 4. Donation
**Purpose**: Donation tracking (Stripe placeholder fields)

**Key Fields**:
- Donor: `donorName`, `donorEmail`, `donorPhone`, `isAnonymous`
- Details: `amount`, `currency`, `type`, `frequency`
- Stripe placeholders: `stripePaymentIntentId`, `stripeCustomerId`, `stripeSubscriptionId`
- Allocation: `allocation` (JSON), `designatedRally`
- Status: PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED
- Recurring: `recurringAmount`, `nextChargeDate`
- Metadata: `message`, `isTaxDeductible`

**Types**: GENERAL, RALLY_SPECIFIC, EQUIPMENT, MOTORCYCLE, OPERATIONAL, SPONSORSHIP
**Frequency**: ONE_TIME, MONTHLY, QUARTERLY, ANNUALLY

---

### 5. Sponsor
**Purpose**: Sponsor management

**Key Fields**:
- `name`, `logo`, `website`, `description` (JSON)
- `type`: CORPORATE, LOCAL_BUSINESS, INDIVIDUAL, ORGANIZATION, GOVERNMENT, NGO
- `level`: TITLE, PLATINUM, GOLD, SILVER, BRONZE, SUPPORTER
- Details: `amount`, `inKind`, `inKindDescription`
- Media: `logoUrl`, `bannerUrl`
- Contact: `contactName`, `contactEmail`, `contactPhone`
- Status: PENDING, APPROVED, ACTIVE, INACTIVE

---

### 6. ParkPartnership
**Purpose**: National park partnership tracking

**Key Fields**:
- `parkName` (JSON), `country`, `location` (JSON)
- `establishedDate`, `partnershipType` (JSON)
- Impact: `rangersCount`, `areaSize` (JSON), `keyChallenges` (JSON)
- Contact: `contactPerson`, `contactEmail`, `contactPhone`
- Media: `photos` (JSON array), `videos` (JSON array)
- `rallies` (JSON array)
- Status: PROPOSED, ACTIVE, INACTIVE, COMPLETED

---

### 7. Story
**Purpose**: Impact stories, ranger profiles, testimonials

**Key Fields**:
- Content: `title`, `slug`, `excerpt`, `content` (all JSON)
- `type`: IMPACT, TESTIMONIAL, RANGER_PROFILE, RIDER_PROFILE, FIELD_MOMENT, BEFORE_AFTER, UPDATE, NEWS
- Metadata: `author` (JSON), `role`
- Media: `featuredImage`, `gallery` (JSON), `videoUrl`
- Impact: `beforeData`, `afterData`, `impactSummary` (all JSON)
- Relationships: `tags`, `relatedRallies` (JSON arrays)
- SEO: `metaTitle`, `metaDescription` (JSON)
- Publishing: `status`, `publishedAt`

---

### 8. RallyMedia
**Purpose**: Rally-specific media management

**Key Fields**:
- `type`: IMAGE, VIDEO, DOCUMENT, THUMBNAIL
- `url`, `thumbnailUrl`, `title`, `description` (JSON)
- Metadata: `fileSize`, `dimensions` (JSON), `duration`
- Source: `source`, `sourceUrl`
- Display: `isFeatured`, `displayOrder`

---

### 9. NewsletterSubscription
**Purpose**: Newsletter subscriptions

**Key Fields**:
- `email`, `firstName`, `lastName`
- `interests` (JSON): upcoming_rallies, impact_stories, events
- `source`: homepage, rally_page, application
- Status: ACTIVE, UNSUBSCRIBED, BOUNCED, PENDING
- Marketing: `mailchimpId`, `sendGridId` (placeholders)
- Stats: `openCount`, `clickCount`

---

## Enums Reference

### RallyStatus
- DRAFT
- UPCOMING
- ONGOING
- COMPLETED
- CANCELLED

### ApplicationStatus
- PENDING
- UNDER_REVIEW
- APPROVED
- WAITLIST
- REJECTED
- CANCELLED
- CONFIRMED

### NominationStatus
- PENDING
- UNDER_REVIEW
- APPROVED
- REJECTED
- SELECTED
- NOT_SELECTED

### SponsorType
- CORPORATE
- LOCAL_BUSINESS
- INDIVIDUAL
- ORGANIZATION
- GOVERNMENT
- NGO

### SponsorLevel
- TITLE
- PLATINUM
- GOLD
- SILVER
- BRONZE
- SUPPORTER

### SponsorStatus
- PENDING
- APPROVED
- ACTIVE
- INACTIVE

### PartnershipStatus
- PROPOSED
- ACTIVE
- INACTIVE
- COMPLETED

### StoryType
- IMPACT
- TESTIMONIAL
- RANGER_PROFILE
- RIDER_PROFILE
- FIELD_MOMENT
- BEFORE_AFTER
- UPDATE
- NEWS

### MediaTypeR
- IMAGE
- VIDEO
- DOCUMENT
- THUMBNAIL

### SubscriptionStatus
- ACTIVE
- UNSUBSCRIBED
- BOUNCED
- PENDING

### DonationType
- GENERAL
- RALLY_SPECIFIC
- EQUIPMENT
- MOTORCYCLE
- OPERATIONAL
- SPONSORSHIP

### DonationFrequency
- ONE_TIME
- MONTHLY
- QUARTERLY
- ANNUALLY

### PaymentStatus
- PENDING
- COMPLETED
- FAILED
- REFUNDED
- CANCELLED

---

## Multi-Tenant Support

All models include:
- `tenantId` - Foreign key to Tenant
- Tenant isolation via `onDelete: Cascade`
- Unique constraints include `tenantId`

---

## Soft Deletes

All models include:
- `deletedAt` - Nullable DateTime
- Soft delete pattern (filter out records where deletedAt is not null)

---

## Audit Fields

Most models include:
- `createdAt` - DateTime @default(now())
- `updatedAt` - DateTime @updatedAt
- Created by tracking (User relations)

---

## Next Steps

1. ✅ Database schema complete
2. ⏳ Create GraphQL queries and mutations
3. ⏳ Build form submission endpoints
4. ⏳ Implement admin approval workflows
5. ⏳ Add email notifications
6. ⏳ Build admin dashboard components

---

## Notes

- All multi-language fields use JSON format: `{"en": "English text", "mn": "Монгол бичвэр"}`
- Payment fields (Stripe) are placeholders for future integration
- Email marketing fields (Mailchimp, SendGrid) are placeholders
- All JSON fields allow flexible data structure for future requirements
- Application and nomination forms fully mapped to schema
