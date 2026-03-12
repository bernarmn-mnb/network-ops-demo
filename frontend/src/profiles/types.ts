/**
 * Demo User Profile Types
 *
 * DESIGN: Generic core + data-driven extensible sections.
 *
 * The type system is split into layers:
 *   1. UNIVERSAL CORE  — id, name, avatar, role, tagline (every demo needs these)
 *   2. STATS            — hero-area key/value metrics rendered as EuiStat cards
 *   3. ATTRIBUTE GROUPS — labelled detail panels (Preferences, Habits, Skills…)
 *   4. TAGS             — labelled badge groups (Interests, Dietary, Certifications…)
 *   5. PEOPLE           — optional household/team members with their own tag sets
 *   6. SEARCH PERSONALIZATION — generic brand/category boosting for search
 *   7. EXTENSIONS       — open bag for demo-specific data the template doesn't render
 *
 * A grocery demo, a fashion demo, a B2B SaaS demo, and an insurance demo
 * should all be expressible with the same type — only the *data* changes.
 */

// ---------------------------------------------------------------------------
// 1. Hero Stats (the numbers below the avatar)
// ---------------------------------------------------------------------------

export interface ProfileStat {
  label: string
  value: string | number
  /** Optional format hint: 'number' adds locale separators, 'currency' prepends symbol */
  format?: 'plain' | 'number' | 'currency'
}

// ---------------------------------------------------------------------------
// 2. Attribute Groups (the detail panels)
// ---------------------------------------------------------------------------

export interface AttributeItem {
  label: string
  value: string
}

export interface AttributeGroup {
  title: string
  /** EUI icon name (e.g. 'heart', 'package', 'gear', 'users') */
  icon?: string
  /** EUI icon color (e.g. 'danger', 'primary', 'accent') */
  iconColor?: string
  items: AttributeItem[]
}

// ---------------------------------------------------------------------------
// 3. Tag Groups (badge clusters)
// ---------------------------------------------------------------------------

export interface TagGroup {
  title: string
  icon?: string
  iconColor?: string
  values: string[]
  /** Badge color (default: 'hollow') */
  color?: string
}

// ---------------------------------------------------------------------------
// 4. People / Members
// ---------------------------------------------------------------------------

export interface ProfileMember {
  name: string
  subtitle?: string
  /** Tags shown as badges on the member card (e.g. dietary needs, certifications) */
  tags?: string[]
  /** Badge color for this member's tags (default: 'warning') */
  tagColor?: string
}

export interface PeopleGroup {
  /** Section title (e.g. "Household", "Team", "Dependants") */
  title: string
  members: ProfileMember[]
}

// ---------------------------------------------------------------------------
// 5. Search Personalization
// ---------------------------------------------------------------------------

export interface SearchPersonalization {
  preferredBrands?: string[]
  excludedBrands?: string[]
  preferredCategories?: string[]
  /** Generic field-level boosts: keys are ES field names, values are terms to boost */
  boosts?: Record<string, string[]>
}

// ---------------------------------------------------------------------------
// 6. The DemoProfile
// ---------------------------------------------------------------------------

export interface DemoProfile {
  // --- Universal core ---
  id: string
  name: string
  /** URL to avatar image. Empty string = initials avatar. */
  avatar: string
  role: string
  tagline: string

  // --- Optional identity fields ---
  memberSince?: string | null

  // --- Data-driven sections ---
  stats?: ProfileStat[]
  attributes?: AttributeGroup[]
  tags?: TagGroup[]
  people?: PeopleGroup

  // --- Search personalization ---
  searchPersonalization?: SearchPersonalization

  /**
   * Open extension bag for demo-specific data that the generic
   * profile system doesn't render but page-specific code can read.
   *
   * Examples:
   *   extensions.householdSize: 4
   *   extensions.dietaryRestrictions: ['gluten']
   *   extensions.budgetLevel: 'moderate'
   */
  extensions?: Record<string, unknown>
}
