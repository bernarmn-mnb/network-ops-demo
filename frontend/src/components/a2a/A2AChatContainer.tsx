/**
 * A2AChatContainer Component
 * 
 * Main A2A chat interface that combines:
 * - Health check on mount (shows setup guide if not configured)
 * - Message list with auto-scroll
 * - Chat input
 * - Header with reset option
 * - Agent selector
 * - Configurable quick prompts
 * - Customizable empty state
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiTextArea,
  EuiLoadingSpinner,
} from '@elastic/eui'
import { useA2AChat, A2AMessage } from '../../hooks/useA2AChat'
import { A2AMessageBubble } from './A2AMessageBubble'
import { ChatInput } from '../chat/ChatInput'
import { AgentSelector } from './AgentSelector'
import { A2ASetupRequired } from './A2ASetupRequired'
import { checkA2AHealth, A2AHealthStatus } from '../../services/llmProxyApi'

export interface A2AChatContainerProps {
  /** Title displayed in the chat header */
  title?: string
  /** Initial greeting message from the assistant */
  greeting?: string
  /** Placeholder text for the input field */
  placeholder?: string
  /** API Endpoint for chat */
  endpoint?: string
  /** Skip health check (for demo modes like Agno) */
  skipHealthCheck?: boolean
}

export function A2AChatContainer({
  title = 'A2A Chat',
  greeting = 'Hello! I\'m a coordinator agent that can call other specialized agents to help you. What would you like to do?',
  placeholder = 'Ask me anything...',
  endpoint,
  skipHealthCheck = false,
}: A2AChatContainerProps) {
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState(false) // Collapsed by default
  const [isSystemInstructionsOpen, setIsSystemInstructionsOpen] = useState(false) // Collapsed by default
  const [systemInstructions, setSystemInstructions] = useState<string>('')
  
  // Health check state
  const [healthStatus, setHealthStatus] = useState<A2AHealthStatus | null>(skipHealthCheck ? { status: 'healthy', llm_proxy_configured: true } : null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(!skipHealthCheck)
  
  const {
    messages,
    isLoading,
    sendMessage,
    cancelStream,
    resetConversation,
  } = useA2AChat({
    initialGreeting: greeting,
    selectedAgents: selectedAgentIds,
    systemPrompt: systemInstructions || undefined,
    endpoint,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // Check A2A health on mount and when skipHealthCheck changes
  const checkHealth = useCallback(async () => {
    if (skipHealthCheck) {
      setHealthStatus({ status: 'healthy', llm_proxy_configured: true })
      setIsCheckingHealth(false)
      return
    }
    setIsCheckingHealth(true)
    try {
      const status = await checkA2AHealth()
      setHealthStatus(status)
    } catch {
      setHealthStatus({
        status: 'unhealthy',
        llm_proxy_configured: false,
        error: 'Failed to check A2A health',
      })
    } finally {
      setIsCheckingHealth(false)
    }
  }, [skipHealthCheck])

  // Re-run health check when checkHealth changes (which depends on skipHealthCheck)
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(
    async (content: string) => {
      await sendMessage(content)
    },
    [sendMessage]
  )

  const handleReset = useCallback(() => {
    resetConversation()
  }, [resetConversation])

  const isEmpty = messages.length === 0 || (messages.length === 1 && messages[0].role === 'assistant' && messages[0].id === 'greeting')

  // Show loading spinner while checking health
  if (isCheckingHealth) {
    return (
      <div
        className="a2a-chat-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          background: 'var(--euiColorEmptyShade)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--euiColorLightShade)',
        }}
      >
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued">
          <p>Checking A2A configuration...</p>
        </EuiText>
      </div>
    )
  }

  // Show setup required if health check failed
  if (healthStatus && healthStatus.status !== 'healthy') {
    return (
      <div
        className="a2a-chat-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: '400px',
          background: 'var(--euiColorEmptyShade)',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--euiColorLightShade)',
          padding: '40px 20px',
        }}
      >
        <A2ASetupRequired
          onRetry={checkHealth}
          isLoading={isCheckingHealth}
          setupSteps={healthStatus.setup_steps}
          setupHint={healthStatus.setup_hint}
          error={healthStatus.error}
          errorCode={healthStatus.error_code}
        />
      </div>
    )
  }

  return (
    <div
      className="a2a-chat-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '500px',
        maxHeight: '80vh',
        background: 'var(--euiColorEmptyShade)',
        borderRadius: '16px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        border: '1px solid var(--euiColorLightShade)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--euiColorLightShade)',
          background: 'var(--euiColorLightestShade)',
        }}
      >
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</h2>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Reset conversation" position="bottom">
              <EuiButtonIcon
                iconType="refresh"
                onClick={handleReset}
                aria-label="Reset conversation"
                disabled={isEmpty}
                color="text"
                size="s"
                style={{ borderRadius: '8px' }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {/* Agent Selector (Collapsible) */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--euiColorLightShade)',
          background: 'var(--euiColorLightestShade)',
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsAgentSelectorOpen(!isAgentSelectorOpen)}
        >
          <EuiButtonIcon 
            iconType={isAgentSelectorOpen ? 'arrowDown' : 'arrowRight'} 
            aria-label={isAgentSelectorOpen ? 'Collapse agent selection' : 'Expand agent selection'}
            color="text"
            size="s"
          />
          <EuiText size="s" style={{ marginLeft: '4px' }}>
            <strong>Agent Selection</strong>
            {selectedAgentIds.length > 0 && (
              <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--euiColorSubduedText)' }}>
                ({selectedAgentIds.length} selected)
              </span>
            )}
          </EuiText>
        </div>
        
        {isAgentSelectorOpen && (
          <>
            <EuiSpacer size="s" />
            <AgentSelector
              selectedAgentIds={selectedAgentIds}
              onSelectionChange={setSelectedAgentIds}
            />
          </>
        )}
      </div>

      {/* System Instructions (Collapsible) */}
      <div
        style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--euiColorLightShade)',
          background: 'var(--euiColorLightestShade)',
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsSystemInstructionsOpen(!isSystemInstructionsOpen)}
        >
          <EuiButtonIcon 
            iconType={isSystemInstructionsOpen ? 'arrowDown' : 'arrowRight'} 
            aria-label={isSystemInstructionsOpen ? 'Collapse system instructions' : 'Expand system instructions'}
            color="text"
            size="s"
          />
          <EuiText size="s" style={{ marginLeft: '4px' }}>
            <strong>System Instructions</strong>
            {systemInstructions && (
              <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--euiColorSubduedText)' }}>
                (custom)
              </span>
            )}
          </EuiText>
        </div>
        
        {isSystemInstructionsOpen && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" style={{ marginBottom: '8px' }}>
              <p>Add custom instructions to guide the coordinator's behavior. These instructions are sent as a system prompt with every message.</p>
            </EuiText>
            <EuiTextArea
              placeholder="e.g., Be concise and friendly. Always provide sources when citing data..."
              value={systemInstructions}
              onChange={(e) => setSystemInstructions(e.target.value)}
              fullWidth
              rows={3}
              resize="vertical"
            />
          </>
        )}
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {isEmpty ? (
          <EuiEmptyPrompt
            iconType="newChat"
            title={<h3>Start a conversation</h3>}
            body={
              <EuiText color="subdued">
                <p>Ask me anything and I'll coordinate with specialized agents to help you.</p>
              </EuiText>
            }
          />
        ) : (
          <div>
            {messages.map((message: A2AMessage) => (
              <div key={message.id} style={{ marginBottom: '16px' }}>
                <A2AMessageBubble message={message} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--euiColorLightShade)',
          background: 'var(--euiColorLightestShade)',
        }}
      >
        <ChatInput
          onSend={handleSend}
          onCancel={cancelStream}
          isLoading={isLoading}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

