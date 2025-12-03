import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { EuiProvider, EuiThemeColorMode } from '@elastic/eui'
import createCache from '@emotion/cache'
import { BrandTheme, brands, getSelectedBrandId, setSelectedBrand as persistBrand } from '../../branding'

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
  const { brand, brandId, setBrand, availableBrands } = useBrandedTheme()
  return { brand, brandId, setBrand, availableBrands }
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

export function BrandedThemeProvider({ 
  children,
  defaultBrandId,
  defaultColorMode = 'light',
}: BrandedThemeProviderProps) {
  // Initialize brand from URL/localStorage
  const [brandId, setBrandId] = useState<string>(() => {
    return defaultBrandId || getSelectedBrandId()
  })
  
  // Initialize color mode from localStorage/system preference
  const [colorMode, setColorMode] = useState<EuiThemeColorMode>(() => {
    const saved = localStorage.getItem('eui-theme') as EuiThemeColorMode | null
    if (saved === 'light' || saved === 'dark') return saved
    
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
    return defaultColorMode
  })
  
  const brand = brands[brandId] || brands.default
  const availableBrands = Object.values(brands)
  
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
    if (brands[newBrandId]) {
      setBrandId(newBrandId)
      persistBrand(newBrandId)
    }
  }
  
  const contextValue: BrandedThemeContextType = {
    colorMode,
    setColorMode,
    toggleColorMode,
    brand,
    brandId,
    setBrand,
    availableBrands,
  }
  
  return (
    <BrandedThemeContext.Provider value={contextValue}>
      <EuiProvider colorMode={colorMode} cache={euiCache}>
        {children}
      </EuiProvider>
    </BrandedThemeContext.Provider>
  )
}

