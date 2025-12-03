import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui'
import { AppHeader } from '../components/layout/AppHeader'
import { ChatContainer } from '../components/chat/ChatContainer'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { useBrand } from '../components/providers/BrandedThemeProvider'

/**
 * Chat Page
 * 
 * Main chat interface for the AI Assistant.
 */
export function ChatPage() {
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
              <PageInfoButton {...PAGE_INFO.chat} />
            </EuiFlexItem>
          </EuiFlexGroup>
          
          <ChatContainer
            title={`${brand.name} Assistant`}
            greeting={`Hello! I'm your ${brand.name} AI assistant. I'm here to help answer your questions and assist with tasks.

What can I help you with today?`}
            placeholder="Ask me anything..."
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

