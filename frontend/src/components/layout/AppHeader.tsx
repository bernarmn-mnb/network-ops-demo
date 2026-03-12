import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  EuiHeader,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiPopover,
  EuiButtonIcon,
  EuiContextMenu,
  EuiIcon,
  EuiImage,
} from '@elastic/eui'
import { ThemeToggle } from './ThemeToggle'
import { BrandSwitcher } from '../branding/BrandSwitcher'
import { useBrand } from '../providers/BrandedThemeProvider'
import { getNavLayout } from './navigationConfig'
import { NAV_LAYOUT, NAV_PAGES } from '../../config/demoConfig'

/**
 * App Header Component
 * 
 * Main application header with:
 * - Brand logo (from context) - logo should include brand name/text
 * - Consistent navigation across all pages
 * - Brand switcher for demos
 * - Dark/light mode toggle
 * 
 * Note: Uses --brand-header-background if defined, otherwise --brand-primary
 */
export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { brand } = useBrand()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { main: mainItems, more: moreItems } = getNavLayout(NAV_LAYOUT, NAV_PAGES)
  const currentPath = location.pathname
  const isOnMorePage = moreItems.some(item => item.path === currentPath)

  // Use header-specific colors if defined, otherwise fall back to primary
  const hasHeaderBackground = brand.colors.headerBackground
  const headerBgColor = hasHeaderBackground 
    ? 'var(--brand-header-background)' 
    : 'var(--brand-primary)'
  const headerTextColor = brand.colors.headerText || '#FFFFFF'
  
  // Get the logo source — prefer logoDark for the header since header bg is always dark
  const logoSrc = brand.logoDark?.url || brand.logoDark?.svgDataUrl || brand.logo.url || brand.logo.svgDataUrl
  
  // Check if logo contains text - prefer explicit flag when available
  // If true, we don't show the brand name separately (avoids duplication)
  const logoContainsText = brand.logo.logoContainsText ?? 
    !!brand.logo.svgDataUrl?.toLowerCase().includes('<text')
  
  // Get header height from layout config
  const headerHeight = brand.layout?.headerHeight || '48px'
  
  return (
    <EuiHeader 
      position="fixed"
      style={{
        backgroundColor: headerBgColor,
        borderBottom: 'none',
        height: headerHeight,
        minHeight: headerHeight,
      }}
    >
      <EuiHeaderSection grow={false}>
        <EuiHeaderSectionItem>
          <a 
            href="/"
            onClick={(e) => {
              e.preventDefault()
              navigate('/')
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              textDecoration: 'none',
              padding: '0 8px',
            }}
          >
            {logoSrc ? (
              <EuiImage
                src={logoSrc}
                alt={brand.logo.alt}
                style={{ height: '28px', width: 'auto' }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: headerTextColor,
                  borderRadius: 'var(--brand-border-radius-small, 4px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: headerBgColor,
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {brand.name.charAt(0)}
              </div>
            )}
            {/* Only show brand name if logo doesn't already contain text */}
            {!logoContainsText && (
              <span style={{ 
                color: headerTextColor,
                fontWeight: 600,
                fontSize: '16px',
                fontFamily: 'var(--brand-font-heading)',
              }}>
                {brand.name}
              </span>
            )}
          </a>
        </EuiHeaderSectionItem>
        
        {/* Brand Switcher - subtle wrench icon */}
        <EuiHeaderSectionItem>
          <BrandSwitcher />
        </EuiHeaderSectionItem>
      </EuiHeaderSection>

      <EuiHeaderSection side="right">
        <EuiHeaderSectionItem>
          <ThemeToggle />
        </EuiHeaderSectionItem>

        {/* Navigation Menu */}
        <EuiHeaderSectionItem>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="menu"
                aria-label="Navigation menu"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                size="s"
                style={{ color: headerTextColor }}
              />
            }
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={[
                {
                  id: 0,
                  items: [
                    ...mainItems.map((item) => ({
                      name: item.label,
                      icon: <EuiIcon type={item.icon} />,
                      onClick: () => {
                        navigate(item.path)
                        setIsMenuOpen(false)
                      },
                      isSelected: currentPath === item.path,
                    })),
                    ...(moreItems.length > 0
                      ? [{
                          name: `More pages${isOnMorePage ? ' •' : ''}`,
                          icon: <EuiIcon type="apps" />,
                          panel: 1,
                        }]
                      : []),
                  ],
                },
                {
                  id: 1,
                  title: 'More pages',
                  items: moreItems.map((item) => ({
                    name: item.label,
                    icon: <EuiIcon type={item.icon} />,
                    onClick: () => {
                      navigate(item.path)
                      setIsMenuOpen(false)
                    },
                    isSelected: currentPath === item.path,
                  })),
                },
              ]}
            />
          </EuiPopover>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  )
}
