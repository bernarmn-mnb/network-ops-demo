/**
 * Overlay Guide Page
 * 
 * Instructions for injecting the AI chat overlay onto any website
 * using Tampermonkey. This enables "show your AI on their site" demos.
 */

import { useState, useEffect } from 'react'
import {
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiPanel,
  EuiSteps,
  EuiCode,
  EuiCodeBlock,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiLink,
  EuiIcon,
  EuiCopy,
  EuiBadge,
  EuiHorizontalRule,
  EuiCard,
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { useBrand } from '../components/providers/BrandedThemeProvider'

// Import the userscript source
import userscriptSource from '../scripts/overlay-chat.user.js?raw'

/**
 * Determine the backend URL for the Tampermonkey script.
 * 
 * - In development: Use localhost with the VITE_BACKEND_PORT
 * - In production: Use the same origin (nginx proxies both)
 */
function getDefaultBackendUrl(): string {
  // Check if we're in development (localhost or 127.0.0.1)
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1'
  
  if (isDev) {
    // Use the backend port from Vite env (set by ./dev script)
    const backendPort = import.meta.env.VITE_BACKEND_PORT || '8001'
    return `http://localhost:${backendPort}`
  }
  
  // Production: same origin (nginx routes /api to backend)
  return window.location.origin
}

// Common domain presets for quick selection
// Default to GOV.UK to avoid security popups on every site
const DOMAIN_PRESETS = [
  { label: 'GOV.UK', value: '*://*.gov.uk/*' },
  { label: 'BBC', value: '*://*.bbc.co.uk/*' },
  { label: 'All websites', value: '*://*/*' },
  { label: 'Custom...', value: 'custom' },
]

/**
 * Convert a simple domain input to a Tampermonkey @match pattern.
 * Examples:
 *   "gov.uk" -> "*://*.gov.uk/*"
 *   "www.example.com" -> "*://www.example.com/*"
 *   "*.example.com" -> "*://*.example.com/*"
 */
function domainToMatchPattern(domain: string): string {
  if (!domain || domain === '*://*/*') return '*://*/*'
  
  // If it already looks like a match pattern, use as-is
  if (domain.includes('://')) return domain
  
  // Clean up the domain
  const cleaned = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  
  // If it starts with *. or www., use as-is; otherwise add *. for subdomains
  if (cleaned.startsWith('*.') || cleaned.startsWith('www.')) {
    return `*://${cleaned}/*`
  }
  
  // Default: match domain and all subdomains
  return `*://*.${cleaned}/*`
}

export function OverlayGuidePage() {
  const { brand } = useBrand()
  const [backendUrl, setBackendUrl] = useState(getDefaultBackendUrl)
  const [agentId, setAgentId] = useState<string | null>(null)
  const [targetDomain, setTargetDomain] = useState('*://*.gov.uk/*')
  const [customDomain, setCustomDomain] = useState('')
  const [chatName, setChatName] = useState('AI Assistant')
  const [primaryColor, setPrimaryColor] = useState(brand.colors.primary)

  // Fetch agent info to show which agent is configured
  useEffect(() => {
    const fetchAgentInfo = async () => {
      try {
        const response = await fetch('/api/agent/health')
        if (response.ok) {
          const data = await response.json()
          setAgentId(data.agent_id || null)
        }
      } catch {
        // Agent not configured - that's ok
      }
    }
    fetchAgentInfo()
  }, [])

  // Update chat name when agent ID changes
  useEffect(() => {
    if (agentId) {
      // Convert agent-id to Title Case for display
      const formatted = agentId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      setChatName(formatted)
    }
  }, [agentId])

  // Calculate the effective match pattern
  const matchPattern = targetDomain === 'custom' 
    ? domainToMatchPattern(customDomain)
    : targetDomain
  
  // Generate customised script with all configuration
  const customisedScript = userscriptSource
    // Replace @match pattern for domain scoping
    .replace(
      /@match\s+\*:\/\/\*\.gov\.uk\/\*/,
      `@match        ${matchPattern}`
    )
    // Replace backend URL
    .replace(
      "backendUrl: GM_getValue('backendUrl', 'http://localhost:8001')",
      `backendUrl: GM_getValue('backendUrl', '${backendUrl}')`
    )
    // Replace chat name
    .replace(
      "name: GM_getValue('chatName', 'AI Assistant')",
      `name: GM_getValue('chatName', '${chatName}')`
    )
    // Replace primary color
    .replace(
      "primaryColor: GM_getValue('primaryColor', '#1D70B8')",
      `primaryColor: GM_getValue('primaryColor', '${primaryColor}')`
    )

  const steps = [
    {
      title: 'Install Tampermonkey',
      children: (
        <>
          <EuiCallOut 
            size="s" 
            color="warning" 
            iconType="user"
            title="Use a separate browser profile"
          >
            <EuiText size="s">
              <p>
                We recommend creating a <strong>dedicated browser profile</strong> for demos rather than 
                installing Tampermonkey on your corporate browser. This keeps your work profile clean 
                and avoids any security policy concerns.
              </p>
              <p style={{ marginBottom: 0 }}>
                <EuiLink href="chrome://settings/manageProfile" target="_blank">Chrome: Manage profiles</EuiLink>
                {' · '}
                <EuiLink href="edge://settings/profiles" target="_blank">Edge: Manage profiles</EuiLink>
                {' · '}
                <EuiLink href="about:profiles" target="_blank">Firefox: Manage profiles</EuiLink>
              </p>
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              Tampermonkey is a browser extension that lets you inject custom scripts onto any webpage.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"
                target="_blank"
                iconType="globe"
              >
                Chrome
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href="https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/"
                target="_blank"
                iconType="globe"
              >
                Firefox
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href="https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd"
                target="_blank"
                iconType="globe"
              >
                Edge
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                href="https://apps.apple.com/app/tampermonkey/id1482490089"
                target="_blank"
                iconType="globe"
              >
                Safari
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      title: 'Configure your overlay',
      children: (
        <>
          <EuiText>
            <p>
              Configure where the overlay appears and how it looks. All settings are embedded in the script.
            </p>
          </EuiText>
          <EuiSpacer size="m" />

          {/* Target Domain */}
          <EuiFormRow 
            label="Target website" 
            helpText="Which website(s) should the overlay appear on?"
          >
            <EuiFlexGroup gutterSize="s" alignItems="center">
              {DOMAIN_PRESETS.map((preset) => (
                <EuiFlexItem grow={false} key={preset.value}>
                  <EuiBadge
                    color={targetDomain === preset.value ? 'primary' : 'hollow'}
                    onClick={() => setTargetDomain(preset.value)}
                    onClickAriaLabel={`Select ${preset.label}`}
                    style={{ cursor: 'pointer' }}
                  >
                    {preset.label}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFormRow>
          
          {targetDomain === 'custom' && (
            <>
              <EuiSpacer size="s" />
              <EuiFormRow 
                label="Custom domain" 
                helpText="e.g., example.com, *.example.com, www.example.com"
              >
                <EuiFieldText
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="example.com"
                  prepend={<EuiIcon type="globe" />}
                />
              </EuiFormRow>
            </>
          )}
          
          {matchPattern !== '*://*/*' && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <code>@match {matchPattern}</code>
              </EuiText>
            </>
          )}

          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="s" />
          <EuiSpacer size="m" />

          {/* Backend URL */}
          <EuiFormRow 
            label="Backend URL" 
            helpText={agentId ? `Connected to agent: ${agentId}` : "Auto-detected from your environment"}
          >
            <EuiFieldText
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:8001"
              prepend={<EuiIcon type="link" />}
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          {/* Branding */}
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiFormRow label="Chat name" helpText="Shown in the chat header">
                <EuiFieldText
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  placeholder="AI Assistant"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false} style={{ width: 140 }}>
              <EuiFormRow label="Color" helpText="Primary color">
                <EuiFieldText
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1D70B8"
                  prepend={
                    <div 
                      style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: 4,
                        background: primaryColor,
                        border: '1px solid #ccc',
                      }} 
                    />
                  }
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>

          {agentId && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut size="s" color="success" iconType="check">
                <p>
                  <strong>Ready:</strong> Connected to <strong>{agentId}</strong> agent
                </p>
              </EuiCallOut>
            </>
          )}
        </>
      ),
    },
    {
      title: 'Copy and install the script',
      children: (
        <>
          <EuiCallOut 
            size="s" 
            color="success" 
            iconType="check"
            title="Your script is pre-configured"
          >
            <EuiText size="xs">
              <EuiFlexGroup gutterSize="m" wrap>
                <EuiFlexItem grow={false}>
                  <strong>Target:</strong> <code>{matchPattern === '*://*/*' ? 'All websites' : matchPattern}</code>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <strong>Backend:</strong> <code>{backendUrl}</code>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <strong>Name:</strong> <code>{chatName}</code>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiText>
            <p>
              <strong>1.</strong> Click <strong>Copy Script</strong> below<br />
              <strong>2.</strong> Open Tampermonkey → <strong>Create a new script</strong><br />
              <strong>3.</strong> Select all (Ctrl/Cmd+A) → Paste (Ctrl/Cmd+V) → <strong>Save</strong> (Ctrl/Cmd+S)
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiPanel paddingSize="none" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
              <EuiCopy textToCopy={customisedScript}>
                {(copy) => (
                  <EuiButton size="s" onClick={copy} iconType="copyClipboard" fill>
                    Copy Script
                  </EuiButton>
                )}
              </EuiCopy>
            </div>
            <EuiCodeBlock
              language="javascript"
              fontSize="s"
              paddingSize="m"
              overflowHeight={250}
              isCopyable={false}
            >
              {customisedScript}
            </EuiCodeBlock>
          </EuiPanel>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <p>
              No manual editing needed — your configuration is already embedded in the script above.
            </p>
          </EuiText>
        </>
      ),
    },
    {
      title: 'Test it out',
      children: (
        <>
          <EuiText>
            <p>
              {matchPattern === '*://*/*' 
                ? 'Navigate to any website. You\'ll see a chat button appear in the bottom-right corner.'
                : <>Your script will only run on <strong>{matchPattern.replace('*://', '').replace('/*', '')}</strong>. Visit that site to see the chat button.</>
              }
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="m" wrap>
            {(matchPattern === '*://*/*' || matchPattern.includes('gov.uk')) && (
              <EuiFlexItem grow={false}>
                <EuiButton href="https://www.gov.uk/income-tax-rates" target="_blank" iconType="popout">
                  Try on GOV.UK
                </EuiButton>
              </EuiFlexItem>
            )}
            {(matchPattern === '*://*/*' || matchPattern.includes('bbc')) && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href="https://www.bbc.co.uk" target="_blank" iconType="popout">
                  BBC News
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
            {matchPattern === '*://*/*' && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty href="https://en.wikipedia.org" target="_blank" iconType="popout">
                  Wikipedia
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiCallOut size="s" color="warning" iconType="alert" title="Backend must be running">
            <p>
              Ensure your backend is running at <EuiCode>{backendUrl}</EuiCode>. 
              Run <EuiCode>./dev start</EuiCode> locally or deploy to Cloud Run.
            </p>
          </EuiCallOut>
        </>
      ),
    },
  ]

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate restrictWidth={900} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Header */}
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.accent || brand.colors.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <EuiIcon type="popout" size="l" color="ghost" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>Overlay Chat Injection</h1>
              </EuiTitle>
              <EuiText color="subdued">
                <p>Show your AI assistant on any customer website — no code changes needed</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* What is this */}
          <EuiCallOut 
            title="What is this?" 
            iconType="help"
            color="primary"
          >
            <EuiText size="s">
              <p>
                This feature lets you <strong>inject a floating AI chat widget onto any website</strong> using 
                a browser extension called Tampermonkey. It's perfect for customer demos where you want to 
                show: <em>"Here's how an AI assistant could look on YOUR actual site"</em>.
              </p>
              <p>
                The chat connects to your Elastic Demo Starter backend, which handles secure authentication 
                with Agent Builder. The customer's website code is never modified.
              </p>
            </EuiText>
          </EuiCallOut>

          <EuiSpacer size="xl" />

          {/* Use cases */}
          <EuiTitle size="s">
            <h2>When to use this</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon type="check" color="success" />}
                title="Good for"
                description=""
                paddingSize="m"
              >
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Quick demos on customer's live site</li>
                  <li>Proof-of-concept before integration</li>
                  <li>Workshops and training</li>
                  <li>"Art of the possible" presentations</li>
                </ul>
              </EuiCard>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiCard
                icon={<EuiIcon type="cross" color="danger" />}
                title="Not for"
                description=""
                paddingSize="m"
              >
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Production deployments</li>
                  <li>Sites with strict CSP headers</li>
                  <li>Persistent conversations</li>
                  <li>Customer self-service (use embedded instead)</li>
                </ul>
              </EuiCard>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Setup Steps */}
          <EuiTitle size="m">
            <h2>Setup Guide</h2>
          </EuiTitle>
          <EuiSpacer size="l" />

          <EuiSteps steps={steps} />

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Customisation */}
          <EuiAccordion
            id="customisation"
            buttonContent={
              <EuiTitle size="s">
                <h3>🎨 Customisation Options</h3>
              </EuiTitle>
            }
            paddingSize="l"
          >
            <EuiText>
              <p>After installing, you can customise the overlay via Tampermonkey's menu:</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="m" wrap>
              <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                <EuiPanel paddingSize="m">
                  <EuiBadge color="primary">⚙️ Set Backend URL</EuiBadge>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    Point to a different backend (local vs deployed)
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                <EuiPanel paddingSize="m">
                  <EuiBadge color="accent">🎨 Set Chat Name</EuiBadge>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    Change "AI Assistant" to customer brand
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem grow={false} style={{ minWidth: 200 }}>
                <EuiPanel paddingSize="m">
                  <EuiBadge color="warning">🎨 Set Primary Color</EuiBadge>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    Match customer's brand colour (hex)
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            <EuiText size="s" color="subdued">
              <p>
                <strong>How:</strong> Click the Tampermonkey icon → Elastic Agent Chat Overlay → 
                Select an option from the menu.
              </p>
            </EuiText>
          </EuiAccordion>

          <EuiSpacer size="m" />

          {/* Troubleshooting */}
          <EuiAccordion
            id="troubleshooting"
            buttonContent={
              <EuiTitle size="s">
                <h3>🔧 Troubleshooting</h3>
              </EuiTitle>
            }
            paddingSize="l"
            initialIsOpen={true}
          >
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem>
                <EuiPanel color="warning" paddingSize="m">
                  <strong>🔑 First-time Tampermonkey Setup (Chrome)</strong>
                  <EuiSpacer size="s" />
                  <EuiText size="s">
                    <p>After installing Tampermonkey, you must enable "user scripts" permission:</p>
                    <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                      <li><strong>Pin the extension</strong> — Click the puzzle icon in Chrome toolbar, then pin Tampermonkey</li>
                      <li><strong>Open extension settings</strong> — Right-click Tampermonkey icon → "Manage extension" (or go to <EuiCode>chrome://extensions</EuiCode>)</li>
                      <li><strong>Enable user scripts</strong> — Find "Allow user scripts" toggle and turn it <strong>ON</strong></li>
                      <li><strong>Restart browser</strong> — Close ALL Chrome windows and reopen (required!)</li>
                      <li><strong>Check site access</strong> — In extension details, ensure "Site access" is set to "On all sites"</li>
                    </ol>
                  </EuiText>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel color="subdued" paddingSize="m">
                  <strong>Scripts are greyed out in Tampermonkey menu</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    <li>This means the <code>@match</code> pattern doesn't match the current URL</li>
                    <li>Check you're on the correct domain (e.g., <code>www.gov.uk</code> for GOV.UK scripts)</li>
                    <li>If scripts are enabled but greyed out, the "Allow user scripts" permission may be disabled (see above)</li>
                    <li>Try restarting browser after changing any Tampermonkey settings</li>
                  </ul>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel color="subdued" paddingSize="m">
                  <strong>Chat button doesn't appear</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    <li>Check Tampermonkey icon shows a <strong>number badge</strong> (e.g., "1") — this means scripts are running</li>
                    <li>If no badge, scripts aren't matching — check the Tampermonkey popup to see if scripts are listed</li>
                    <li>Open browser console (F12) — look for <code>[Elastic Chat]</code> log messages</li>
                    <li>Some sites block content injection (CSP) — the console will show CSP errors</li>
                  </ul>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel color="subdued" paddingSize="m">
                  <strong>Chat shows but messages don't send</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    <li>Open browser console (F12) and look for network errors</li>
                    <li>Verify backend is running: <EuiCode>./dev status</EuiCode></li>
                    <li>Check backend URL is correct — should match what's shown above</li>
                    <li>For deployed backends, ensure CORS allows the target site</li>
                  </ul>
                </EuiPanel>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiPanel color="subdued" paddingSize="m">
                  <strong>Agent gives unexpected responses</strong>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    <li>Check which agent is configured in <EuiCode>backend/.env</EuiCode></li>
                    <li>Verify agent has access to relevant knowledge/tools</li>
                    <li>Use the Audit page to inspect conversation history</li>
                  </ul>
                </EuiPanel>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiAccordion>

          <EuiSpacer size="xl" />

          {/* Related links */}
          <EuiPanel color="transparent" paddingSize="m">
            <EuiText size="s" color="subdued">
              <EuiFlexGroup gutterSize="l" wrap>
                <EuiFlexItem grow={false}>
                  <EuiLink href="/overlay">
                    <EuiIcon type="play" /> Try the demo version
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink href="https://www.tampermonkey.net/documentation.php" target="_blank">
                    <EuiIcon type="documentation" /> Tampermonkey docs
                  </EuiLink>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiLink href="https://www.elastic.co/guide/en/kibana/current/agent-builder.html" target="_blank">
                    <EuiIcon type="logoElastic" /> Agent Builder docs
                  </EuiLink>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiText>
          </EuiPanel>

        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

export default OverlayGuidePage
