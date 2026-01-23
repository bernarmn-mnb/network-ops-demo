import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCard,
  EuiIcon,
  EuiPanel,
  EuiCode,
  EuiAccordion,
  EuiBadge,
  EuiHorizontalRule,
  EuiCopy,
  EuiButtonIcon,
  EuiImage,
  EuiToolTip,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { useBrand } from '../components/providers/BrandedThemeProvider'

/**
 * Welcome Page - Feature showcase and onboarding
 * 
 * Organized into:
 * 1. Quick status overview
 * 2. Feature cards by category (scales as features are added)
 * 3. Setup guidance (collapsible)
 * 4. Vibe coding tips
 */

// =============================================================================
// Feature Configuration - Add new features here!
// =============================================================================

interface Feature {
  id: string
  path: string
  title: string
  description: string
  icon: string
  category: 'demo' | 'tools' | 'advanced'
  // What's needed to use this feature
  requirements?: {
    agentConnection?: boolean  // Needs KIBANA_URL + API_KEY + AGENT_ID
    llmProxy?: boolean         // Needs LLM_PROXY_URL + LLM_PROXY_API_KEY
    optional?: string          // Optional requirement description
  }
  // When to use this feature
  useCase: string
}

/**
 * All available features - add new features here as the template grows.
 * Features are grouped by category for display.
 */
const FEATURES: Feature[] = [
  // Demo Building Features
  {
    id: 'chat',
    path: '/chat',
    title: 'Agent Chat',
    description: 'Streaming chat interface with your Elastic Agent Builder agent. Shows reasoning steps, tool calls, and real-time responses.',
    icon: 'newChat',
    category: 'demo',
    requirements: { agentConnection: true },
    useCase: 'Build customer-facing chat demos with your Agent Builder agents',
  },
  {
    id: 'branded',
    path: '/branded',
    title: 'Branded Demo',
    description: 'Full-screen branded experience ready for customer presentations. Apply your custom theme and showcase the chat in context.',
    icon: 'sparkles',
    category: 'demo',
    requirements: { agentConnection: true, optional: 'Custom branding recommended' },
    useCase: 'Present polished demos to customers with their branding',
  },
  {
    id: 'brands',
    path: '/brands',
    title: 'Brand Editor',
    description: 'Create and manage brand themes with color pickers and logo uploads. Quick way to customize the demo appearance.',
    icon: 'brush',
    category: 'demo',
    requirements: {},
    useCase: 'Quickly customize colors and logos for different customers',
  },

  // Development Tools
  {
    id: 'guide',
    path: '/guide',
    title: 'Demo Guide',
    description: 'Presenter guide with demo flow, talking points, and quick navigation. Customize this for your specific demo.',
    icon: 'training',
    category: 'tools',
    requirements: {},
    useCase: 'Guide yourself or others through the demo with structured scenarios',
  },
  {
    id: 'audit',
    path: '/audit',
    title: 'Conversation Audit',
    description: 'Review conversation history with full agent reasoning visibility. See every thinking step, tool call, and response.',
    icon: 'inspect',
    category: 'tools',
    requirements: { agentConnection: true },
    useCase: 'Debug agent behavior, review reasoning, and understand tool usage',
  },
  {
    id: 'mcp',
    path: '/mcp',
    title: 'MCP Explorer',
    description: 'Browse and test MCP (Model Context Protocol) server tools. Discover available tools and their schemas.',
    icon: 'plugs',
    category: 'tools',
    requirements: { agentConnection: true },
    useCase: 'Explore what tools your Agent Builder exposes via MCP',
  },

  // Advanced Features
  {
    id: 'a2a',
    path: '/a2a-chat',
    title: 'A2A Multi-Agent',
    description: 'Orchestrate multiple Agent Builder agents with a coordinator LLM. The coordinator decides which agent to call based on the query.',
    icon: 'aggregate',
    category: 'advanced',
    requirements: { agentConnection: true, llmProxy: true },
    useCase: 'Build complex workflows with multiple specialized agents',
  },
]

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  demo: { 
    label: '🎨 Demo Building', 
    description: 'Features for creating customer presentations' 
  },
  tools: { 
    label: '🔧 Development Tools', 
    description: 'Features for debugging and exploration' 
  },
  advanced: { 
    label: '🚀 Advanced', 
    description: 'Features requiring additional setup' 
  },
}

// =============================================================================
// Status Types
// =============================================================================

interface ConnectionStatus {
  agentConnected: boolean
  agentName?: string
  llmProxyConfigured: boolean
  loading: boolean
  error?: string
}

// =============================================================================
// Component
// =============================================================================

export function WelcomePage() {
  const { brand } = useBrand()
  const navigate = useNavigate()
  const [status, setStatus] = useState<ConnectionStatus>({
    agentConnected: false,
    llmProxyConfigured: false,
    loading: true
  })

  // Check connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check agent connection
        const agentResponse = await fetch('/api/agent/health')
        const agentOk = agentResponse.ok
        let agentName = undefined
        if (agentOk) {
          const data = await agentResponse.json()
          agentName = data.agent_id
        }

        // Check LLM proxy
        let llmProxyOk = false
        try {
          const llmResponse = await fetch('/api/a2a/health')
          if (llmResponse.ok) {
            const llmData = await llmResponse.json()
            llmProxyOk = llmData.status === 'healthy'
          }
        } catch {
          // LLM proxy not configured - that's ok
        }

        setStatus({
          agentConnected: agentOk,
          agentName,
          llmProxyConfigured: llmProxyOk,
          loading: false
        })
      } catch {
        setStatus({
          agentConnected: false,
          llmProxyConfigured: false,
          loading: false,
          error: 'Cannot reach backend'
        })
      }
    }
    checkStatus()
  }, [])

  // Check if a feature's requirements are met
  const isFeatureReady = (feature: Feature): boolean => {
    if (feature.requirements?.agentConnection && !status.agentConnected) return false
    if (feature.requirements?.llmProxy && !status.llmProxyConfigured) return false
    return true
  }

  // Get features grouped by category
  const featuresByCategory = FEATURES.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = []
    acc[feature.category].push(feature)
    return acc
  }, {} as Record<string, Feature[]>)

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate restrictWidth={1000} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Welcome Header */}
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              {brand.logo.svgDataUrl ? (
                <EuiImage
                  src={brand.logo.svgDataUrl}
                  alt={brand.logo.alt}
                  style={{ height: '48px', width: 'auto' }}
                />
              ) : (
                <EuiIcon type="logoElastic" size="xxl" />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>Elastic Demo Starter</h1>
              </EuiTitle>
              <EuiText color="subdued">
                <p>Build AI-powered demos with Agent Builder, EUI, and modern web tech</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Status Overview */}
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel color={status.agentConnected ? 'success' : 'warning'} paddingSize="m">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon 
                      type={status.loading ? 'loading' : status.agentConnected ? 'checkInCircleFilled' : 'warning'} 
                      color={status.agentConnected ? 'success' : 'warning'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>Agent Builder</strong>
                      <br />
                      <span style={{ fontSize: '0.85em' }}>
                        {status.loading ? 'Checking...' : 
                         status.agentConnected ? `Connected: ${status.agentName}` : 
                         'Not configured'}
                      </span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color={status.llmProxyConfigured ? 'success' : 'subdued'} paddingSize="m">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon 
                      type={status.llmProxyConfigured ? 'checkInCircleFilled' : 'minusInCircle'} 
                      color={status.llmProxyConfigured ? 'success' : 'subdued'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>LLM Proxy (A2A)</strong>
                      <br />
                      <span style={{ fontSize: '0.85em' }}>
                        {status.llmProxyConfigured ? 'Configured' : 'Optional - for multi-agent'}
                      </span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          {/* Setup Needed Callout */}
          {!status.loading && !status.agentConnected && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut title="Setup Required" color="warning" iconType="help">
                <p>Configure your Elastic connection to enable most features.</p>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiCode>./setup.sh</EuiCode>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">or edit <EuiCode>backend/.env</EuiCode></EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCallOut>
            </>
          )}

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Features by Category */}
          <EuiTitle size="m">
            <h2>Available Features</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Pick the features you need for your demo. Each can be used independently.</p>
          </EuiText>
          <EuiSpacer size="l" />

          {Object.entries(featuresByCategory).map(([category, features]) => (
            <div key={category}>
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3>{CATEGORY_LABELS[category].label}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    {CATEGORY_LABELS[category].description}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              
              <EuiFlexGroup gutterSize="m" wrap>
                {features.map((feature) => {
                  const ready = isFeatureReady(feature)
                  return (
                    <EuiFlexItem key={feature.id} style={{ minWidth: 280, maxWidth: 320 }}>
                      <EuiCard
                        layout="vertical"
                        icon={<EuiIcon type={feature.icon} size="l" color={ready ? 'primary' : 'subdued'} />}
                        title={
                          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                            <EuiFlexItem grow={false}>{feature.title}</EuiFlexItem>
                            {!ready && (
                              <EuiFlexItem grow={false}>
                                <EuiToolTip content={
                                  feature.requirements?.llmProxy 
                                    ? 'Requires LLM proxy configuration' 
                                    : 'Requires Agent Builder connection'
                                }>
                                  <EuiBadge color="warning">Setup needed</EuiBadge>
                                </EuiToolTip>
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                        }
                        description={feature.description}
                        footer={
                          <EuiText size="xs" color="subdued">
                            <em>{feature.useCase}</em>
                          </EuiText>
                        }
                        onClick={ready ? () => navigate(feature.path) : undefined}
                        paddingSize="m"
                        style={{ 
                          opacity: ready ? 1 : 0.7,
                          height: '100%',
                          cursor: ready ? 'pointer' : 'default',
                        }}
                      />
                    </EuiFlexItem>
                  )
                })}
              </EuiFlexGroup>
              <EuiSpacer size="xl" />
            </div>
          ))}

          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Setup & Onboarding - Collapsible */}
          <EuiAccordion
            id="setup-section"
            buttonContent={
              <EuiTitle size="s">
                <h3>📋 Setup & Onboarding</h3>
              </EuiTitle>
            }
            paddingSize="l"
            initialIsOpen={!status.agentConnected}
          >
            <EuiCallOut title="AI-Assisted Setup" iconType="sparkles" color="primary">
        <EuiText size="s">
          <p>
            Open this project in <strong>Cursor</strong> or <strong>VS Code + Claude</strong> and tell your AI:
          </p>
              </EuiText>
          <EuiSpacer size="s" />
          <EuiPanel color="primary" paddingSize="m">
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong style={{ fontFamily: 'monospace' }}>"Read and follow docs/ONBOARDING.md"</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy="Read and follow docs/ONBOARDING.md">
                  {(copy) => (
                    <EuiButtonIcon
                      onClick={copy}
                      iconType="copyClipboard"
                      aria-label="Copy command"
                      color="primary"
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
          <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                The AI will verify your environment, configure connections, and set up branding automatically.
              </EuiText>
            </EuiCallOut>

            <EuiSpacer size="l" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="m">
                <EuiTitle size="xs">
                  <h4>🖥️ Local Development</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="m" wrap>
                  <EuiFlexItem grow={false}>
                    <EuiCode>./dev start</EuiCode>
                    <EuiText size="xs" color="subdued">Start servers</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCode>./dev stop</EuiCode>
                    <EuiText size="xs" color="subdued">Stop servers</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCode>./dev logs</EuiCode>
                    <EuiText size="xs" color="subdued">View logs</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel color="subdued" paddingSize="m">
                <EuiTitle size="xs">
                    <h4>⚙️ Configuration</h4>
                </EuiTitle>
                <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p><EuiCode>./setup.sh</EuiCode> - Interactive setup wizard</p>
                    <p><EuiCode>backend/.env</EuiCode> - Connection settings</p>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          </EuiAccordion>

          <EuiSpacer size="l" />

          {/* Vibe Coding - Collapsible */}
          <EuiAccordion
            id="vibe-coding-section"
            buttonContent={
              <EuiTitle size="s">
                <h3>💡 Vibe Coding Tips</h3>
          </EuiTitle>
            }
            paddingSize="l"
          >
          <EuiCallOut 
            title="What is Vibe Coding?" 
            iconType="sparkles"
            color="primary"
          >
            <EuiText size="s">
              <p>
                <strong>Vibe coding</strong> is working with AI to build features by describing 
                  what you want in natural language. This project is optimized for it:
              </p>
              <ul>
                <li><strong>Small, modular files</strong> - Easy for AI to read and edit</li>
                  <li><strong>Documented patterns</strong> in <EuiCode>hive-mind/</EuiCode></li>
                <li><strong>Clear conventions</strong> - AI follows existing code style</li>
              </ul>
            </EuiText>
          </EuiCallOut>

            <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                <EuiTitle size="xs"><h4>🎯 Good Prompts</h4></EuiTitle>
                <EuiText size="s">
                  <ul>
                    <li>"Add a sidebar with navigation"</li>
                    <li>"Make the chat support file uploads"</li>
                      <li>"Extract branding from [website]"</li>
                  </ul>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiPanel paddingSize="m">
                  <EuiTitle size="xs"><h4>📚 Hive Mind</h4></EuiTitle>
                <EuiText size="s">
                  <ul>
                      <li><EuiBadge color="primary">patterns/</EuiBadge> Reusable solutions</li>
                      <li><EuiBadge color="warning">troubleshooting/</EuiBadge> Known fixes</li>
                      <li><EuiBadge color="accent">meta/prompts/</EuiBadge> AI prompts</li>
                  </ul>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>
          </EuiAccordion>

          <EuiSpacer size="xxl" />

        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}
