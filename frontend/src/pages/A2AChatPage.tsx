import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { A2AChatContainer } from '../components/a2a/A2AChatContainer'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { useBrand } from '../components/providers/BrandedThemeProvider'

/**
 * A2A Chat Page
 * 
 * Main chat interface for A2A (Agent-to-Agent) communication.
 * Uses a coordinator LLM that can call specialized Agent Builder agents.
 */
export function A2AChatPage() {
  const { brand } = useBrand()

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />
      
      <EuiPageTemplate
        panelled={false}
        grow={true}
        restrictWidth={900}
        style={{ minHeight: 'calc(100vh - 100px)' }}
      >
        <EuiPageTemplate.Section>
          {/* Page info button - top right */}
          <EuiFlexGroup justifyContent="flexEnd" style={{ marginBottom: '-32px' }}>
            <EuiFlexItem grow={false}>
              <PageInfoButton {...PAGE_INFO.a2a} />
            </EuiFlexItem>
          </EuiFlexGroup>
          
          <A2AChatContainer
            title={`${brand.name} A2A Coordinator`}
            greeting={`Hello! 👋 I'm your ${brand.name} coordinator agent. I can route your requests to specialized agents and orchestrate multi-step tasks.

What would you like help with today?`}
            placeholder={`Ask ${brand.name} Coordinator anything...`}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

