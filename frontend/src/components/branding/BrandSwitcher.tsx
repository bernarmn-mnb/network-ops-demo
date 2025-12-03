import {
  EuiPopover,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiPanel,
} from '@elastic/eui'
import { useState } from 'react'
import { useBrand } from '../providers/BrandedThemeProvider'

/**
 * Brand Switcher Component (Subtle Version)
 * 
 * Inconspicuous gear icon that opens brand selection.
 * Hidden by default - only shows when ?showBrandSwitcher=true in URL
 * or when holding Shift key while hovering over header area.
 */
export function BrandSwitcher() {
  const { brandId, setBrand, availableBrands } = useBrand()
  const [isOpen, setIsOpen] = useState(false)

  // Check if we should show the switcher (dev mode or explicit param)
  const showSwitcher = typeof window !== 'undefined' && (
    window.location.search.includes('showBrandSwitcher=true') ||
    window.location.hostname === 'localhost'
  )

  if (!showSwitcher) {
    return null
  }

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          iconType="wrench"
          aria-label="Brand settings"
          onClick={() => setIsOpen(!isOpen)}
          color="text"
          size="s"
          style={{ opacity: 0.5 }}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="m"
      anchorPosition="downRight"
    >
      <div style={{ width: '240px' }}>
        <EuiText size="xs" color="subdued">
          <strong>Brand Theme</strong>
        </EuiText>
        <EuiSpacer size="s" />
        
        {availableBrands.map((b) => (
          <EuiPanel
            key={b.id}
            paddingSize="s"
            hasShadow={false}
            hasBorder={b.id === brandId}
            color={b.id === brandId ? 'primary' : 'transparent'}
            onClick={() => {
              setBrand(b.id)
              setIsOpen(false)
            }}
            style={{ 
              cursor: 'pointer',
              marginBottom: '4px',
            }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: b.colors.primary,
                      borderRadius: '3px',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: b.colors.accent || b.colors.primary,
                      borderRadius: '3px',
                      border: '1px solid rgba(0,0,0,0.1)',
                    }}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <strong>{b.name}</strong>
                </EuiText>
                {b.sourceUrl && (
                  <EuiText size="xs" color="subdued">
                    {new URL(b.sourceUrl).hostname}
                  </EuiText>
                )}
              </EuiFlexItem>
              {b.id === brandId && (
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="success">✓</EuiText>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiPanel>
        ))}
        
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          <em>Add ?showBrandSwitcher=false to hide</em>
        </EuiText>
      </div>
    </EuiPopover>
  )
}

/**
 * Keyboard shortcut to toggle brand (for demos)
 * Ctrl+Shift+B cycles through brands
 */
export function useBrandKeyboardShortcut() {
  const { brandId, setBrand, availableBrands } = useBrand()
  
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault()
        const currentIndex = availableBrands.findIndex(b => b.id === brandId)
        const nextIndex = (currentIndex + 1) % availableBrands.length
        setBrand(availableBrands[nextIndex].id)
      }
    })
  }
}
