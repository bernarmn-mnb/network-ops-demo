import {
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiImage,
  EuiCard,
  EuiIcon,
} from '@elastic/eui'
import { useBrand } from '../components/providers/BrandedThemeProvider'
import { AppHeader } from '../components/layout/AppHeader'

/**
 * Branded Demo Page
 *
 * Showcases the current brand theme with dynamic content.
 * Uses brand context for all colors and styling via CSS variables.
 * Note: BrandProvider is at app root, no need to wrap again here.
 */
export function BrandedDemoPage() {
  const { brand } = useBrand()

  return (
    <div style={{ backgroundColor: 'var(--brand-background)', minHeight: '100vh' }}>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="xxl" />

      <EuiPageTemplate panelled={false} grow={true} restrictWidth={1000}>
        <EuiPageTemplate.Section>
          {/* Hero Section */}
          <EuiPanel
            paddingSize="xl"
            style={{
              backgroundColor: 'var(--brand-white)',
              borderRadius: 'var(--brand-border-radius)',
              border: '1px solid var(--brand-border)',
            }}
          >
            <EuiFlexGroup alignItems="center" gutterSize="xl">
              <EuiFlexItem grow={false}>
                {brand.logo.svgDataUrl ? (
                  <EuiImage
                    src={brand.logo.svgDataUrl}
                    alt={brand.logo.alt}
                    style={{ height: '80px', width: 'auto' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      backgroundColor: 'var(--brand-primary)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-white)',
                      fontSize: '32px',
                      fontWeight: 700,
                    }}
                  >
                    {brand.name.charAt(0)}
                  </div>
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="l">
                  <h1 style={{ color: 'var(--brand-text-primary)' }}>
                    Welcome to {brand.name} Demo
                  </h1>
                </EuiTitle>
                <EuiSpacer size="m" />
                <EuiText style={{ color: 'var(--brand-text-body)' }}>
                  <p>
                    This demo showcases our AI-powered assistant, styled with your brand
                    colors and identity extracted automatically from your website.
                  </p>
                </EuiText>
                <EuiSpacer size="l" />
                <EuiFlexGroup gutterSize="m">
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      href="/chat"
                      style={{
                        backgroundColor: 'var(--brand-primary)',
                        borderColor: 'var(--brand-primary)',
                        borderRadius: 'var(--brand-border-radius)',
                      }}
                    >
                      Start Chat Demo
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      style={{
                        backgroundColor: 'var(--brand-black)',
                        color: 'var(--brand-white)',
                        borderColor: 'var(--brand-black)',
                        borderRadius: 'var(--brand-border-radius)',
                      }}
                    >
                      Learn More
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="xl" />

          {/* Feature Cards */}
          <EuiTitle size="m">
            <h2 style={{ color: 'var(--brand-text-primary)' }}>Demo Features</h2>
          </EuiTitle>
          <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem>
              <EuiCard
                title="AI Chat Assistant"
                titleSize="s"
                description="Intelligent conversational AI to help answer customer questions"
                icon={<EuiIcon type="comment" size="xl" style={{ color: 'var(--brand-primary)' }} />}
                style={{
                  borderRadius: 'var(--brand-border-radius)',
                  border: '1px solid var(--brand-border)',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                title="Document Search"
                titleSize="s"
                description="Search across your knowledge base with semantic understanding"
                icon={<EuiIcon type="search" size="xl" style={{ color: 'var(--brand-primary)' }} />}
                style={{
                  borderRadius: 'var(--brand-border-radius)',
                  border: '1px solid var(--brand-border)',
                }}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                title="Analytics Dashboard"
                titleSize="s"
                description="Real-time insights and metrics about customer interactions"
                icon={<EuiIcon type="apps" size="xl" style={{ color: 'var(--brand-primary)' }} />}
                style={{
                  borderRadius: 'var(--brand-border-radius)',
                  border: '1px solid var(--brand-border)',
                }}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Branding Info Panel - only shows in dev mode or with ?showBrandInfo=true */}
          {(window.location.hostname === 'localhost' || 
            window.location.search.includes('showBrandInfo=true')) && (
            <>
              <EuiSpacer size="xl" />
              <EuiPanel
                color="subdued"
                paddingSize="l"
                style={{
                  borderRadius: 'var(--brand-border-radius)',
                  backgroundColor: 'var(--brand-white)',
                  border: '1px solid var(--brand-border)',
                }}
              >
                <EuiTitle size="s">
                  <h3 style={{ color: 'var(--brand-text-primary)' }}>
                    🎨 Current Brand: {brand.name}
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                {brand.sourceUrl && (
                  <EuiText size="s" color="subdued">
                    <p>
                      Extracted from:{' '}
                      <a href={brand.sourceUrl} target="_blank" rel="noopener noreferrer">
                        {brand.sourceUrl}
                      </a>
                      {brand.extractedAt && ` on ${brand.extractedAt}`}
                    </p>
                  </EuiText>
                )}
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="m" wrap>
                  {Object.entries(brand.colors).map(([name, color]) => (
                    <EuiFlexItem key={name} grow={false}>
                      <div style={{ textAlign: 'center' }}>
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: color,
                            borderRadius: '8px',
                            border: '1px solid #ccc',
                            marginBottom: '4px',
                          }}
                        />
                        <EuiText size="xs">
                          <code>{color}</code>
                        </EuiText>
                        <EuiText size="xs" color="subdued">
                          {name}
                        </EuiText>
                      </div>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPanel>
            </>
          )}
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </div>
  )
}
