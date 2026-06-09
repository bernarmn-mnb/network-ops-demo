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
import { useBrand } from '../components/providers/BrandedThemeProvider'
import { DEMO_TITLE, DEMO_SUBTITLE } from '../config/demoConfig'

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
  // NOC Demo Features
  {
    id: 'network-topology',
    path: '/network-topology',
    title: 'NOC Topology',
    description: 'Live network topology map with Cisco device icons, SNMP health indicators, utilisation-coloured links, and animated traffic flow. Switch to CDP/LLDP Map for real adjacency discovery or Live Map for geographic device locations.',
    icon: 'graphApp',
    category: 'demo',
    requirements: {},
    useCase: 'Show real-time network visibility across heterogeneous vendor environments',
  },
  {
    id: 'network-dashboard',
    path: '/network-dashboard',
    title: 'Network Analytics',
    description: 'NetFlow top talkers, SNMP device health table, and syslog alert feed. Filter by IP address, vendor, or status. Supports real NetFlow and Cisco Meraki data.',
    icon: 'visBarVerticalStacked',
    category: 'demo',
    requirements: {},
    useCase: 'Demonstrate unified NetFlow, SNMP, and syslog analysis in a single pane of glass',
  },
  {
    id: 'network-impact',
    path: '/network-impact',
    title: 'Impact Analysis',
    description: 'Interface flap and outage impact — walks the full MAC→IP→hostname chain across switch MAC tables, ARP tables, and DNS records to show every affected user and device by name, department, and VLAN.',
    icon: 'warning',
    category: 'demo',
    requirements: {},
    useCase: 'Answer "who is affected right now?" in seconds using real network identity data',
  },
  {
    id: 'workflows',
    path: '/workflows',
    title: 'AI Workflows',
    description: '9 deployed workflows: anomaly triage, root cause analysis, incident response, capacity planning, CDP/LLDP crawl, flap impact analysis, and more. Each correlates NetFlow, SNMP, and syslog, then calls the NOC AI agent.',
    icon: 'pipelineApp',
    category: 'demo',
    requirements: { agentConnection: true },
    useCase: 'Show AI-grounded analysis — what took 45 minutes now takes 30 seconds',
  },
  {
    id: 'chat',
    path: '/chat',
    title: 'NOC Chat Assistant',
    description: 'Floating AI chat on every page — ask about alerts, affected devices, root causes, or network events in natural language. Powered by network-agent with access to all telemetry indices.',
    icon: 'newChat',
    category: 'demo',
    requirements: { agentConnection: true },
    useCase: 'Let NOC engineers ask questions instead of writing ES|QL queries',
  },

  // Tools
  {
    id: 'guide',
    path: '/guide',
    title: 'Demo Guide',
    description: 'Presenter guide with four demo tracks (Visibility, AI Workflows, Event-Driven, Impact Analysis), step-by-step talking points, and quick-launch buttons.',
    icon: 'training',
    category: 'tools',
    requirements: {},
    useCase: 'Walk through the demo with structured scenarios and pre-written talking points',
  },
  {
    id: 'mcp',
    path: '/mcp',
    title: 'MCP Explorer',
    description: 'Browse and test MCP server tools exposed by the NOC agent.',
    icon: 'plugs',
    category: 'tools',
    requirements: { agentConnection: true },
    useCase: 'Inspect what tools the network-agent exposes',
  },
]

const CATEGORY_LABELS: Record<string, { label: string; description: string }> = {
  demo: {
    label: '📡 NOC Demo Features',
    description: 'Network telemetry, topology, AI workflows, and impact analysis',
  },
  tools: {
    label: '🔧 Presenter Tools',
    description: 'Guide, talking points, and agent exploration',
  },
  advanced: {
    label: '🚀 Advanced',
    description: 'Features requiring additional setup',
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
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate restrictWidth={1000} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Welcome Header */}
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              {(brand.logo.url || brand.logo.svgDataUrl) ? (
                <EuiImage
                  src={brand.logo.url || brand.logo.svgDataUrl || ''}
                  alt={brand.logo.alt}
                  style={{ height: '48px', width: 'auto' }}
                />
              ) : (
                <EuiIcon type="logoElastic" size="xxl" />
              )}
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>{DEMO_TITLE || brand.name || 'Elastic Demo Starter'}</h1>
              </EuiTitle>
              <EuiText color="subdued">
                <p>{DEMO_SUBTITLE || 'Build AI-powered demos with Agent Builder, EUI, and modern web tech'}</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* NOC Status — compact single line */}
          <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPanel color={status.agentConnected ? 'success' : 'subdued'} paddingSize="s">
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={status.loading ? 'loading' : status.agentConnected ? 'checkInCircleFilled' : 'minusInCircle'}
                      color={status.agentConnected ? 'success' : 'subdued'}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="s">
                      <strong>NOC Agent</strong>{' '}
                      <span style={{ fontSize: '0.85em', color: 'var(--euiColorSubduedText)' }}>
                        {status.loading ? 'Checking…' : status.agentConnected ? `${status.agentName} · ready` : 'Not connected'}
                      </span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Features by Category */}
          <EuiTitle size="m">
            <h2>Available Features</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            <p>Click any feature to open it. All NOC features work with both synthetic demo data and real NetFlow / Meraki telemetry.</p>
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
                  <strong style={{ fontFamily: 'monospace' }}>"Read and follow docs/prompts/WELCOME_PROMPT.md"</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy="Read and follow docs/prompts/WELCOME_PROMPT.md">
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
