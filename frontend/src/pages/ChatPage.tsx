import { useRef } from 'react'
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
} from '@elastic/eui'
import { ChatContainer, ChatContainerRef } from '../components/chat/ChatContainer'
import { PageInfoButton, PAGE_INFO } from '../components/layout/PageInfoButton'
import { DEFAULT_PERSONA, buildPersonalisedGreeting } from '../config/agentPersona'
import { DemoPromptPills } from '../components/demo'

/**
 * Chat Page
 * 
 * Main chat interface for the AI Assistant.
 * 
 * Features:
 * - Demo prompt pills for quick demo queries (customize in config/demoPrompts.ts)
 * - Streaming chat with Agent Builder
 * - Reasoning steps and tool call visualization
 */
export function ChatPage() {
  const persona = DEFAULT_PERSONA
  const chatRef = useRef<ChatContainerRef>(null)

  // Handle demo prompt selection
  const handlePromptSelect = (prompt: string) => {
    chatRef.current?.sendMessage(prompt)
  }

  return (
    <>
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
          
          {/* Demo Prompt Pills - customize in config/demoPrompts.ts */}
          <EuiPanel color="transparent" paddingSize="s" style={{ marginBottom: '16px' }}>
            <DemoPromptPills 
              onPromptSelect={handlePromptSelect}
              label="Demo prompts:"
            />
          </EuiPanel>
          
          <ChatContainer
            ref={chatRef}
            title={persona.name}
            greeting={buildPersonalisedGreeting(persona, null, true)}
            placeholder="Ask me anything..."
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}

