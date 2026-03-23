/**
 * FloatingChatWidget Component
 * 
 * A floating chat overlay that can be embedded on any page.
 * Features:
 * - Floating Action Button (FAB) to toggle open/closed
 * - Compact chat panel with messages and input
 * - Streaming responses from Agent Builder
 * - Brand-aware theming
 * - Responsive and accessible
 * 
 * Usage:
 *   <FloatingChatWidget 
 *     title="Tax Advisor"
 *     greeting="Hello! How can I help with your tax questions?"
 *     position="bottom-right"
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  EuiIcon,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui'
import { useAgentChat, Message } from '../../hooks/useAgentChat'
import { useBrand } from '../providers/BrandedThemeProvider'

/** Suggestion prompt shown when no messages yet */
export interface ChatSuggestion {
  label: string
  prompt: string
}

export interface FloatingChatWidgetProps {
  /** Chat title shown in header */
  title?: string
  /** Initial greeting message */
  greeting?: string
  /** Input placeholder text */
  placeholder?: string
  /** Position of the widget */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  /** Whether to start open */
  defaultOpen?: boolean
  /** Primary color override (uses brand primary if not set) */
  primaryColor?: string
  /** Z-index for the widget */
  zIndex?: number
  /** Suggestion prompts shown when no messages yet */
  suggestions?: ChatSuggestion[]
  /** Profile context string sent with the first message */
  profileContext?: string | null
  /** Mode/task context string sent with every message */
  modeContext?: string | null
  /** Override which Agent Builder agent to use */
  agentId?: string | null
  /** Custom avatar URL for the assistant (shown in header instead of icon) */
  assistantAvatarUrl?: string
  /** Custom FAB icon type (default: 'discuss') */
  fabIconType?: string
  /** Custom header icon type (default: 'discuss'). Ignored if assistantAvatarUrl is set. */
  headerIconType?: string
  /** Callback when widget opens/closes */
  onToggle?: (isOpen: boolean) => void
  /** Additional content rendered below the header (e.g., navigation actions, mode selector) */
  headerContent?: React.ReactNode
}

export function FloatingChatWidget({
  title = 'AI Assistant',
  greeting = "Hello! How can I help you today?",
  placeholder = "Type your message...",
  position = 'bottom-right',
  defaultOpen = false,
  primaryColor,
  zIndex = 9999,
  suggestions,
  profileContext,
  modeContext,
  agentId,
  assistantAvatarUrl,
  fabIconType,
  headerIconType,
  onToggle,
  headerContent,
}: FloatingChatWidgetProps) {
  const { brand } = useBrand()
  const { colorMode } = useEuiTheme()
  const isDarkMode = colorMode === 'DARK'
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isLoading,
    sendMessage,
    cancelStream,
    resetConversation,
  } = useAgentChat({
    initialGreeting: greeting,
    profileContext: profileContext ?? undefined,
    modeContext: modeContext ?? undefined,
    agentId: agentId ?? undefined,
  })

  // Resolve primary color
  const color = primaryColor || brand.colors.primary
  
  // Dark mode aware colors for accessibility
  const panelColors = isDarkMode ? {
    background: '#1D1E24',        // EUI dark background
    border: '#343741',            // EUI dark border
    inputBackground: '#25262E',   // Slightly lighter for input area
    messageBubble: '#25262E',     // Assistant message background
    text: '#DFE5EF',              // Light text for dark mode
    textSubdued: '#98A2B3',       // Subdued text
  } : {
    background: '#FFFFFF',
    border: '#D3DAE6',
    inputBackground: '#F5F7FA',
    messageBubble: '#F0F2F5',
    text: '#1A1A1A',
    textSubdued: '#666666',
  }

  // Position styles
  const positionStyles = {
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
  }

  const panelPosition = {
    'bottom-right': { bottom: '80px', right: '0' },
    'bottom-left': { bottom: '80px', left: '0' },
    'top-right': { top: '80px', right: '0' },
    'top-left': { top: '80px', left: '0' },
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = useCallback(() => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue.trim())
      setInputValue('')
    }
  }, [inputValue, isLoading, sendMessage])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === 'Escape') {
      if (isLoading) {
        cancelStream()
      } else {
        setIsOpen(false)
        onToggle?.(false)
      }
    }
  }

  return (
    <div 
      className="floating-chat-widget"
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex,
        fontFamily: brand.fonts.body,
      }}
    >
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="floating-chat-panel"
          style={{
            position: 'absolute',
            ...panelPosition[position],
            width: '380px',
            maxWidth: 'calc(100vw - 40px)',
            height: '500px',
            maxHeight: 'calc(100vh - 120px)',
            background: panelColors.background,
            borderRadius: brand.spacing.borderRadius === '0px' ? '0' : '16px',
            boxShadow: isDarkMode 
              ? '0 8px 32px rgba(0,0,0,0.5)' 
              : '0 8px 32px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: `1px solid ${panelColors.border}`,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              background: color,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                {assistantAvatarUrl ? (
                  <img
                    src={assistantAvatarUrl}
                    alt={title}
                    style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <EuiIcon type={headerIconType ?? 'discuss'} size="m" color="ghost" />
                )}
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" color="ghost">
                  <strong>{title}</strong>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
            
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="New conversation" position="bottom">
                  <EuiButtonIcon
                    iconType="refresh"
                    color="text"
                    aria-label="Reset conversation"
                    onClick={resetConversation}
                    size="s"
                    style={{ color: '#FFFFFF' }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Close" position="bottom">
                  <EuiButtonIcon
                    iconType="cross"
                    color="text"
                    aria-label="Close chat"
                    onClick={() => {
                      setIsOpen(false)
                      onToggle?.(false)
                    }}
                    size="s"
                    style={{ color: '#FFFFFF' }}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>

          {headerContent && (
            <div style={{ padding: '8px 16px', borderBottom: `1px solid ${panelColors.border}` }}>
              {headerContent}
            </div>
          )}

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((message: Message) => (
              <MessageBubble 
                key={message.id} 
                message={message} 
                primaryColor={color}
                isDarkMode={isDarkMode}
                panelColors={panelColors}
              />
            ))}
            {suggestions && suggestions.length > 0 && messages.length <= 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                {suggestions.map((s, idx) => (
                  <button
                    type="button"
                    key={`${s.label}-${idx}`}
                    onClick={() => { sendMessage(s.prompt); }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      borderRadius: '12px',
                      border: `1px solid ${panelColors.border}`,
                      background: panelColors.inputBackground,
                      color: panelColors.text,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {isLoading && messages[messages.length - 1]?.role === 'assistant' && 
             !messages[messages.length - 1]?.content && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: panelColors.textSubdued }}>
                <EuiLoadingSpinner size="s" />
                <span style={{ fontSize: '13px' }}>Thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: `1px solid ${panelColors.border}`,
              background: panelColors.inputBackground,
            }}
          >
            <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
              <EuiFlexItem>
                <EuiTextArea
                  inputRef={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isLoading ? 'Waiting...' : placeholder}
                  rows={1}
                  resize="none"
                  fullWidth
                  disabled={isLoading}
                  style={{
                    minHeight: '40px',
                    maxHeight: '100px',
                    borderRadius: brand.spacing.borderRadius === '0px' ? '0' : '8px',
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {isLoading ? (
                  <EuiToolTip content="Stop" position="top">
                    <EuiButtonIcon
                      iconType="stop"
                      onClick={cancelStream}
                      aria-label="Stop generating"
                      display="fill"
                      color="danger"
                      size="m"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: brand.spacing.borderRadius === '0px' ? '0' : '8px',
                      }}
                    />
                  </EuiToolTip>
                ) : (
                  <EuiToolTip content="Send" position="top">
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim()}
                      aria-label="Send message"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: brand.spacing.borderRadius === '0px' ? '0' : '8px',
                        background: color,
                        border: 'none',
                        cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
                        opacity: inputValue.trim() ? 1 : 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <EuiIcon type="arrowRight" size="m" color="ghost" />
                    </button>
                  </EuiToolTip>
                )}
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        </div>
      )}

      {/* FAB Toggle Button */}
      <button
        onClick={() => {
          const next = !isOpen
          setIsOpen(next)
          onToggle?.(next)
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: color,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)'
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
        }}
      >
        <EuiIcon
          type={isOpen ? 'cross' : (fabIconType ?? 'discuss')}
          size="l"
          color="ghost"
          style={{
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        />
      </button>
    </div>
  )
}

/**
 * Live reasoning display during streaming
 */
function LiveReasoning({ steps, isDarkMode }: { steps: string[], isDarkMode: boolean }) {
  if (!steps || steps.length === 0) return null
  
  // Adjust colors for dark mode accessibility
  const reasoningColors = isDarkMode ? {
    background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.2) 0%, rgba(100, 149, 237, 0.2) 100%)',
    headerColor: '#B8A5E3',
    stepColor: '#A0A8B8',
    numColor: '#B8A5E3',
    borderColor: 'rgba(147, 112, 219, 0.5)',
    dotColor: '#B8A5E3',
  } : {
    background: 'linear-gradient(135deg, rgba(147, 112, 219, 0.1) 0%, rgba(100, 149, 237, 0.1) 100%)',
    headerColor: '#6a5acd',
    stepColor: '#555',
    numColor: '#9370DB',
    borderColor: 'rgba(147, 112, 219, 0.3)',
    dotColor: '#9370DB',
  }
  
  return (
    <div
      style={{
        marginBottom: '10px',
        padding: '10px 12px',
        background: reasoningColors.background,
        borderRadius: '8px',
        borderLeft: `3px solid ${reasoningColors.numColor}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: reasoningColors.headerColor,
          marginBottom: '8px',
        }}
      >
        <span style={{ animation: 'sparkle 2s ease-in-out infinite' }}>✨</span>
        <span>Thinking...</span>
      </div>
      <div
        style={{
          paddingLeft: '8px',
          borderLeft: `2px solid ${reasoningColors.borderColor}`,
        }}
      >
        {steps.map((step, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '8px',
              margin: '6px 0',
              fontSize: '11px',
              color: reasoningColors.stepColor,
              animation: 'slideIn 0.2s ease-out forwards',
              animationDelay: `${i * 0.05}s`,
              opacity: 0,
            }}
          >
            <span style={{ minWidth: '16px', color: reasoningColors.numColor, fontWeight: 500, fontSize: '10px' }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontStyle: 'italic', lineHeight: '1.4' }}>{step}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '3px', padding: '6px 0 0 16px' }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                width: '4px',
                height: '4px',
                background: reasoningColors.dotColor,
                borderRadius: '50%',
                animation: 'pulse 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

/** Color scheme for dark/light mode */
interface PanelColors {
  background: string
  border: string
  inputBackground: string
  messageBubble: string
  text: string
  textSubdued: string
}

/**
 * Simple message bubble for the floating chat
 */
function MessageBubble({ 
  message, 
  primaryColor,
  isDarkMode,
  panelColors,
}: { 
  message: Message
  primaryColor: string
  isDarkMode: boolean
  panelColors: PanelColors
}) {
  const isUser = message.role === 'user'
  const hasContent = message.content && message.content.trim()
  const hasReasoning = message.reasoning && message.reasoning.length > 0
  const hasTools = message.toolCalls && message.toolCalls.length > 0
  const isStreaming = !message.isComplete
  
  return (
    <div
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
      }}
    >
      {/* Show live reasoning during streaming BEFORE content */}
      {!isUser && hasReasoning && isStreaming && (
        <LiveReasoning steps={message.reasoning!} isDarkMode={isDarkMode} />
      )}
      
      <div
        style={{
          padding: '10px 14px',
          borderRadius: '16px',
          borderBottomRightRadius: isUser ? '4px' : '16px',
          borderBottomLeftRadius: isUser ? '16px' : '4px',
          background: isUser ? primaryColor : panelColors.messageBubble,
          color: isUser ? '#fff' : panelColors.text,
          fontSize: '14px',
          lineHeight: '1.5',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
      >
        {hasContent ? message.content : (
          isStreaming && !hasReasoning ? (
            <span style={{ opacity: 0.7, fontStyle: 'italic' }}>...</span>
          ) : null
        )}
      </div>
      
      {/* Show completed reasoning (collapsible) after message is done */}
      {hasReasoning && message.isComplete && (
        <div 
          style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: panelColors.textSubdued,
            paddingTop: '8px',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <details>
            <summary style={{ cursor: 'pointer', padding: '2px 0' }}>
              ✨ {message.reasoning!.length} reasoning step{message.reasoning!.length > 1 ? 's' : ''}
            </summary>
            <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontStyle: 'italic' }}>
              {message.reasoning!.map((step, i) => (
                <li key={i} style={{ margin: '4px 0', lineHeight: '1.4' }}>{step}</li>
              ))}
            </ol>
          </details>
        </div>
      )}
      
      {/* Show tool calls */}
      {hasTools && (
        <div 
          style={{ 
            marginTop: '8px', 
            fontSize: '11px', 
            color: panelColors.textSubdued,
            paddingTop: '8px',
            borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
          }}
        >
          <details open={isStreaming}>
            <summary style={{ cursor: 'pointer', padding: '2px 0' }}>
              🔧 {message.toolCalls!.length} tool call{message.toolCalls!.length > 1 ? 's' : ''} 
              ({message.toolCalls!.filter(t => t.status === 'pending').length > 0 
                ? `${message.toolCalls!.filter(t => t.status === 'pending').length} running...`
                : `${message.toolCalls!.length} completed`})
            </summary>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '0', listStyle: 'none' }}>
              {message.toolCalls!.map((tool, i) => (
                <li 
                  key={i} 
                  style={{ 
                    margin: '4px 0', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    color: tool.status === 'pending' ? primaryColor : '#28a745',
                  }}
                >
                  <span>{tool.status === 'pending' ? '⏳' : '✓'}</span>
                  {tool.id}
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  )
}

export default FloatingChatWidget
