/**
 * Search Configuration
 *
 * This file defines how the search page behaves - what index to search,
 * which fields to use, how to display results, and what filters to show.
 *
 * AUTO-POPULATION GUIDE (for build agents):
 *
 * After indexing data, discover fields by hitting:
 *   GET /api/search/fields
 *
 * The response includes a `suggested_config` object — map it directly
 * into this config. Always populate `display`, `facets`, and `rangeFilters`.
 * Never leave the defaults from the template.
 *
 * Field mapping checklist:
 *   - `index`: Set to your actual index name (from backend/.env SEARCH_INDEX)
 *   - `fields.search`: Text fields with boosts (title^3, description^1, etc.)
 *   - `display.title`: The primary text field (product name, article title, etc.)
 *   - `display.subtitle`: Secondary text (brand, author, category)
 *   - `display.description`: Body text or summary
 *   - `display.image`: URL field for thumbnails (check URLs are valid!)
 *   - `display.price`: Numeric price field (will format as currency)
 *   - `display.badges`: Keyword fields shown as tags (category, status, type)
 *   - `facets`: Keyword-type fields for sidebar filters (GET /api/search/fields shows types)
 *   - `rangeFilters`: Numeric fields for sliders (price, rating, date ranges)
 *   - `sortOptions`: Fields users would want to sort by (price, date, rating, relevance)
 *
 * CUSTOMIZATION GUIDE (for LLM agents):
 *
 * 1. To switch to a different index:
 *    - Change `index` to your index name
 *    - Update `fields.search` with your searchable fields
 *    - Update `fields.display` to map your fields to the UI
 *    - Update `facets` with your filterable keyword fields
 *
 * 2. To add advanced relevancy (boosting, LTR, personalization):
 *    - Change `queryTemplate` to an advanced template name
 *    - Add any required `templateVars`
 *    - See backend/app/elasticsearch/templates/queries/ for available templates
 *
 * 3. To add custom query logic:
 *    - Create a new template in templates/queries/
 *    - Or add a modifier in backend/app/elasticsearch/modifiers/
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface SearchFieldConfig {
  /** Field name in Elasticsearch */
  field: string
  /** Boost factor for relevancy (higher = more important) */
  boost?: number
}

export interface FacetConfig {
  /** Field name (must be keyword type in ES) */
  field: string
  /** Display label in UI */
  label: string
  /** Max number of buckets to show */
  size?: number
}

export interface RangeFilterConfig {
  /** Field name (must be numeric type in ES) */
  field: string
  /** Display label in UI */
  label: string
  /** Unit label (e.g., "mins", "calories", "$") */
  unit?: string
  /** Default min value */
  min?: number
  /** Default max value */
  max?: number
  /** Step increment for slider */
  step?: number
}

export interface DisplayFieldsConfig {
  /** Primary title field */
  title: string
  /** Subtitle/secondary text (optional) */
  subtitle?: string
  /** Description/body text */
  description?: string
  /** Image URL field */
  image?: string
  /** Price field (will format as currency) */
  price?: string
  /** Rating field (0-5 scale) */
  rating?: string
  /** Review count field */
  reviewCount?: string
  /** Fields to show as badge tags */
  badges?: string[]
  /** Field indicating in-stock status */
  inStock?: string
  /** Field indicating popularity score (0-100 scale) */
  popularity?: string
  /** Field indicating discount percentage */
  discountPercentage?: string
  /** Stock quantity field */
  stockQuantity?: string
}

/** Configuration for a search mode (keyword, semantic, etc.) */
export interface SearchModeConfig {
  /** Unique mode identifier */
  id: string
  /** EUI icon name for the toolbar button */
  icon: string
  /** Short display label */
  label: string
  /** Tooltip shown on hover */
  tooltip: string
  /** Placeholder text for the search input in this mode */
  placeholder: string
}

/** A demo query pill — a clickable suggestion shown below the search bar */
export interface DemoPill {
  /** Display label */
  label: string
  /** Query text to execute */
  query: string
}

/** Currency formatting configuration */
export interface CurrencyConfig {
  /** Intl locale string (e.g., 'en-US', 'en-GB') */
  locale: string
  /** ISO 4217 currency code (e.g., 'USD', 'GBP', 'EUR') */
  code: string
}

export interface SearchConfig {
  /** Elasticsearch index name */
  index: string
  
  /** 
   * Query template to use
   * - "simple" = basic multi_match (default)
   * - "function_score" = with popularity/freshness boosting
   * - "semantic" = vector/hybrid search
   * - "ltr" = learning to rank reranking
   * - Or path to custom template JSON
   */
  queryTemplate: string
  
  /** Variables passed to query template */
  templateVars?: Record<string, unknown>
  
  /** 
   * Query modifiers to apply (in order)
   * These are backend Python classes that can transform queries/results
   */
  modifiers?: string[]
  
  /** Field configuration */
  fields: {
    /** Fields to search (with optional boost) */
    search: (string | SearchFieldConfig)[]
    /** Fields to return in results */
    return?: string[]
  }
  
  /** How to map ES fields to UI display */
  display: DisplayFieldsConfig
  
  /** Facet filters to show in sidebar */
  facets?: FacetConfig[]
  
  /** Numeric range filters */
  rangeFilters?: RangeFilterConfig[]
  
  /** Results per page */
  pageSize?: number
  
  /** Available sort options */
  sortOptions?: Array<{
    field: string
    direction: 'asc' | 'desc'
    label: string
  }>

  /** Currency for price formatting (default: { locale: 'en-US', code: 'USD' }) */
  currency?: CurrencyConfig

  /**
   * Search modes available in the toolbar.
   * Default: keyword only (no toolbar shown).
   * When multiple modes are configured, a mode toolbar appears next to the search input.
   *
   * Modes with id 'keyword' or 'semantic' use the standard /api/search endpoint
   * with search_type parameter. Custom mode IDs are passed through for demos
   * that provide their own search functions.
   */
  searchModes?: SearchModeConfig[]

  /**
   * Demo query pills shown below the search bar, keyed by mode ID.
   * When present, clickable pill buttons appear for quick demo queries.
   *
   * @example
   * demoPills: {
   *   keyword: [
   *     { label: 'Laptop', query: 'laptop' },
   *     { label: 'Headphones', query: 'wireless headphones' },
   *   ],
   *   semantic: [
   *     { label: 'Gift for dad', query: 'gift ideas for father' },
   *   ],
   * }
   */
  demoPills?: Record<string, DemoPill[]>

  /** Custom page title (default: "Search") */
  pageTitle?: string
}

// ============================================================================
// Default Configuration - Products Demo
// ============================================================================

/**
 * CURRENT: Demo product catalog
 * 
 * To switch to recipes, replace this entire object with:
 * 
 * export const searchConfig: SearchConfig = {
 *   index: "search-ecommerce",
 *   queryTemplate: "simple",
 *   fields: {
 *     search: [
 *       { field: "title", boost: 3 },
 *       { field: "description", boost: 1 },
 *       { field: "ingredients", boost: 2 },
 *     ],
 *   },
 *   display: {
 *     title: "title",
 *     subtitle: "cuisine",
 *     description: "description", 
 *     image: "image_url",
 *     badges: ["cuisine", "diet", "difficulty"],
 *   },
 *   facets: [
 *     { field: "cuisine", label: "Cuisine" },
 *     { field: "diet", label: "Diet" },
 *   ],
 *   rangeFilters: [
 *     { field: "prep_time", label: "Prep Time", unit: "mins", max: 120 },
 *   ],
 * }
 */
export const searchConfig: SearchConfig = {
  // -------------------------------------------------------------------------
  // Index & Query Settings
  // -------------------------------------------------------------------------
  index: "search-ecommerce",
  queryTemplate: "simple",
  
  // For advanced relevancy, uncomment:
  // queryTemplate: "function_score",
  // templateVars: {
  //   popularityField: "review_count",
  //   freshnessField: "updated_at",
  // },
  
  // For personalization, add modifiers:
  // modifiers: ["personalization", "freshness"],
  
  // -------------------------------------------------------------------------
  // Search Fields
  // -------------------------------------------------------------------------
  fields: {
    search: [
      { field: "title", boost: 3 },
      { field: "description", boost: 1 },
      { field: "brand", boost: 2 },
      { field: "category", boost: 1.5 },
      { field: "tags", boost: 1 },
    ],
  },
  
  // -------------------------------------------------------------------------
  // Display Mapping
  // -------------------------------------------------------------------------
  display: {
    title: "title",
    subtitle: "brand",
    description: "description",
    image: "image_url",
    price: "price",
    rating: "rating",
    reviewCount: "review_count",
    badges: ["category", "subcategory"],
    inStock: "in_stock",
    popularity: "rank_features.popularity",
    discountPercentage: "discount_percentage",
    stockQuantity: "stock",
  },
  
  // -------------------------------------------------------------------------
  // Facet Filters
  // -------------------------------------------------------------------------
  facets: [
    { field: "category", label: "Category", size: 20 },
    { field: "brand", label: "Brand", size: 20 },
    { field: "subcategory", label: "Subcategory", size: 10 },
  ],
  
  // -------------------------------------------------------------------------
  // Range Filters
  // -------------------------------------------------------------------------
  rangeFilters: [
    { field: "price", label: "Price", unit: "$", min: 0, max: 2500, step: 10 },
    { field: "rating", label: "Min Rating", min: 0, max: 5, step: 0.5 },
  ],
  
  // -------------------------------------------------------------------------
  // Pagination & Sorting
  // -------------------------------------------------------------------------
  pageSize: 12,
  
  sortOptions: [
    { field: "_score", direction: "desc", label: "Relevance" },
    { field: "price", direction: "asc", label: "Price: Low to High" },
    { field: "price", direction: "desc", label: "Price: High to Low" },
    { field: "rating", direction: "desc", label: "Rating" },
  ],
}

// ============================================================================
// Config Helpers
// ============================================================================

/**
 * Get search fields as array of strings with boost syntax
 * e.g., ["title^3", "description^1", "brand^2"]
 */
export function getSearchFieldsWithBoost(): string[] {
  return searchConfig.fields.search.map(f => {
    if (typeof f === 'string') return f
    return f.boost ? `${f.field}^${f.boost}` : f.field
  })
}

/**
 * Get facet field names
 */
export function getFacetFields(): string[] {
  return searchConfig.facets?.map(f => f.field) || []
}

/** Get currency config with fallback to USD */
export function getCurrencyConfig(): CurrencyConfig {
  return searchConfig.currency ?? { locale: 'en-US', code: 'USD' }
}

/** Format a price value using the configured currency */
export function formatPrice(value: number | undefined | null): string | null {
  if (value === undefined || value === null) return null
  const { locale, code } = getCurrencyConfig()
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(value)
}

/**
 * Export config as JSON for backend
 */
export function getConfigForBackend(): object {
  return {
    index: searchConfig.index,
    queryTemplate: searchConfig.queryTemplate,
    templateVars: searchConfig.templateVars,
    modifiers: searchConfig.modifiers,
    searchFields: getSearchFieldsWithBoost(),
    facets: searchConfig.facets,
    rangeFilters: searchConfig.rangeFilters,
    pageSize: searchConfig.pageSize,
  }
}

