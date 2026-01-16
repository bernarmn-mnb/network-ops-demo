/**
 * ChatContainer Component
 * 
 * Main chat interface that combines:
 * - Message list with auto-scroll
 * - Chat input
 * - Header with reset option
 * 
 * Exposes sendMessage via ref for external triggering (e.g., demo prompt pills)
 */

import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiSpacer,
  EuiIcon,
  EuiText,
} from '@elastic/eui'
import { useAgentChat, Message } from '../../hooks/useAgentChat'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { SuggestionChips, Suggestion } from './SuggestionChips'
import { AgentEmptyState } from './AgentEmptyState'

export interface ChatContainerProps {
  title?: string
  greeting?: string
  placeholder?: string
  /** Quick prompt suggestions to show when conversation is fresh */
  suggestions?: Suggestion[]
}

/** Ref handle for external control of the chat */
export interface ChatContainerRef {
  /** Send a message programmatically */
  sendMessage: (message: string) => void
  /** Reset the conversation */
  resetConversation: () => void
  /** Whether the chat is currently loading */
  isLoading: boolean
}

export const ChatContainer = forwardRef<ChatContainerRef, ChatContainerProps>(function ChatContainer({
  title = 'Elastic Agent',
  greeting = "Hello! I'm your AI assistant. How can I help you today?",
  placeholder = "Type your message...",
  suggestions = [],
}, ref) {
  const {
    messages,
    isLoading,
    sendMessage,
    cancelStream,
    resetConversation,
  } = useAgentChat({ initialGreeting: greeting })

  // Expose methods via ref for external control
  useImperativeHandle(ref, () => ({
    sendMessage,
    resetConversation,
    isLoading,
  }), [sendMessage, resetConversation, isLoading])

  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)
  const lastMessageCount = useRef(messages.length)

  // Check if user has scrolled up (disable auto-scroll)
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    
    // Auto-scroll if within 100px of bottom
    const isNearBottom = 
      container.scrollHeight - container.scrollTop - container.clientHeight < 100
    shouldAutoScroll.current = isNearBottom
  }, [])

  // Auto-scroll to bottom only when appropriate
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // Always scroll when new message is added
    const messageCountChanged = messages.length !== lastMessageCount.current
    lastMessageCount.current = messages.length

    // Scroll if: new message added OR we're auto-scrolling during streaming
    if (messageCountChanged || shouldAutoScroll.current) {
      // Use scrollTop instead of scrollIntoView to avoid page scroll
      container.scrollTop = container.scrollHeight
    }
  }, [messages])

  return (
    <div
      className="chat-container"
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
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--euiColorAccent), var(--euiColorPrimary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 191, 179, 0.3)',
                }}>
                  <EuiIcon type="sparkles" size="m" color="ghost" />
                </div>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText>
                  <h2 style={{ 
                    margin: 0, 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: 'var(--euiTextColor)',
                  }}>
                    {title}
                  </h2>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiToolTip content="Start new conversation" position="bottom">
              <EuiButtonIcon
                iconType="refresh"
                onClick={resetConversation}
                aria-label="Reset conversation"
                color="text"
                size="s"
                style={{
                  borderRadius: '8px',
                }}
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-label="Conversation with AI assistant"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {messages.length === 0 ? (
          <AgentEmptyState onSelect={sendMessage} />
        ) : (
          messages.map((message: Message) => (
            <React.Fragment key={message.id}>
              <MessageBubble message={message} />
              <EuiSpacer size="m" />
            </React.Fragment>
          ))
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />

        {/* Screen reader loading announcement */}
        <div aria-live="assertive" style={{ position: 'absolute', left: '-9999px' }}>
          {isLoading && 'AI is thinking. Please wait.'}
        </div>
      </div>

      {/* Input Area */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--euiColorLightShade)',
          background: 'var(--euiColorLightestShade)',
        }}
      >
        {/* Quick prompts - show when conversation is fresh (only greeting or empty) */}
        {messages.length <= 1 && suggestions.length > 0 && (
          <>
            <SuggestionChips 
              suggestions={suggestions}
              onSelect={sendMessage} 
              disabled={isLoading} 
            />
            <EuiSpacer size="m" />
          </>
        )}
        
        <ChatInput
          onSend={sendMessage}
          onCancel={cancelStream}
          isLoading={isLoading}
          placeholder={placeholder}
        />
      </div>
      
      <style>{`
        .chat-container::-webkit-scrollbar {
          width: 8px;
        }
        
        .chat-container::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .chat-container::-webkit-scrollbar-thumb {
          background: var(--euiColorMediumShade);
          border-radius: 4px;
        }
        
        .chat-container::-webkit-scrollbar-thumb:hover {
          background: var(--euiColorDarkShade);
        }
      `}</style>
    </div>
  )
})
