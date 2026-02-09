/**
 * MessageBubble Component
 * 
 * Renders individual chat messages with support for:
 * - User and assistant message styling
 * - Markdown rendering for assistant messages
 * - Reasoning steps display (collapsible)
 * - Tool call cards
 * - Error states
 */

import { memo } from 'react'
import {
  EuiText,
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiIcon,
} from '@elastic/eui'
import { Message } from '../../hooks/useAgentChat'
import { ReasoningSteps } from './ReasoningSteps'
import { ToolCallCard } from './ToolCallCard'
import { MarkdownContent } from './MarkdownContent'

interface MessageBubbleProps {
  message: Message
}

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = !message.isComplete && message.role === 'assistant'

  return (
    <EuiFlexGroup
      gutterSize="m"
      alignItems="flexStart"
      direction={isUser ? 'rowReverse' : 'row'}
      className="message-bubble-container"
    >
      {/* Avatar */}
      <EuiFlexItem grow={false}>
        <EuiAvatar
          name={isUser ? 'You' : 'Assistant'}
          iconType={isUser ? 'user' : 'sparkles'}
          color={isUser ? 'var(--brand-primary, #0077CC)' : 'var(--brand-accent, #00BFB3)'}
          size="m"
        />
      </EuiFlexItem>

      {/* Message Content */}
      <EuiFlexItem grow={false} style={{ maxWidth: '80%', minWidth: '200px' }}>
        <div
          className={`message-bubble ${isUser ? 'user-message' : 'assistant-message'}`}
          style={{
            padding: '12px 16px',
            borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            background: isUser
              ? 'var(--brand-primary, var(--euiColorPrimary))'
              : 'var(--euiColorLightestShade)',
            color: isUser ? '#fff' : 'var(--brand-text-body, var(--euiTextColor))',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* Reasoning Steps (for assistant messages) */}
          {!isUser && message.reasoning && message.reasoning.length > 0 && (
            <ReasoningSteps 
              steps={message.reasoning} 
              isComplete={message.isComplete} 
            />
          )}

          {/* Tool Calls - only show while streaming or if there's no final content */}
          {!isUser && message.toolCalls && message.toolCalls.length > 0 && (!message.isComplete || !message.content) && (
            <div style={{ marginBottom: message.content ? '12px' : 0 }}>
              {message.toolCalls.map((tool, index) => (
                <div key={`${tool.id}-${index}`} style={{ marginBottom: index < message.toolCalls!.length - 1 ? '8px' : 0 }}>
                  <ToolCallCard tool={tool} />
                </div>
              ))}
            </div>
          )}

          {/* Main Message Content */}
          {message.content ? (
            <div className="message-content">
              {isUser ? (
                // User messages: plain text
                <EuiText size="s">
                  <p style={{ 
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                    lineHeight: '1.5',
                  }}>
                    {message.content}
                  </p>
                </EuiText>
              ) : (
                // Assistant messages: markdown
                <EuiText size="s">
                  <MarkdownContent content={message.content} />
                </EuiText>
              )}
              
              {/* Streaming cursor */}
              {isStreaming && (
                <span className="streaming-cursor" />
              )}
            </div>
          ) : isStreaming ? (
            // Loading state when no content yet
            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <div className="typing-indicator">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : null}

          {/* Error State */}
          {message.error && (
            <>
              <EuiSpacer size="s" />
              <div style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(189, 39, 30, 0.1)',
                border: '1px solid rgba(189, 39, 30, 0.2)',
              }}>
                <EuiFlexGroup gutterSize="xs" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="warning" color="danger" size="s" />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs" color="danger">
                      <span>{message.error}</span>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </>
          )}
        </div>
      </EuiFlexItem>

      {/* Spacer for alignment */}
      <EuiFlexItem grow={true} />

      <style>{`
        .message-bubble-container {
          animation: messageSlideIn 0.25s ease;
        }
        
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: var(--euiColorAccent);
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: blink 0.8s step-end infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          50.01%, 100% { opacity: 0; }
        }
        
        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        
        .typing-indicator .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--euiColorMediumShade);
          animation: typingPulse 1.4s ease-in-out infinite;
        }
        
        .typing-indicator .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .typing-indicator .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes typingPulse {
          0%, 60%, 100% {
            opacity: 0.4;
            transform: scale(0.8);
          }
          30% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .user-message {
          --euiTextColor: #fff;
          --euiLinkColor: rgba(255,255,255,0.9);
        }
        
        .assistant-message .markdown-content a {
          color: var(--euiColorPrimary);
        }
      `}</style>
    </EuiFlexGroup>
  )
}

// Memoize to prevent re-renders during sibling updates
export const MessageBubble = memo(MessageBubbleComponent, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isComplete === next.message.isComplete &&
    prev.message.error === next.message.error &&
    prev.message.reasoning?.length === next.message.reasoning?.length &&
    prev.message.toolCalls?.length === next.message.toolCalls?.length &&
    JSON.stringify(prev.message.toolCalls) === JSON.stringify(next.message.toolCalls)
  )
})
