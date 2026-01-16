/**
 * Navigation Configuration
 * 
 * Centralized navigation menu configuration for consistent navigation
 * across all header components.
 * 
 * Features are grouped by category:
 * - demo: Features for building customer demos
 * - tools: Development and debugging tools
 * - advanced: Features requiring additional setup
 */

export interface NavItem {
  path: string
  label: string
  icon: string
  description?: string
  category?: 'demo' | 'tools' | 'advanced'
  /** If true, requires Agent Builder connection */
  requiresAgent?: boolean
  /** If true, requires LLM proxy configuration */
  requiresLLMProxy?: boolean
}

/**
 * All available navigation items
 * 
 * Icons should be EUI icon names from:
 * https://eui.elastic.co/#/display/icons
 * 
 * To add a new feature:
 * 1. Add it here with appropriate category
 * 2. Add the route in App.tsx
 * 3. Add the page component
 * 4. (Optional) Add to WelcomePage FEATURES array for showcase
 */
export const NAV_ITEMS: NavItem[] = [
  // Home - always first
  {
    path: '/',
    label: 'Home',
    icon: 'home',
    description: 'Feature overview & setup guide',
  },
  
  // Demo Building Features
  {
    path: '/chat',
    label: 'Chat',
    icon: 'newChat',
    description: 'Chat with your Agent Builder agent',
    category: 'demo',
    requiresAgent: true,
  },
  {
    path: '/branded',
    label: 'Demo',
    icon: 'sparkles',
    description: 'Branded demo experience',
    category: 'demo',
    requiresAgent: true,
  },
  {
    path: '/brands',
    label: 'Brands',
    icon: 'brush',
    description: 'Create and manage brand themes',
    category: 'demo',
  },
  
  // Development Tools
  {
    path: '/audit',
    label: 'Audit',
    icon: 'inspect',
    description: 'Review conversation history & reasoning',
    category: 'tools',
    requiresAgent: true,
  },
  {
    path: '/mcp',
    label: 'MCP',
    icon: 'plugs',
    description: 'Explore MCP server tools',
    category: 'tools',
    requiresAgent: true,
  },
  
  // Advanced Features
  {
    path: '/a2a-chat',
    label: 'A2A',
    icon: 'aggregate',
    description: 'Multi-agent orchestration',
    category: 'advanced',
    requiresAgent: true,
    requiresLLMProxy: true,
  },
]

/**
 * Get navigation items filtered by visibility
 * Some pages might want to hide certain nav items
 */
export function getNavItems(options?: {
  exclude?: string[]
  includeOnly?: string[]
  category?: NavItem['category']
}): NavItem[] {
  let items = NAV_ITEMS
  
  if (options?.category) {
    items = items.filter(item => item.category === options.category || item.path === '/')
  }
  
  if (options?.includeOnly) {
    items = items.filter(item => options.includeOnly!.includes(item.path))
  }
  
  if (options?.exclude) {
    items = items.filter(item => !options.exclude!.includes(item.path))
  }
  
  return items
}

/**
 * Get navigation items grouped by category
 */
export function getNavItemsByCategory(): Record<string, NavItem[]> {
  const grouped: Record<string, NavItem[]> = {
    home: [],
    demo: [],
    tools: [],
    advanced: [],
  }
  
  NAV_ITEMS.forEach(item => {
    if (item.path === '/') {
      grouped.home.push(item)
    } else if (item.category) {
      grouped[item.category].push(item)
    }
  })
  
  return grouped
}
