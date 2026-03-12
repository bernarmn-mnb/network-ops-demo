/**
 * Visual Search Page Configuration
 *
 * Override these defaults to customise the visual search experience per demo.
 * Demo branches should create their own config file (e.g., myDemoVisualSearchConfig.ts)
 * and pass it to VisualSearchPage via props — never modify this file directly.
 */

export interface VisualSearchConfig {
  /** Page title shown in the hero */
  title: string
  /** Placeholder text in the search input */
  placeholder: string
  /** Background image URL for the hero header (layered behind content with low opacity) */
  heroImageUrl?: string
  /** Suggestions shown as pills in text mode */
  textSuggestions: Array<{ label: string; query: string }>
  /** Image suggestions shown as thumbnail pills in image mode */
  imageSuggestions: Array<{ label: string; url: string; thumb: string }>
  /** Extra bullet points for the "Under the hood" tech panel */
  techPanelNotes?: string[]
}

export const defaultVisualSearchConfig: VisualSearchConfig = {
  title: 'Visual Search',
  placeholder: 'red velvet cushion',
  textSuggestions: [
    { label: 'Red shoes', query: 'red shoes' },
    { label: 'Modern furniture', query: 'modern furniture' },
    { label: 'Landscape painting', query: 'landscape painting' },
    { label: 'Leather bag', query: 'leather bag' },
    { label: 'Sunset photography', query: 'sunset photography' },
  ],
  imageSuggestions: [
    {
      label: 'Sneakers',
      url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
      thumb: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
    },
    {
      label: 'Minimal lamp',
      url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=400&fit=crop',
      thumb: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=120&h=120&fit=crop',
    },
    {
      label: 'Blue chair',
      url: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&h=400&fit=crop',
      thumb: 'https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=120&h=120&fit=crop',
    },
  ],
}
