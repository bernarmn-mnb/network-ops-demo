import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'
import { EuiProvider, EuiThemeColorMode } from '@elastic/eui'
import createCache from '@emotion/cache'
import { BrandTheme, brands as staticBrands, getSelectedBrandId, setSelectedBrand as persistBrand, addBrand } from '../../branding'

/**
 * Branded Theme Provider
 * 
 * Combines brand theming with dark/light mode:
 * - Brand colors adapt to dark/light mode
 * - Single provider for entire app
 * - Injects CSS variables globally
 */

// Create Emotion cache for EUI styles
const euiCache = createCache({
  key: 'eui',
  container: document.head,
})
euiCache.compat = true

// ============================================================================
// Combined Context Type
// ============================================================================

interface BrandedThemeContextType {
  // Theme mode
  colorMode: EuiThemeColorMode
  setColorMode: (mode: EuiThemeColorMode) => void
  toggleColorMode: () => void
  
  // Branding
  brand: BrandTheme
  brandId: string
  setBrand: (brandId: string) => void
  availableBrands: BrandTheme[]
  refreshBrands: () => Promise<void>
}

const BrandedThemeContext = createContext<BrandedThemeContextType | null>(null)

// ============================================================================
// Hook to access context
// ============================================================================

export function useBrandedTheme(): BrandedThemeContextType {
  const context = useContext(BrandedThemeContext)
  if (!context) {
    throw new Error('useBrandedTheme must be used within BrandedThemeProvider')
  }
  return context
}

// Legacy hooks for backwards compatibility
export function useTheme() {
  const { colorMode, setColorMode, toggleColorMode } = useBrandedTheme()
  return { colorMode, setColorMode, toggleColorMode }
}

export function useBrand() {
  const { brand, brandId, setBrand, availableBrands, refreshBrands } = useBrandedTheme()
  return { brand, brandId, setBrand, availableBrands, refreshBrands }
}

// ============================================================================
// CSS Variable Generation
// ============================================================================

function generateCssVariables(brand: BrandTheme, colorMode: EuiThemeColorMode): string {
  const isDark = colorMode === 'dark'
  
  // Adjust colors for dark mode
  const adjustedColors = isDark ? {
    // In dark mode, swap background and adjust text colors
    primary: brand.colors.primary,
    accent: brand.colors.accent,
    background: '#1D1E24',  // Dark background
    surface: '#25262E',     // Slightly lighter surface
    white: '#25262E',       // Cards become dark
    black: '#FFFFFF',       // Text becomes white
    textPrimary: '#FFFFFF',
    textBody: '#B4B7C1',
    border: '#404040',
  } : {
    // Light mode uses brand colors directly
    primary: brand.colors.primary,
    accent: brand.colors.accent,
    background: brand.colors.background,
    surface: brand.colors.white,
    white: brand.colors.white,
    black: brand.colors.black,
    textPrimary: brand.colors.textPrimary,
    textBody: brand.colors.textBody,
    border: brand.colors.border,
  }
  
  return `
    :root {
      /* Brand Colors (mode-aware) */
      --brand-primary: ${adjustedColors.primary};
      --brand-accent: ${adjustedColors.accent};
      --brand-background: ${adjustedColors.background};
      --brand-surface: ${adjustedColors.surface};
      --brand-white: ${adjustedColors.white};
      --brand-black: ${adjustedColors.black};
      --brand-text-primary: ${adjustedColors.textPrimary};
      --brand-text-body: ${adjustedColors.textBody};
      --brand-border: ${adjustedColors.border};
      
      /* Brand Spacing */
      --brand-border-radius: ${brand.spacing.borderRadius};
      --brand-border-radius-small: ${brand.spacing.borderRadiusSmall};
      
      /* Brand Fonts */
      --brand-font-heading: ${brand.fonts.heading};
      --brand-font-body: ${brand.fonts.body};
      
      /* Original brand colors (unmodified) */
      --brand-primary-original: ${brand.colors.primary};
      --brand-accent-original: ${brand.colors.accent};
    }
    
    /* Global body styles */
    body {
      background-color: var(--brand-background);
      color: var(--brand-text-body);
      transition: background-color 0.2s ease, color 0.2s ease;
    }
  `
}

// ============================================================================
// Provider Component
// ============================================================================

interface BrandedThemeProviderProps {
  children: ReactNode
  defaultBrandId?: string
  defaultColorMode?: EuiThemeColorMode
}

// API Brand type (simplified version from backend)
interface ApiBrand {
  id: string
  name: string
  colors: {
    primary: string
    accent: string
    background: string
    text: string
  }
  logoLight?: { url: string; alt: string }
  logoDark?: { url: string; alt: string }
}

// Convert API brand to full BrandTheme
function apiBrandToTheme(api: ApiBrand): BrandTheme {
  return {
    id: api.id,
    name: api.name,
    sourceUrl: '',
    extractedAt: '',
    colors: {
      primary: api.colors.primary,
      accent: api.colors.accent,
      background: api.colors.background,
      white: '#FFFFFF',
      black: '#1A1C21',
      textPrimary: api.colors.text,
      textBody: api.colors.text,
      border: '#D3DAE6',
    },
    fonts: {
      heading: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
      fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    spacing: {
      borderRadius: '6px',
      borderRadiusSmall: '4px',
    },
    logo: {
      svgDataUrl: api.logoLight?.url || '',
      alt: api.logoLight?.alt || api.name,
    },
  }
}

export function BrandedThemeProvider({ 
  children,
  defaultBrandId,
  defaultColorMode = 'light',
}: BrandedThemeProviderProps) {
  // Initialize brand from URL/localStorage
  const [brandId, setBrandId] = useState<string>(() => {
    return defaultBrandId || getSelectedBrandId()
  })
  
  // Track all brands (static + API)
  const [allBrands, setAllBrands] = useState<Record<string, BrandTheme>>(staticBrands)
  
  // Initialize color mode from localStorage/system preference
  const [colorMode, setColorMode] = useState<EuiThemeColorMode>(() => {
    const saved = localStorage.getItem('eui-theme') as EuiThemeColorMode | null
    if (saved === 'light' || saved === 'dark') return saved
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return defaultColorMode
  })
  
  // Fetch brands from API and merge with static brands
  const refreshBrands = useCallback(async () => {
    try {
      const response = await fetch('/api/branding/')
      if (response.ok) {
        const apiBrands: ApiBrand[] = await response.json()
        
        // Merge API brands with static brands (static themes take priority)
        const merged = { ...staticBrands }
        for (const apiBrand of apiBrands) {
          // Only add if not already in static brands
          if (!staticBrands[apiBrand.id]) {
            const theme = apiBrandToTheme(apiBrand)
            merged[apiBrand.id] = theme
            addBrand(theme) // Also add to in-memory registry for other components
          }
        }
        setAllBrands(merged)
      }
    } catch {
      // API not available, use static brands only
      console.log('Brand API not available, using static brands')
    }
  }, [])
  
  // Fetch brands on mount
  useEffect(() => {
    refreshBrands()
  }, [refreshBrands])
  
  const brand = allBrands[brandId] || allBrands.default || staticBrands.default
  const availableBrands = Object.values(allBrands)
  
  // Inject CSS variables when brand or color mode changes
  useEffect(() => {
    const styleId = 'branded-theme-variables'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    
    styleEl.textContent = generateCssVariables(brand, colorMode)
    
    // Set data attributes for CSS targeting
    document.body.setAttribute('data-brand', brandId)
    document.body.setAttribute('data-theme', colorMode)
    document.documentElement.classList.toggle('dark', colorMode === 'dark')
  }, [brand, brandId, colorMode])
  
  // Persist color mode
  useEffect(() => {
    localStorage.setItem('eui-theme', colorMode)
  }, [colorMode])
  
  const toggleColorMode = () => {
    setColorMode(prev => prev === 'light' ? 'dark' : 'light')
  }
  
  const setBrand = (newBrandId: string) => {
    // Set the brand ID - if it doesn't exist, the fallback in `brand` will handle it
    setBrandId(newBrandId)
    persistBrand(newBrandId)
  }
  
  const contextValue: BrandedThemeContextType = {
    colorMode,
    setColorMode,
    toggleColorMode,
    brand,
    brandId,
    setBrand,
    availableBrands,
    refreshBrands,
  }
  
  return (
    <BrandedThemeContext.Provider value={contextValue}>
      <EuiProvider colorMode={colorMode} cache={euiCache}>
        {children}
      </EuiProvider>
    </BrandedThemeContext.Provider>
  )
}

