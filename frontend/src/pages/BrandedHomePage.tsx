/**
 * BrandedHomePage — Reusable homepage template
 *
 * A data-driven, brand-aware homepage with:
 *   - Hero banner (brand heroImage + gradient overlay)
 *   - Category grid (from homeConfig or props)
 *   - Featured items rail (auto-populated from search index)
 *   - Assistant CTA panel
 *   - Optional persona greeting
 *
 * Usage:
 *   <BrandedHomePage />                    — uses homeConfig defaults
 *   <BrandedHomePage config={myConfig} />  — custom configuration
 *
 * The component reads brand colors, heroImage, and gradients from the
 * BrandedThemeProvider context. No hardcoded colors.
 */

import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiButton,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiLoadingSpinner,
  EuiTitle,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { useBrand } from '../components/providers/BrandedThemeProvider'
import { SearchResultCard } from '../components/search/SearchResultCard'
import { BrandedEmptyState } from '../components/common/BrandedEmptyState'
import { FloatingChatWidget } from '../components/chat/FloatingChatWidget'
import { homeConfig as defaultConfig, type HomePageConfig } from '../config/homeConfig'

interface SearchHit {
  id: string
  score: number
  source: Record<string, unknown>
  highlight?: Record<string, string[]>
}

interface BrandedHomePageProps {
  config?: HomePageConfig
}

export function BrandedHomePage({ config }: BrandedHomePageProps) {
  const cfg = config || defaultConfig
  const navigate = useNavigate()
  const { brand } = useBrand()

  const [products, setProducts] = useState<SearchHit[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState<string | null>(null)

  useEffect(() => {
    if (!cfg.featured) {
      setProductsLoading(false)
      return
    }

    let cancelled = false
    const fetchProducts = async () => {
      setProductsLoading(true)
      setProductsError(null)
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: cfg.featured!.query || '*',
            page: 1,
            page_size: cfg.featured!.count || 6,
          }),
        })
        if (!response.ok) throw new Error('Search failed')
        const data = await response.json()
        if (!cancelled) setProducts(data.hits || [])
      } catch (err) {
        if (!cancelled) {
          setProductsError(err instanceof Error ? err.message : 'Failed to load')
          setProducts([])
        }
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [cfg.featured])

  const headerHeight = parseInt(brand.layout?.headerHeight || '56', 10)

  // Hero background: config override > brand heroImage > brand gradient > fallback
  const heroBackground = cfg.hero.backgroundImage
    || brand.heroImage?.url
    || undefined

  const heroOverlay = cfg.hero.overlayColor
    || brand.heroImage?.overlay
    || (brand.gradients?.hero
      ? undefined  // will use gradient directly
      : `var(--brand-primary, rgba(0, 0, 0, 0.5))`)

  const heroStyle: React.CSSProperties = heroBackground
    ? {
        backgroundImage: `url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: brand.heroImage?.position || 'center',
      }
    : {
        background: brand.gradients?.hero
          || brand.gradients?.primary
          || 'var(--brand-primary)',
      }

  return (
    <>
      <AppHeader />
      <div style={{ paddingTop: headerHeight }}>
        {/* --- Hero Banner --- */}
        <section
          style={{
            position: 'relative',
            width: '100%',
            minHeight: 400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...heroStyle,
          }}
        >
          {heroBackground && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: heroOverlay,
              }}
            />
          )}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              padding: 24,
              maxWidth: 640,
            }}
          >
            {cfg.personaGreeting && (
              <p style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: '1rem',
                marginBottom: 4,
              }}>
                {cfg.personaGreeting}
              </p>
            )}
            <h1
              style={{
                fontFamily: 'var(--brand-font-heading)',
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                color: '#FFFFFF',
                margin: 0,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {cfg.hero.title.replace('{brand}', brand.name)}
            </h1>
            <p
              style={{
                fontSize: '1.125rem',
                color: 'rgba(255,255,255,0.95)',
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              {cfg.hero.subtitle}
            </p>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" justifyContent="center" wrap>
              {cfg.hero.primaryAction && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={() => navigate(cfg.hero.primaryAction!.path)}
                    style={{
                      backgroundColor: 'var(--brand-primary)',
                      borderColor: 'var(--brand-primary)',
                      color: '#FFFFFF',
                    }}
                  >
                    {cfg.hero.primaryAction.label}
                  </EuiButton>
                </EuiFlexItem>
              )}
              {cfg.hero.secondaryAction && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => navigate(cfg.hero.secondaryAction!.path)}
                    style={{
                      borderColor: '#FFFFFF',
                      color: '#FFFFFF',
                    }}
                  >
                    {cfg.hero.secondaryAction.label}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </div>
        </section>

        {/* --- Main Content --- */}
        <div
          style={{
            maxWidth: brand.layout?.maxWidth || '1200px',
            margin: '0 auto',
            padding: brand.layout?.containerPadding || '24px',
          }}
        >
          {/* --- Categories Grid --- */}
          {cfg.categories.length > 0 && (
            <>
              <EuiSpacer size="xl" />
              <EuiTitle size="m">
                <h2 style={{ color: 'var(--euiTextColor)' }}>{cfg.categoriesTitle || 'Browse Categories'}</h2>
              </EuiTitle>
              <EuiSpacer size="m" />
              <EuiFlexGroup gutterSize="m" wrap>
                {cfg.categories.map((cat) => (
                  <EuiFlexItem
                    key={cat.id}
                    style={{ minWidth: 200, flex: '1 1 200px' }}
                  >
                    <EuiCard
                      layout="vertical"
                      image={cat.image}
                      title={cat.title}
                      description={cat.description}
                      onClick={() => navigate(cat.path)}
                      paddingSize="m"
                      style={{ height: '100%', cursor: 'pointer' }}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </>
          )}

          {/* --- Featured Items --- */}
          {cfg.featured && (
            <>
              <EuiSpacer size="xxl" />
              <EuiTitle size="m">
                <h2 style={{ color: 'var(--euiTextColor)' }}>
                  {cfg.featured.title}
                </h2>
              </EuiTitle>
              <EuiSpacer size="m" />

              {productsLoading ? (
                <EuiFlexGroup justifyContent="center">
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="xl" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : productsError ? (
                <BrandedEmptyState
                  iconType="offline"
                  title="Couldn't load products"
                  body={productsError}
                  size="s"
                />
              ) : products.length === 0 ? (
                <BrandedEmptyState
                  iconType="package"
                  title="No products yet"
                  body="Products will appear here once data is indexed."
                  size="s"
                />
              ) : (
                <EuiFlexGroup gutterSize="m" wrap>
                  {products.map((hit, idx) => (
                    <EuiFlexItem
                      key={hit.id}
                      style={{ minWidth: 200, flex: '1 1 200px' }}
                    >
                      <SearchResultCard
                        source={hit.source}
                        id={hit.id}
                        score={hit.score}
                        highlight={hit.highlight}
                        position={idx + 1}
                        onClick={() => navigate('/search')}
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              )}
            </>
          )}

          {/* --- Assistant CTA --- */}
          {cfg.assistantCta && (
            <>
              <EuiSpacer size="xxl" />
              <EuiPanel
                paddingSize="xl"
                style={{
                  background: brand.gradients?.primary || 'var(--brand-accent)',
                  border: 'none',
                  borderRadius: 'var(--brand-border-radius, 8px)',
                }}
              >
                <EuiFlexGroup alignItems="center" gutterSize="xl" wrap>
                  <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
                    <EuiTitle size="s">
                      <h3 style={{ color: '#FFFFFF', margin: 0 }}>
                        {cfg.assistantCta.title}
                      </h3>
                    </EuiTitle>
                    <EuiSpacer size="s" />
                    <EuiText style={{ color: 'rgba(255,255,255,0.95)' }}>
                      {cfg.assistantCta.body}
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      fill
                      onClick={() => navigate(cfg.assistantCta!.path)}
                      style={{
                        backgroundColor: '#FFFFFF',
                        color: 'var(--brand-primary)',
                        borderColor: '#FFFFFF',
                      }}
                    >
                      {cfg.assistantCta.buttonLabel}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </>
          )}

          <EuiSpacer size="xxl" />
        </div>
      </div>

      <FloatingChatWidget
        title={`${brand.name} Assistant`}
        greeting={`Welcome to ${brand.name}! I can help you discover products and find what you need. What would you like to explore?`}
        placeholder="Ask me anything..."
      />
    </>
  )
}

export default BrandedHomePage
