/**
 * Home Page Configuration
 *
 * Data-driven config for the branded home page template. Instead of rebuilding
 * the homepage from scratch for each demo, configure these sections:
 *
 * 1. Hero — uses brand theme's heroImage + gradients
 * 2. Categories — grid of navigable department/section cards
 * 3. Featured Items — auto-populated from search index
 * 4. Assistant CTA — links to chat or opens floating widget
 *
 * For AI agents:
 *   - Populate categories from the target site's main nav departments
 *   - Use images from brands/{id}/images/category-*.jpg when available
 *   - Fallback to Unsplash with ?w=400&h=400&fit=crop parameters
 */

export interface HeroConfig {
  /** Main heading text */
  title: string
  /** Subtitle / tagline */
  subtitle: string
  /** Primary CTA button */
  primaryAction?: { label: string; path: string }
  /** Secondary CTA button */
  secondaryAction?: { label: string; path: string }
  /**
   * Background image URL.
   * Overrides the brand theme's heroImage if set.
   * Use brand's heroImage by default: leave undefined.
   */
  backgroundImage?: string
  /** Overlay color (e.g., "rgba(0,61,41,0.5)"). Falls back to brand gradient. */
  overlayColor?: string
}

export interface CategoryConfig {
  id: string
  title: string
  description: string
  /** Local or Unsplash image URL */
  image: string
  /** Navigation path when clicked */
  path: string
}

export interface AssistantCtaConfig {
  /** CTA heading */
  title: string
  /** CTA body text */
  body: string
  /** Navigation path for the CTA button */
  path: string
  /** Button label */
  buttonLabel: string
}

export interface FeaturedConfig {
  /** Section title */
  title: string
  /** Search query to populate featured items (default: "*") */
  query?: string
  /** Number of items to show (default: 6) */
  count?: number
}

export interface ChatWidgetConfig {
  /** Override greeting text */
  greeting?: string
  /** Suggestion pills shown in the chat widget */
  suggestions?: Array<{ label: string; prompt: string }>
  /** Navigation action buttons in the widget */
  navigationActions?: Array<{ label: string; description: string; path: string; icon: string }>
  /** Context string passed to the agent for this page */
  pageContext?: string
}

export interface HomePageConfig {
  hero: HeroConfig
  categories: CategoryConfig[]
  /** Section title above the category grid (default: "Browse Categories") */
  categoriesTitle?: string
  featured?: FeaturedConfig
  assistantCta?: AssistantCtaConfig
  /** Optional persona greeting (e.g., "Welcome back, Sarah") */
  personaGreeting?: string
  /** Configuration for the floating chat widget on the homepage */
  chat?: ChatWidgetConfig
}

// ============================================================================
// Default Configuration — override per demo
// ============================================================================

export const homeConfig: HomePageConfig = {
  hero: {
    title: 'Welcome to Your Store',
    subtitle: 'Discover products powered by Elastic search',
    primaryAction: { label: 'Start Shopping', path: '/search' },
    secondaryAction: { label: 'Chat with our assistant', path: '/chat' },
  },

  categories: [
    {
      id: 'electronics',
      title: 'Electronics',
      description: 'Browse devices and gadgets',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
      path: '/search?category=electronics',
    },
    {
      id: 'home-garden',
      title: 'Home & Garden',
      description: 'Explore home and outdoor essentials',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
      path: '/search?category=home-garden',
    },
    {
      id: 'fashion',
      title: 'Fashion',
      description: 'Find style and apparel',
      image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=300&fit=crop',
      path: '/search?category=fashion',
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      description: 'Discover everyday essentials',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop',
      path: '/search?category=lifestyle',
    },
  ],

  featured: {
    title: 'Popular This Week',
    query: '*',
    count: 6,
  },

  assistantCta: {
    title: 'Chat with our assistant',
    body: 'Get personalized recommendations and help finding what you need.',
    path: '/chat',
    buttonLabel: 'Chat with our assistant',
  },
}
