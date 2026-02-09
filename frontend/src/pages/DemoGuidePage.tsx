import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiPanel,
  EuiBadge,
  EuiHorizontalRule,
  EuiLink,
  EuiCallOut,
  EuiButtonEmpty,
  EuiAccordion,
  EuiButtonGroup,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { DEMO_TRACKS, type DemoScenario } from '../config/demoTracks'
import { NAV_PAGES, DEMO_TITLE, DEMO_SUBTITLE } from '../config/demoConfig'
import { NAV_ITEMS } from '../components/layout/navigationConfig'

/**
 * Demo Guide Page - Template for documenting your demo
 * 
 * CUSTOMIZE THIS FILE for your specific demo!
 * 
 * This page helps presenters:
 * 1. Understand what the demo shows
 * 2. Follow a recommended demo flow
 * 3. Have talking points ready
 * 4. Quick-launch demo scenarios
 * 
 * FEATURES:
 * - Multiple demo tracks (e.g., "Track A: Chat", "Track B: Analytics")
 * - Collapsible scenario sections with steps and talking points
 * - Demo pills for quick navigation to pages
 * - Resource links to documentation
 * 
 * See docs/PAGES.md for more customization options.
 */

// =============================================================================
// CUSTOMIZE: Demo Configuration
// =============================================================================

const DEMO_CONFIG = {
  title: DEMO_TITLE || 'Demo Guide',
  subtitle: DEMO_SUBTITLE || 'Choose your demo track and follow the guided flow',
}

// =============================================================================
// Components
// =============================================================================

/**
 * Demo pill - quick navigation button
 */
interface DemoPillProps {
  label: string
  path: string
  query?: string
}

function DemoPill({ label, path, query }: DemoPillProps) {
  const navigate = useNavigate()
  
  const handleClick = () => {
    const url = query ? `${path}?q=${encodeURIComponent(query)}` : path
    navigate(url)
  }
  
  return (
    <EuiButtonEmpty
      size="s"
      iconType="arrowRight"
      onClick={handleClick}
      style={{ marginRight: 8, marginBottom: 4 }}
    >
      {label}
    </EuiButtonEmpty>
  )
}

/**
 * Resource link component
 */
interface ResourceLinkProps {
  href: string
  label: string
  type: 'docs' | 'blog'
}

function ResourceLink({ href, label, type }: ResourceLinkProps) {
  return (
    <EuiLink href={href} target="_blank" external>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={type === 'docs' ? 'documentation' : 'article'} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {label}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiLink>
  )
}

/**
 * Demo section - collapsible scenario
 */
interface DemoSectionProps {
  scenario: DemoScenario
  defaultExpanded?: boolean
}

function DemoSection({ scenario, defaultExpanded = false }: DemoSectionProps) {
  const buttonContent = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {scenario.badge && (
        <EuiFlexItem grow={false}>
          <EuiBadge color={scenario.badgeColor || 'primary'}>{scenario.badge}</EuiBadge>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiText size="s"><strong>{scenario.title}</strong></EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  )
  
  return (
    <EuiPanel paddingSize="m" hasBorder style={{ marginBottom: 12 }}>
      <EuiAccordion
        id={scenario.id}
        buttonContent={buttonContent}
        initialIsOpen={defaultExpanded}
        paddingSize="m"
      >
        {/* Key Insight */}
        <EuiText size="s">
          <p><strong>Key Insight:</strong> {scenario.keyInsight}</p>
        </EuiText>
        
        {/* Steps */}
        {scenario.steps && scenario.steps.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiCallOut title="Demo Steps" iconType="listAdd" size="s">
              <EuiText size="xs">
                <ol>
                  {scenario.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </EuiText>
            </EuiCallOut>
          </>
        )}
        
        {/* Talking Points */}
        {scenario.talkingPoints && scenario.talkingPoints.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="xs" color="subdued">
              <strong>Talking points:</strong>
              <ul>
                {scenario.talkingPoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </EuiText>
          </>
        )}
        
        {/* Demo Pills */}
        {scenario.demoPills && scenario.demoPills.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s"><strong>Try it:</strong></EuiText>
            <EuiSpacer size="xs" />
            {scenario.demoPills.map((pill, i) => (
              <DemoPill key={i} {...pill} />
            ))}
          </>
        )}
        
        {/* Resources */}
        {scenario.resources && scenario.resources.length > 0 && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" wrap>
              {scenario.resources.map((resource, i) => (
                <EuiFlexItem grow={false} key={i}>
                  <ResourceLink {...resource} />
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function DemoGuidePage() {
  const [selectedTrackId, setSelectedTrackId] = useState(DEMO_TRACKS[0]?.id || 'a')
  const selectedTrack = DEMO_TRACKS.find(t => t.id === selectedTrackId) || DEMO_TRACKS[0]

  // Build button group options from tracks
  const trackOptions = DEMO_TRACKS.map(track => ({
    id: track.id,
    label: track.title,
  }))

  // Quick Start cards — auto-generated from NAV_PAGES (if configured) or sensible defaults
  const quickStartItems = useMemo(() => {
    const DEFAULT_QUICK_START = ['/chat', '/branded', '/']
    const paths = NAV_PAGES ?? DEFAULT_QUICK_START
    // Exclude /guide (we're already here) and limit to 4 cards
    return paths
      .filter(p => p !== '/guide')
      .slice(0, 4)
      .map(path => {
        const nav = NAV_ITEMS.find(n => n.path === path)
        return {
          path,
          label: nav?.label ?? path,
          icon: nav?.icon ?? 'link',
          description: nav?.description ?? '',
        }
      })
  }, [])

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate restrictWidth={1000} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Hero Section */}
          <EuiFlexGroup alignItems="center" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiIcon type="training" size="xxl" color="primary" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>{DEMO_CONFIG.title}</h1>
              </EuiTitle>
              <EuiText color="subdued">
                <p>{DEMO_CONFIG.subtitle}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Track Selection Cards */}
          <EuiFlexGroup gutterSize="l">
            {DEMO_TRACKS.map(track => (
              <EuiFlexItem key={track.id}>
                <EuiCard
                  title={track.title}
                  titleSize="s"
                  description={track.description}
                  footer={
                    <EuiFlexGroup gutterSize="s" wrap>
                      {track.badges.map((badge, i) => (
                        <EuiFlexItem grow={false} key={i}>
                          <EuiBadge color={track.color}>{badge}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  }
                  selectable={{
                    onClick: () => setSelectedTrackId(track.id),
                    isSelected: selectedTrackId === track.id,
                  }}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Track Selector (mobile-friendly alternative) */}
          <EuiButtonGroup
            legend="Select demo track"
            options={trackOptions}
            idSelected={selectedTrackId}
            onChange={(id) => setSelectedTrackId(id)}
            buttonSize="m"
            isFullWidth
          />

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Selected Track Content */}
          <EuiTitle size="m">
            <h2>{selectedTrack.title}</h2>
          </EuiTitle>
          
          <EuiSpacer size="m" />

          {/* Value Proposition */}
          <EuiCallOut
            title={selectedTrack.valueProposition.title}
            iconType={selectedTrack.valueProposition.icon}
            color={selectedTrack.color}
          >
            <EuiText size="s">
              <p>{selectedTrack.valueProposition.content}</p>
            </EuiText>
          </EuiCallOut>

          <EuiSpacer size="l" />

          {/* Demo Scenarios for Selected Track */}
          {selectedTrack.scenarios.map((scenario, i) => (
            <DemoSection 
              key={scenario.id} 
              scenario={scenario} 
              defaultExpanded={i === 0}
            />
          ))}

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Quick Start */}
          <EuiTitle size="m">
            <h2>Quick Start</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          
          <EuiFlexGroup gutterSize="m">
            {quickStartItems.map(item => (
              <EuiFlexItem key={item.path}>
                <Link to={item.path} style={{ textDecoration: 'none' }}>
                  <EuiCard
                    icon={<EuiIcon type={item.icon} size="l" />}
                    title={item.label}
                    titleSize="xs"
                    description={item.description}
                    paddingSize="m"
                  />
                </Link>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Key Messages for Selected Track */}
          <EuiPanel color="subdued" paddingSize="l">
            <EuiTitle size="s">
              <h3>Key Messages</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText size="s">
              <ul>
                {selectedTrack.keyMessages.map((message, i) => (
                  <li key={i}>{message}</li>
                ))}
              </ul>
            </EuiText>
          </EuiPanel>

          <EuiSpacer size="xxl" />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}
