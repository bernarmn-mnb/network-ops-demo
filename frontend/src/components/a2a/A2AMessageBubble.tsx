/**
 * A2AMessageBubble Component
 * 
 * Renders individual A2A chat messages with support for:
 * - User and assistant message styling
 * - Markdown rendering for assistant messages
 * - Function call cards (agent invocations)
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
import { A2AMessage } from '../../hooks/useA2AChat'
import { FunctionCallCard } from './FunctionCallCard'
import { MarkdownContent } from '../chat/MarkdownContent'

interface A2AMessageBubbleProps {
  message: A2AMessage
}

function A2AMessageBubbleComponent({ message }: A2AMessageBubbleProps) {
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
          name={isUser ? 'You' : 'Coordinator'}
          iconType={isUser ? 'user' : 'sparkles'}
          color={isUser ? '#0077CC' : '#00BFB3'}
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
              ? 'var(--euiColorPrimary)' 
              : 'var(--euiColorLightestShade)',
            color: isUser ? '#fff' : 'var(--euiTextColor)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {/* Function Calls - show whenever present (keep visible after completion to inspect steps/output) */}
          {!isUser && message.functionCalls && message.functionCalls.length > 0 && (
            <div style={{ marginBottom: message.content ? '12px' : 0 }}>
              {message.functionCalls.map((funcCall, index) => (
                <div key={`${funcCall.id}-${index}`} style={{ marginBottom: index < message.functionCalls!.length - 1 ? '8px' : 0 }}>
                  <FunctionCallCard functionCall={funcCall} />
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
                padding: '10px 14px',
                borderRadius: '8px',
                background: message.isConfigError 
                  ? 'rgba(0, 119, 204, 0.08)' 
                  : 'rgba(189, 39, 30, 0.1)',
                border: message.isConfigError 
                  ? '1px solid rgba(0, 119, 204, 0.2)' 
                  : '1px solid rgba(189, 39, 30, 0.2)',
              }}>
                <EuiFlexGroup gutterSize="xs" alignItems="flexStart" direction="column">
                  <EuiFlexItem>
                    <EuiFlexGroup gutterSize="xs" alignItems="center">
                      <EuiFlexItem grow={false}>
                        <EuiIcon 
                          type={message.isConfigError ? 'gear' : 'warning'} 
                          color={message.isConfigError ? 'primary' : 'danger'} 
                          size="s" 
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs" color={message.isConfigError ? 'default' : 'danger'}>
                          <strong>{message.error}</strong>
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  {message.setupHint && (
                    <EuiFlexItem>
                      <EuiText size="xs" color="subdued" style={{ marginTop: '4px', marginLeft: '20px' }}>
                        <span>💡 {message.setupHint}</span>
                      </EuiText>
                    </EuiFlexItem>
                  )}
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
export const A2AMessageBubble = memo(A2AMessageBubbleComponent, (prev, next) => {
  return (
    prev.message.content === next.message.content &&
    prev.message.isComplete === next.message.isComplete &&
    prev.message.error === next.message.error &&
    prev.message.setupHint === next.message.setupHint &&
    prev.message.isConfigError === next.message.isConfigError &&
    prev.message.functionCalls?.length === next.message.functionCalls?.length &&
    JSON.stringify(prev.message.functionCalls) === JSON.stringify(next.message.functionCalls)
  )
})

