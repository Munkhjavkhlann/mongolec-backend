# V0 Prompt: Rally for Rangers Website

Create a complete, production-ready website for Rally for Rangers - a conservation organization that empowers park rangers worldwide with new motorcycles and equipment. This is a project of the Mongol Ecology Center (501(c)3 NGO).

## CRITICAL MISSION CONTEXT

This is **NOT a motorcycle tourism company**. This is a conservation mission. The website must:
- Emphasize EMPOWERING RANGERS and protecting special places
- Avoid tourism language: NO "tour", "guided", "package", "itinerary"
- Focus on direct support to underfunded national parks
- Show authentic conservation impact, not adventure travel
- Make the mission feel open and approachable to everyone, not just motorcycle enthusiasts

## DESIGN AESTHETIC

- **Authentic & personal**: Must NOT feel like AI-generated content
- **Mission-first**: Show rangers in action, national parks, conservation work
- **Not motorcycle-centric**: Balance motorcycles with rangers, parks, and impact
- **Professional yet approachable**: Non-profit conservation organization feel
- **Impact-driven**: Use real photos, testimonials, and data
- **Earth tones with accent colors**: Greens, browns, blues with orange/teal accents
- **Strong typography**: Bold headlines, readable body text
- **Full-width visuals**: Immersive images and videos

## TECHNICAL REQUIREMENTS

### Backend Integration
- **GraphQL API**: Use Apollo Client with `@apollo/client`
- **API Endpoint**: `http://localhost:4000/graphql` (development)
- **Authentication**: JWT tokens stored in httpOnly cookies
- **Multi-language support**: English (primary), Mongolian (secondary)
- **File uploads**: Handle images/videos to AWS S3

### Key Libraries
```json
{
  "@apollo/client": "^3.8.0",
  "graphql": "^16.8.0",
  "next": "15.x",
  "react": "^19.0.0",
  "tailwindcss": "^4.0.0",
  "@stripe/stripe-js": "^4.0.0",
  "swr": "^2.2.0"
}
```

## PAGE STRUCTURE

Build these pages in order:

### 1. HOME PAGE (/)

**Hero Section:**
- Full-screen video background (show rangers working, motorcycle handovers)
- Overlay gradient for text readability
- Headline: "Empower Rangers. Protect Wild Places."
- Subhead: "Join us in delivering new motorcycles and equipment to park rangers protecting the world's most special places."
- Primary CTA: "Explore Rallies" (large, prominent)
- Secondary CTA: "Donate Now" (outline style)
- Scroll indicator

**Impact Statistics Section:**
- 4-column grid with animated counters:
  - "Motorcycles Delivered" (number + icon)
  - "Rangers Supported" (number + icon)
  - "Countries Reached" (number + icon)
  - "Protected Areas" (acres/hectares + icon)
- Each stat is clickable/hoverable → expands to show detailed description
- "View Full Impact" link at end

**Featured Rallies Section:**
- Section heading: "Upcoming Rallies"
- 3 rally cards in responsive grid
- Each card shows:
  - Hero image with hover zoom effect
  - Rally title & dates
  - Location & duration
  - "Riders & Non-Riders Welcome" badge
  - Brief impact description (2-3 lines)
  - Application deadline badge
  - "Learn More" CTA button
- "View All Rallies" link button

**Mission Statement Section:**
- Full-width colored background (earth tone)
- Two-column layout:
  - Left: Bold headline "This Is Conservation, Not Tourism"
  - Right: Explanation of the mission, how it's different from adventure travel
- Key points as icon list:
  - Direct support to underfunded parks
  - Rangers on the frontlines of protection
  - Volunteer service, not guided tours
  - Lasting impact beyond the rally

**Testimonials Carousel:**
- Section heading: "Voices from the Field"
- Auto-scrolling carousel
- Ranger testimonials:
  - Photo (circular or rounded square)
  - Name, park, country
  - Quote about impact of motorcycles
  - "This changed everything for our patrol capabilities" type quotes
- Rider testimonials (interleaved)
- Navigation arrows + dot indicators

**Recent Impact Stories:**
- Section heading: "Latest Impact"
- 3 story cards in grid
- Each card:
  - Featured image
  - Story title (bold)
  - Excerpt (2-3 lines)
  - "Read More" link
- Stories should be tagged: "Impact", "Ranger Profile", "Field Update"

**Footer (All Pages):**
- Newsletter signup section:
  - Heading: "Stay Updated on Our Mission"
  - Email input + "Subscribe" button
  - Privacy note
- "Schedule a Call with Our Team" button (Calendly integration)
- "Donate" button (prominent, different color)
- Organization info:
  - Rally for Rangers logo
  - "A project of Mongol Ecology Center"
  - 501(c)3 status
- Quick links: About, Rallies, Partnerships, Donate, Contact
- Social media icons
- Contact email
- Copyright

### 2. ABOUT PAGE (/about)

**Hero Section:**
- Smaller hero than homepage
- Background image: rangers with motorcycles
- Headline: "Empowering Rangers, Protecting the Future"
- Breadcrumb navigation

**What Is Rally for Rangers:**
- Two-column layout
- Left: Rich content block with:
  - Mission statement
  - Vision for the future
  - How it started
- Right: Image/video embed
- "Not Tourism" callout box (distinct background):
  - Clear explanation of conservation vs tourism
  - Bullet points of what makes RFR different

**How It Works - Timeline:**
- Section heading: "From Application to Impact"
- Horizontal timeline (vertical on mobile)
- 4 steps with icons:
  1. "Apply" - Submit application for upcoming rally
  2. "Prepare" - Fundraise, train, get ready (2-3 months)
  3. "Deploy" - Travel to country, deliver motorcycles (1-2 weeks)
  4. "Impact" - Ongoing conservation support for years
- Each step has brief description + icon
- Progress bar connecting steps

**Impact Dashboard:**
- Section heading: "Our Impact So Far"
- Interactive statistics grid (larger than homepage)
- 6-8 stat cards with:
  - Icon/illustration
  - Large number (animated)
  - Label
  - Click to expand → full description + related stories
- "View Detailed Impact Report" button (links to Impact page)

**Testimonials Section:**
- Section heading: "What People Say"
- Two subsections:
  - Ranger Testimonials:
    - Grid of 3-4 ranger profiles
    - Each: Photo, name, park, quote
  - Rider Testimonials:
    - Grid of 3-4 rider profiles
    - Each: Photo, name, rally attended, quote
- All testimonials have:
  - Star rating or heart icon
  - Full testimonial in expandable modal
  - Photo attribution

**Team Section:**
- Section heading: "Our Team"
- Leadership team grid:
  - Photo
  - Name
  - Role
  - Brief bio
- Board members (list or smaller grid)
- Key partners (logo grid)

**Partners & Affiliations:**
- Section heading: "Trusted Partners"
- Logo grid of partner organizations
- Mongol Ecology Center featured prominently
- "Become a Partner" CTA

### 3. EXPLORE RALLIES PAGE (/rallies)

**Hero Section:**
- Background: Montage of rally photos
- Headline: "Join a Rally"
- Subhead: "Choose an upcoming rally to apply for, or explore our past impact"

**Filter Bar:**
- Sticky below hero
- Filters:
  - Status: "Upcoming", "Recruiting", "Completed", "All"
  - Date Range: dropdown or date picker
  - Location: dropdown with country options
  - Type: "Riders", "Non-Riders", "Both"
- Search bar: "Search rallies..."
- View toggle: Grid / List
- "Clear Filters" button

**Rally Grid:**
- Responsive grid (1 col mobile, 2 col tablet, 3 col desktop)
- Each rally card:
  - Hero image with hover zoom
  - Status badge (Recruiting, Upcoming, Completed)
  - Rally title
  - Date range
  - Location (country)
  - Duration (X days)
  - "Riders & Non-Riders" or "Riders Only" badge
  - Brief impact description (2-3 lines)
  - Application deadline (if recruiting)
  - Primary CTA:
    - If recruiting: "Apply Now"
    - If upcoming: "Learn More"
    - If completed: "View Impact"
  - Secondary link: "View Details"
- Pagination or "Load More" button

**Empty State:**
- If no rallies match filters:
  - Icon/illustration
  - "No rallies found"
  - "Try adjusting your filters" message
  - "Clear Filters" button

**Past Rallies Section (below upcoming):**
- Section divider
- Heading: "Past Rallies & Their Impact"
- Simpler card design (smaller):
  - Year, country, title
  - Impact summary (2-3 stats)
  - "View Impact" button
- "Load More" pagination

### 4. RALLY DETAIL PAGE (/rallies/[slug])

**Hero Section:**
- Full-width hero image or video
- Overlay gradient
- Status badge (top left)
- Rally title (large, bold)
- Date range & location
- Duration
- Breadcrumb navigation

**Quick Info Bar:**
- Horizontal bar below hero
- Key info in pill/tile format:
  - Dates (icon + date range)
  - Duration (icon + X days)
  - Location (icon + country)
  - Who (icon: "Riders & Non-Riders" or "Riders Only")
  - Cost (icon: price)
  - Deadline (icon: application deadline)

**Overview Section:**
- Two-column layout:
  - Left (60%):
    - "About This Rally" heading
    - Full description (rich text, multi-language support)
    - What makes this rally unique
    - Expected impact
  - Right (40%):
    - Sticky sidebar
    - "Apply for This Rally" card:
      - Pricing info
      - Deposit amount
      - Application deadline
      - "Apply Now" button (large, primary)
      - "Download Information Packet" link
    - "Questions?" card:
      - Contact email
      - "Schedule a Call" button

**Who Should Apply:**
- Section heading: "Who Should Join This Rally"
- Two subsections:
  - "For Riders":
    - Requirements checklist
    - Riding experience needed
    - License requirements
    - Physical fitness notes
  - "For Non-Riders":
    - Support roles available
    - Skills needed
    - Physical fitness notes
- Both sections emphasize:
  - Conservation mission focus
  - Volunteer service nature
  - Flexibility and adaptability needed

**Conservation Activities:**
- Section heading: "Conservation Impact"
- Rich content about:
  - What activities will happen (NOT tourist activities)
  - Ranger partnerships (specific parks)
  - Expected outcomes
  - How motorcycles will be used
- Icon list of conservation activities:
  - Patrol support
  - Equipment delivery
  - Training programs
  - Infrastructure improvements
- "Meet the Rangers We're Supporting" subsection:
  - 3-4 ranger profiles
  - Each: Photo, name, park, quote about what this support means

**Timeline Section:**
- Section heading: "Rally Timeline"
- Visual timeline (similar to About page but more detailed):
  - Pre-rally: Application & approval (2-3 months)
  - Preparation: Fundraising & training (2 months)
  - Rally: Deployment & delivery (1-2 weeks)
  - Post-rally: Ongoing impact (years)
- Each phase has:
  - Duration
  - Key activities
  - Participant responsibilities

**Gallery Section:**
- Section heading: "Gallery"
- Tab navigation: "Photos", "Videos", "Past Rallies"
- Photo grid:
  - Masonry or uniform grid
  - Lightbox when clicking photos
  - Show previous rallies in same location
- Video grid:
  - Thumbnail grid
  - Modal embed for YouTube/Vimeo videos
  - Include documentary-style videos if available

**FAQ Accordion:**
- Section heading: "Frequently Asked Questions"
- Accordion with categories:
  - Applications
  - Preparation & Fundraising
  - During the Rally
  - Logistics & Accommodations
  - Safety & Medical
  - Post-Rally Impact

**Related Rallies:**
- Section heading: "Other Upcoming Rallies"
- 2-3 card grid
- Similar to rally listing cards
- "View All Rallies" link

**For Past Rallies (Conditional):**
Replace/supplement above sections with:

**Impact Summary:**
- Large impact stats:
  - Motorcycles delivered
  - Rangers supported
  - Parks reached
  - Long-term outcomes
- Before/After comparisons

**Stories from the Field:**
- Story grid (3-4)
- Each: Featured image, title, excerpt, "Read More"
- Include ranger stories, rider stories, impact updates

**Photo & Video Highlights:**
- Gallery from the rally
- Documentary video
- Rider testimonials (video or text)

**Long-term Impact:**
- What happened after the rally
- Updates from parks
- Ongoing relationships
- "See What's Happening Now" section

### 5. PARTNERSHIPS PAGE (/partnerships)

**Hero Section:**
- Background: Rangers with partner logos
- Headline: "Partner for Impact"
- Subhead: "Join us in empowering rangers worldwide"

**Partnership Opportunities:**
- Section heading: "Ways to Partner"
- 3-column card grid:
  1. **Sponsor a Rally**:
     - Description
     - Sponsorship levels
     - Benefits
     - "Become a Sponsor" CTA
  2. **Corporate Partnerships**:
     - Description
     - Benefits
     - "Inquire" CTA
  3. **Park Nominations**:
     - Description
     - Nomination criteria
     - "Nominate a Park" CTA (link to form)

**Sponsorship Levels:**
- Section heading: "Sponsorship Levels"
- Pricing table or card grid:
  - Title: $XX,XXX
  - Platinum: $XX,XXX
  - Gold: $XX,XXX
  - Silver: $XX,XXX
  - Bronze: $XX,XXX
- Each level shows:
  - Benefits (checklist)
  - Visibility opportunities
  - Impact metrics
  - "Sponsor Now" button

**Current Sponsors:**
- Section heading: "Our Sponsors"
- Logo grid (organized by level)
- Each logo links to sponsor website
- "Become a Sponsor" CTA button

**Park Partnership Map:**
- Section heading: "Parks We've Supported"
- Interactive map (if possible) or:
- Country/region grid
- Each country:
  - Flag or representative image
  - Number of parks supported
  - "View Parks" link (expands to list)

**Nominate a Park Section:**
- Section heading: "Nominate a Park for Support"
- Explanation of criteria
- Link to Jotform: https://form.jotform.me/mongolec/rally_nomination_form
- Or embedded iframe of form
- "Questions? Contact Us" info

**Partner Success Stories:**
- Section heading: "Partner Impact"
- 2-3 case study cards:
  - Partner logo + name
  - Partnership description
  - Impact metrics
  - Testimonial quote
  - "Read Case Study" link

### 6. DONATE PAGE (/donate)

**Hero Section:**
- Background: Impact photo (rangers with new equipment)
- Headline: "Fuel the Mission"
- Subhead: "Your donation directly supports park rangers protecting the world's special places"
- 501(c)3 tax-deductible notice

**Donation Form:**
- Central card or split layout:
  - Left: Donation options
  - Right: Impact preview (optional)

**Amount Selection:**
- Preset amount buttons: $50, $100, $250, $500, $1000
- Custom amount input
- "Other" button → reveals input

**Frequency Toggle:**
- Toggle: One-time / Monthly
- Monthly shows: "XX/month" and "XX/year"

**Donation Type Dropdown:**
- Options:
  - General Support (unrestricted)
  - Rally-Specific (dropdown to select rally)
  - Equipment Fund (gear, supplies)
  - Motorcycle Fund (direct to bikes)
  - Operational Support (logistics, admin)
- Brief explanation of each type

**Donor Information:**
- Fields:
  - Full Name (required)
  - Email (required)
  - Phone (optional)
  - Address (optional, for tax receipt)
  - "Make this donation anonymous" checkbox
  - "Dedicate this donation" checkbox → reveals:
    - "In honor of" / "In memory of" toggle
    - Recipient name
    - Notification email (optional)
  - Personal message (optional, textarea)

**Impact Preview:**
- Real-time impact calculator:
  - "Your $XX donation could provide:"
  - Examples:
    - $50 = Fuel for 100 patrol miles
    - $100 = Ranger training materials
    - $250 = Protective gear for 1 ranger
    - $500 = Motorcycle parts for 2 bikes
    - $1000 = Communications equipment
  - Dynamic based on selected amount

**Payment Section:**
- "Payment Information" heading
- Stripe Elements integration:
  - Card number
  - Expiry
  - CVC
  - Billing address (if not collected above)
- Payment method icons: Visa, MC, Amex, Discover
- "Secure payment" badge/lock icon

**Review & Submit:**
- Summary card:
  - Donation amount
  - Frequency
  - Type
  - Impact summary
- "Donate XX" button (large, prominent)
- Terms checkbox: "I agree to the terms and conditions"
- Privacy note: "Your payment information is secure"

**Success Message:**
- Thank you heading
- Donation confirmation
- Tax receipt info
- Impact reminder
- "Share your impact" social buttons
- "Return to homepage" link
- "Explore upcoming rallies" link

**Additional Sections:**
- "Where Your Donation Goes" (breakdown with pie chart)
- "Recent Impact Funded by Donors" (story grid)
- "Other Ways to Give" (stock, crypto, legacy - optional)

### 7. CONTACT PAGE (/contact)

**Hero Section:**
- Simple, clean
- Heading: "Get in Touch"
- Subhead: "Have questions? We'd love to hear from you"

**Two-Column Layout:**
- Left: Contact form
- Right: Contact information + Team contacts

**Contact Form:**
- Fields:
  - Name (required)
  - Email (required)
  - Subject (dropdown: General, Rally Questions, Partnership Inquiry, Donation Questions, Media, Other)
  - Message (textarea, required)
  - "Send Message" button
- Success message: "Thank you! We'll get back to you within 1-2 business days"

**Contact Information (Right Column):**
- Email addresses:
  - General inquiries
  - Rally applications
  - Partnerships
  - Donations
  - Media/Press
- Physical address (if applicable)
- Social media links (icon buttons)

**Schedule a Call:**
- "Prefer to talk?"
- "Schedule a Call with Our Team" button
- Calendly embed or link

**Team Contacts:**
- Section: "Who to Contact"
- Grid of team members:
  - Photo
  - Name
  - Role
  - Email
  - "Contact [Name]" button

**FAQ Section:**
- "Before you reach out, check our FAQs"
- Link to FAQ page or embedded accordion
- Categories: General, Applications, Donations, Partnerships

**Office Hours (if applicable):**
- "Our team is available:"
- Days and times
- Timezone

## SHARED COMPONENTS

Build these reusable components:

### Navigation
- Sticky header
- Logo (left)
- Main navigation links (center):
  - Home
  - About
  - Rallies
  - Partnerships
  - Donate
  - Contact
- "Donate" button (right, prominent)
- Mobile menu (hamburger)
- Language selector (EN/MN)

### Footer
- As described in Home page
- Consistent across all pages

### Buttons
- Primary (filled, accent color)
- Secondary (outline)
- Tertiary (text only)
- Sizes: small, medium, large
- Disabled state
- Loading state

### Forms
- Input fields (text, email, phone, textarea)
- Select dropdowns
- Checkboxes
- Radio buttons
- Toggle switches
- Error states
- Validation messages
- Submit buttons

### Cards
- Rally card (use on listing pages)
- Story card
- Testimonial card
- Sponsor card
- Stat card (with expand)

### Media Components
- Image with lazy loading
- Image gallery (grid, masonry)
- Video embed (YouTube, Vimeo)
- Video player (self-hosted)
- Lightbox/modal for images

### Data Display
- Stat counter (animated)
- Progress bars
- Timeline (horizontal/vertical)
- Accordion
- Tabs
- Carousel/slider
- Pagination
- Breadcrumbs

### Feedback
- Loading spinner
- Success messages
- Error messages
- Toast notifications
- Confirmation modals

## GRAPHQL QUERIES & MUTATIONS

Use these GraphQL operations (backend already supports these):

### Queries
```graphql
# Get upcoming rallies
query GetUpcomingRallies($page: Int, $limit: Int) {
  upcomingRallies(page: $page, limit: $limit) {
    rallies {
      id
      slug
      title
      description
      startDate
      endDate
      location
      duration
      heroImage
      isRecruiting
      applicationDeadline
      cost
      targetAudience
    }
    pagination {
      total
      totalPages
      hasNextPage
    }
  }
}

# Get single rally by slug
query GetRally($slug: String!) {
  rally(slug: $slug) {
    id
    slug
    title
    description
    startDate
    endDate
    location
    duration
    heroImage
    heroVideo
    gallery
    highlights
    impactOverview
    conservationActivities
    rangerPartnerships
    isRecruiting
    applicationDeadline
    cost
    depositAmount
    targetAudience
    maxParticipants
    currentParticipants
    stories {
      id
      slug
      title
      excerpt
      featuredImage
      type
    }
    media {
      id
      type
      url
      thumbnailUrl
      title
      description
    }
    sponsors {
      id
      name
      logo
      level
      website
    }
  }
}

# Get stories
query GetStories($page: Int, $limit: Int, $type: StoryType) {
  stories(page: $page, limit: $limit, type: $type) {
    stories {
      id
      slug
      title
      excerpt
      content
      featuredImage
      gallery
      videoUrl
      type
      author
      role
      publishedAt
    }
    pagination {
      total
      totalPages
    }
  }
}

# Get donations
query GetDonations($rallyId: String) {
  donations(rallyId: $rallyId) {
    id
    amount
    currency
    type
    donorName
    isAnonymous
    message
    createdAt
  }
}

# Get sponsors
query GetSponsors($rallyId: String) {
  sponsors(rallyId: $rallyId) {
    id
    name
    logo
    website
    description
    type
    level
    status
  }
}

# Get park partnerships
query GetParkPartnerships {
  parkPartnerships {
    id
    parkName
    country
    location
    establishedDate
    rangersCount
    areaSize
    status
    photos
  }
}
```

### Mutations
```graphql
# Submit rally application
mutation SubmitApplication($data: RallyApplicationInput!) {
  submitRallyApplication(data: $data) {
    success
    message
    application {
      id
      status
      email
    }
  }
}

# Submit park nomination
mutation SubmitNomination($data: ParkNominationInput!) {
  submitParkNomination(data: $data) {
    success
    message
    nomination {
      id
      status
    }
  }
}

# Create donation
mutation CreateDonation($data: DonationInput!) {
  createDonation(data: $data) {
    success
    message
    donation {
      id
      amount
      currency
      status
    }
  }
}

# Subscribe to newsletter
mutation SubscribeNewsletter($email: String!, $firstName: String, $lastName: String) {
  subscribeToNewsletter(email: $email, firstName: $firstName, lastName: $lastName) {
    success
    message
  }
}
```

## STATE MANAGEMENT

### Use SWR for Data Fetching
```typescript
import useSWR from 'swr'

const fetcher = (query: string) =>
  fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  }).then(res => res.json())

function useUpcomingRallies() {
  const { data, error, isLoading } = useSWR(
    'GET_UPCOMING_RALLIES',
    () => fetcher(GET_UPCOMING_RALLIES_QUERY)
  )
  return {
    rallies: data?.data?.upcomingRallies?.rallies,
    isLoading,
    isError: error
  }
}
```

### Apollo Client Setup
```typescript
// lib/apollo-client.ts
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client'

const client = new ApolloClient({
  link: createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
    credentials: 'include',
  }),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
  },
})

export default client
```

## STRIPE INTEGRATION

### Stripe Checkout
```typescript
// app/api/donate/route.ts
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { amount, frequency, donationType } = await request.json()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Donation to Rally for Rangers',
          description: donationType,
        },
        unit_amount: amount * 100,
      },
      quantity: 1,
    }],
    mode: frequency === 'monthly' ? 'subscription' : 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/donate/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/donate`,
  })

  return Response.json({ sessionId: session.id })
}
```

### Stripe Client
```typescript
// components/donate-form.tsx
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

async function handleSubmit(amount: number, frequency: string) {
  const response = await fetch('/api/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, frequency })
  })

  const { sessionId } = await response.json()
  const stripe = await stripePromise
  const { error } = await stripe!.redirectToCheckout({ sessionId })
}
```

## CALENDLY INTEGRATION

```typescript
// components/schedule-call.tsx
'use client'

export function ScheduleCallButton() {
  const openCalendly = () => {
    window.open(
      'https://calendly.com/YOUR_CALvendorLY_LINK',
      '_blank'
    )
  }

  return (
    <button onClick={openCalendly}>
      Schedule a Call
    </button>
  )
}
```

## RESPONSIVE DESIGN

### Breakpoints
```css
/* Mobile First */
sm: 640px   /* Small phones to tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Mobile Considerations
- Touch-friendly buttons (min 44px height)
- Stacked layouts on mobile
- Hamburger menu for navigation
- Simplified galleries on mobile
- Readable font sizes (min 16px)
- Optimized images (WebP, lazy loading)

## PERFORMANCE OPTIMIZATION

### Next.js Image Optimization
```typescript
import Image from 'next/image'

<Image
  src="/hero.jpg"
  alt="Rangers with motorcycles"
  width={1920}
  height={1080}
  priority
  placeholder="blur"
/>
```

### Lazy Loading
```typescript
<Image
  src="/gallery-1.jpg"
  alt="Gallery image"
  loading="lazy"
/>
```

### Code Splitting
```typescript
// Dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
})
```

## ACCESSIBILITY

### WCAG 2.1 AA Compliance
- Semantic HTML elements
- Alt text for all images
- ARIA labels for interactive elements
- Keyboard navigation support
- Color contrast ratios (min 4.5:1)
- Focus indicators
- Screen reader support

### Example
```typescript
<button
  aria-label="Close dialog"
  onClick={onClose}
>
  <CloseIcon />
</button>
```

## SEO

### Meta Tags
```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: 'Rally for Rangers - Empowering Rangers, Protecting Wild Places',
  description: 'Join us in delivering new motorcycles and equipment to park rangers protecting the world\'s most special places.',
  openGraph: {
    title: 'Rally for Rangers',
    description: 'Empower rangers. Protect wild places.',
    images: ['/og-image.jpg'],
  },
}
```

### Page-Specific Metadata
```typescript
// app/rallies/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const rally = await getRally(params.slug)
  return {
    title: rally.title,
    description: rally.excerpt,
    openGraph: {
      images: [rally.heroImage],
    },
  }
}
```

## ENVIRONMENT VARIABLES

```env
# .env.local
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/...
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

## BUILD INSTRUCTIONS

When building this website:

1. **Start with the layout** - Build header, footer, navigation first
2. **Then build pages in order** - Home → About → Rallies → Rally Detail → Partnerships → Donate → Contact
3. **Create reusable components** - Buttons, cards, forms as you go
4. **Integrate GraphQL** - Set up Apollo Client, then connect each page
5. **Add interactivity** - Animations, carousels, accordions
6. **Optimize** - Images, performance, accessibility
7. **Test** - All pages, all breakpoints, all interactions
8. **Deploy** - Vercel (easy deployment from GitHub)

## IMPORTANT NOTES

- **DO NOT** use tourism language ("tour", "guided", "package", "itinerary")
- **DO** emphasize conservation mission and impact
- **DO** make the site feel authentic and personal, not AI-generated
- **DO** show real photos of rangers, parks, and conservation work
- **DO NOT** focus primarily on motorcycles - balance with rangers and parks
- **DO** make the site approachable to everyone, not just riders
- **DO** include testimonials from both rangers and riders
- **DO** show impact with data and stories
- **DO** make donation and CTAs prominent but not aggressive
- **DO** ensure mobile experience is excellent (50%+ of traffic will be mobile)

## SUCCESS METRICS

The website should achieve:
- Clear understanding of the mission (not tourism)
- Easy rally application process
- Seamless donation experience
- Compelling impact visualization
- Strong emotional connection to the cause
- Mobile-optimized experience
- Fast load times (< 3 seconds)
- Accessible to all users

---

**Build this website to empower rangers and protect wild places around the world. Every feature should serve the mission of conservation and frontline support.**
