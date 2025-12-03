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
import { getNavItems } from './navigationConfig'

/**
 * App Header Component
 * 
 * Main application header with:
 * - Brand logo and name (from context)
 * - Consistent navigation across all pages
 * - Brand switcher for demos
 * - Dark/light mode toggle
 */
export function AppHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { brand } = useBrand()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navItems = getNavItems()
  const currentPath = location.pathname

  return (
    <EuiHeader 
      position="fixed"
      style={{
        backgroundColor: 'var(--brand-primary)',
        borderBottom: 'none',
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
            {brand.logo.svgDataUrl ? (
              <EuiImage
                src={brand.logo.svgDataUrl}
                alt={brand.logo.alt}
                style={{ height: '28px', width: 'auto' }}
              />
            ) : (
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: 'var(--brand-white)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                  fontSize: '14px',
                  fontWeight: 700,
                }}
              >
                {brand.name.charAt(0)}
              </div>
            )}
            <span style={{ 
              color: 'var(--brand-white)',
              fontWeight: 600,
              fontSize: '16px',
              fontFamily: 'var(--brand-font-heading)',
            }}>
              {brand.name}
            </span>
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
                style={{ color: 'var(--brand-white)' }}
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
                  items: navItems.map((item) => ({
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
