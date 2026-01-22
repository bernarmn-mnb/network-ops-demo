import { useState } from 'react'
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiText,
  EuiToolTip,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { A2AChatContainer } from '../components/a2a/A2AChatContainer'
import { AgentArchitectureGraph } from '../components/a2a/AgentArchitectureGraph'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { useBrand } from '../components/providers/BrandedThemeProvider'
import { a2aConfig } from '../config/a2aConfig'

/**
 * A2A Chat Page
 * 
 * Multi-agent orchestration interface using Agno framework.
 * The coordinator LLM routes requests to specialized Agent Builder agents.
 * 
 * ## Customization for Your Use Case
 * 
 * This page uses configuration from `src/config/a2aConfig.ts`.
 * To adapt for your specific use case:
 * 
 * 1. **Edit a2aConfig.ts** - Change title, greeting, system prompt
 * 2. **Add agents in Agent Builder** - They're auto-discovered via A2A cards
 * 3. **Customize system prompt** - Tell the coordinator how to route requests
 * 
 * See `hive-mind/patterns/elastic/A2A_COORDINATOR_PATTERN.md` for full guide.
 */
export function A2AChatPage() {
  const { brand } = useBrand()
  const [showArchitecture, setShowArchitecture] = useState(false)

  // Build dynamic values from config and brand
  const title = a2aConfig.title.replace('{brandName}', brand.name)
  const greeting = a2aConfig.greeting.replace('{brandName}', brand.name)
  const placeholder = a2aConfig.placeholder.replace('{brandName}', brand.name)

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate
        panelled={false}
        grow={true}
        restrictWidth={1200}
        style={{ minHeight: 'calc(100vh - 100px)' }}
      >
        <EuiPageTemplate.Section>
          {/* Header - Architecture and Info buttons */}
          <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="s" style={{ marginBottom: '16px' }}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="View agent architecture">
                <EuiButtonIcon
                  iconType="indexMapping"
                  aria-label="View agent architecture"
                  onClick={() => setShowArchitecture(true)}
                  display="base"
                  size="m"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <PageInfoButton {...PAGE_INFO.a2a} />
            </EuiFlexItem>
          </EuiFlexGroup>
          
          {/* Main Chat Area */}
          <A2AChatContainer
            title={title}
            greeting={greeting}
            placeholder={placeholder}
            endpoint={a2aConfig.endpoint}
            skipHealthCheck={true}
          />
          
        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      {/* Architecture Flyout */}
      {showArchitecture && (
        <EuiFlyout
          onClose={() => setShowArchitecture(false)}
          size="m"
          aria-labelledby="architectureFlyoutTitle"
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2 id="architectureFlyoutTitle">Agent Architecture</h2>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>
                This diagram shows how the coordinator routes requests to specialized agents.
                Each agent has its own tools and capabilities.
              </p>
            </EuiText>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <AgentArchitectureGraph />
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  )
}
