import { useState } from 'react'
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

/**
 * Basic demo info - UPDATE THESE for your demo
 */
import { DEMO_TITLE, DEMO_SUBTITLE } from '../config/demoConfig'

const DEMO_CONFIG = {
  title: DEMO_TITLE || 'Demo Guide',
  subtitle: DEMO_SUBTITLE || 'Choose your demo track and follow the guided flow',
}

/**
 * Demo tracks - define your different demo focus areas
 * 
 * Each track has:
 * - id: unique identifier
 * - title: display name with emoji
 * - description: short summary
 * - color: 'primary' or 'success' for visual distinction
 * - badges: key features shown as badges
 * - valueProposition: callout shown when track is selected
 * - scenarios: array of demo scenarios for this track
 */
interface DemoTrack {
  id: string
  title: string
  description: string
  color: 'primary' | 'success'
  badges: string[]
  valueProposition: {
    title: string
    icon: string
    content: string
  }
  scenarios: DemoScenario[]
  keyMessages: string[]
}

interface DemoScenario {
  id: string
  badge?: string
  badgeColor?: 'primary' | 'accent' | 'success' | 'warning'
  title: string
  keyInsight: string
  steps?: string[]
  talkingPoints?: string[]
  demoPills?: Array<{ label: string; path: string; query?: string }>
  resources?: Array<{ label: string; href: string; type: 'docs' | 'blog' }>
}

/**
 * External resources - links to docs, blogs, etc.
 */
const RESOURCES = {
  agentBuilder: {
    docs: 'https://www.elastic.co/docs/solutions/security/ai-assistant',
    blog: 'https://www.elastic.co/blog/elastic-ai-assistant',
  },
  elasticCloud: {
    docs: 'https://www.elastic.co/cloud',
  },
  eui: {
    docs: 'https://eui.elastic.co/',
  },
}

// =============================================================================
// CUSTOMIZE: Demo Tracks
// =============================================================================

/**
 * DEFINE YOUR DEMO TRACKS HERE
 * 
 * Example: Two tracks for an Agent Builder demo
 * - Track A: Core chat functionality
 * - Track B: Customization & debugging
 * 
 * Delete or modify these for your specific demo needs.
 */
const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'a',
    title: '💬 Track A: Agent Chat',
    description: 'Core chat functionality with Agent Builder',
    color: 'primary',
    badges: ['Streaming', 'Reasoning', 'Tool Calls'],
    valueProposition: {
      title: 'AI-Powered Conversations',
      icon: 'discuss',
      content: 'Agent Builder enables sophisticated AI assistants with streaming responses, visible reasoning steps, and tool integration. Build customer-facing chat experiences that show users how the AI thinks through problems.',
    },
    keyMessages: [
      '"Streaming responses feel instant — no waiting for the full answer"',
      '"Reasoning steps build trust by showing the AI\'s thought process"',
      '"Tool calls extend capabilities beyond just conversation"',
    ],
    scenarios: [
      {
        id: 'chat-basics',
        badge: '1',
        badgeColor: 'primary',
        title: 'Basic Chat Interaction',
        keyInsight: 'Agent Builder provides streaming responses with full reasoning visibility.',
        steps: [
          'Navigate to the Chat page',
          'Type a question and observe the streaming response',
          'Notice the reasoning steps appearing before the final answer',
          'Ask a follow-up question to show conversation context',
        ],
        talkingPoints: [
          'Responses stream in real-time for better UX',
          'Reasoning steps show how the agent thinks through the problem',
          'Conversation history is maintained for context',
        ],
        demoPills: [
          { label: 'Open Chat', path: '/chat' },
        ],
        resources: [
          { label: 'Agent Builder Docs', href: RESOURCES.agentBuilder.docs, type: 'docs' },
        ],
      },
      {
        id: 'tool-calls',
        badge: '2',
        badgeColor: 'primary',
        title: 'Tool Calls & Actions',
        keyInsight: 'Agents can use tools to search data, call APIs, and take actions.',
        steps: [
          'Ask a question that requires data lookup',
          'Observe the tool call card appearing',
          'Show the input/output of the tool',
          'See how the agent incorporates the result into its answer',
        ],
        talkingPoints: [
          'Tools extend agent capabilities beyond just chat',
          'Tool calls are visible for transparency',
          'The agent decides when and which tools to use',
        ],
        demoPills: [
          { label: 'Open Chat', path: '/chat' },
          { label: 'MCP Explorer', path: '/mcp' },
        ],
      },
      {
        id: 'audit',
        badge: '3',
        badgeColor: 'primary',
        title: 'Conversation Audit',
        keyInsight: 'Full visibility into agent reasoning and tool usage.',
        steps: [
          'Have a conversation in the Chat page',
          'Navigate to the Audit page',
          'Select the conversation',
          'Expand to see reasoning steps and tool calls',
        ],
        talkingPoints: [
          'Complete audit trail of all interactions',
          'Useful for debugging and quality assurance',
          'Shows exactly why the agent gave a certain response',
        ],
        demoPills: [
          { label: 'View Audit', path: '/audit' },
        ],
      },
    ],
  },
  {
    id: 'b',
    title: '🎨 Track B: Customization',
    description: 'Branding, theming, and presentation',
    color: 'success',
    badges: ['Branding', 'Themes', 'White-label'],
    valueProposition: {
      title: 'Quick Customization',
      icon: 'brush',
      content: 'Demos can be quickly rebranded for different customers without code changes. Support for multiple brand themes, dark/light modes, and AI-powered brand extraction from websites.',
    },
    keyMessages: [
      '"Rebrand in minutes, not days"',
      '"Same demo, different look for each customer"',
      '"AI can extract brand colors and fonts automatically"',
    ],
    scenarios: [
      {
        id: 'brand-editor',
        badge: '1',
        badgeColor: 'success',
        title: 'Brand Editor',
        keyInsight: 'Create custom themes with a visual editor — no code required.',
        steps: [
          'Open the Brand Editor page',
          'Create a new brand or select existing',
          'Adjust colors using the color pickers',
          'Upload a logo for light and dark modes',
          'Preview the changes in real-time',
        ],
        talkingPoints: [
          'Non-technical users can customize the look',
          'Changes persist across sessions',
          'Multiple brands can be saved and switched',
        ],
        demoPills: [
          { label: 'Brand Editor', path: '/brands' },
        ],
      },
      {
        id: 'branded-demo',
        badge: '2',
        badgeColor: 'success',
        title: 'Branded Presentation',
        keyInsight: 'Full-screen mode designed for customer presentations.',
        steps: [
          'Select a brand theme',
          'Navigate to the Branded Demo page',
          'Show the clean, full-screen interface',
          'Toggle between light and dark modes',
        ],
        talkingPoints: [
          'Distraction-free interface for demos',
          'Brand colors applied throughout',
          'Professional look for customer meetings',
        ],
        demoPills: [
          { label: 'Branded Demo', path: '/branded' },
        ],
      },
      {
        id: 'ai-extraction',
        badge: '⭐',
        badgeColor: 'accent',
        title: 'AI Brand Extraction',
        keyInsight: 'AI can extract brand colors, fonts, and style from any website.',
        steps: [
          'Tell your AI assistant: "Extract branding from [customer-website.com]"',
          'AI visits the site and identifies brand elements',
          'A complete theme file is generated automatically',
          'Brand is immediately available in the editor',
        ],
        talkingPoints: [
          'Works with any public website',
          'Extracts primary colors, accent colors, fonts',
          'Creates production-ready theme code',
        ],
        resources: [
          { label: 'Branding Docs', href: RESOURCES.eui.docs, type: 'docs' },
        ],
      },
    ],
  },
]

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
            <EuiFlexItem>
              <Link to="/chat" style={{ textDecoration: 'none' }}>
                <EuiCard
                  icon={<EuiIcon type="newChat" size="l" />}
                  title="Start Chatting"
                  titleSize="xs"
                  description="Jump into the chat interface"
                  paddingSize="m"
                />
              </Link>
            </EuiFlexItem>
            <EuiFlexItem>
              <Link to="/branded" style={{ textDecoration: 'none' }}>
                <EuiCard
                  icon={<EuiIcon type="sparkles" size="l" />}
                  title="Branded Demo"
                  titleSize="xs"
                  description="Full-screen presentation mode"
                  paddingSize="m"
                />
              </Link>
            </EuiFlexItem>
            <EuiFlexItem>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <EuiCard
                  icon={<EuiIcon type="home" size="l" />}
                  title="Home"
                  titleSize="xs"
                  description="Setup status and all features"
                  paddingSize="m"
                />
              </Link>
            </EuiFlexItem>
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
