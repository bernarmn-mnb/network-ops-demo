/**
 * ChatInput Component
 * 
 * Message input field with send/cancel functionality.
 * - Enter to send, Shift+Enter for newline
 * - Subtle cancel button when streaming
 */

import { useState, useRef, useEffect } from 'react'
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTextArea,
  EuiButtonIcon,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui'

interface ChatInputProps {
  onSend: (message: string) => void
  onCancel: () => void
  isLoading: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onCancel,
  isLoading,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    textAreaRef.current?.focus()
  }, [])

  // Re-focus after loading completes
  useEffect(() => {
    if (!isLoading) {
      textAreaRef.current?.focus()
    }
  }, [isLoading])

  const handleSubmit = () => {
    if (value.trim() && !isLoading) {
      onSend(value)
      setValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && isLoading) {
      onCancel()
    }
  }

  const canSend = value.trim().length > 0 && !isLoading

  return (
    <div className="chat-input-container">
      <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false}>
        <EuiFlexItem>
          <div style={{ position: 'relative' }}>
            <EuiTextArea
              inputRef={textAreaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? 'Waiting for response...' : placeholder}
              rows={1}
              resize="none"
              fullWidth
              aria-label="Message input"
              aria-describedby="input-hint"
              disabled={isLoading}
              style={{
                minHeight: '44px',
                maxHeight: '150px',
                paddingRight: isLoading ? '44px' : '12px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
            />
            
            {/* Inline cancel button (appears during loading) */}
            {isLoading && (
              <EuiToolTip content="Stop generating (Esc)" position="top">
                <button
                  onClick={onCancel}
                  className="cancel-button"
                  aria-label="Stop generating"
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: '1px solid var(--euiColorLightShade)',
                    background: 'var(--euiColorEmptyShade)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <EuiIcon 
                    type="cross" 
                    size="s" 
                    color="subdued"
                  />
                </button>
              </EuiToolTip>
            )}
          </div>
          <span id="input-hint" style={{ display: 'none' }}>
            Press Enter to send, Shift+Enter for new line, Escape to cancel
          </span>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiToolTip 
            content={canSend ? 'Send message' : (isLoading ? 'Generating...' : 'Type a message')} 
            position="top"
          >
            <EuiButtonIcon
              iconType="arrowRight"
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="Send message"
              display="fill"
              size="m"
              color="primary"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                opacity: canSend ? 1 : 0.5,
                transition: 'opacity 0.2s ease, transform 0.1s ease',
              }}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <style>{`
        .chat-input-container .euiTextArea {
          border-radius: 12px;
        }
        
        .chat-input-container .euiTextArea:focus {
          box-shadow: 0 0 0 2px var(--euiColorPrimary) inset;
        }
        
        .cancel-button:hover {
          background: var(--euiColorLightestShade) !important;
          border-color: var(--euiColorMediumShade) !important;
        }
        
        .cancel-button:hover svg {
          color: var(--euiColorDanger) !important;
        }
        
        .cancel-button:active {
          transform: translateY(-50%) scale(0.95) !important;
        }
      `}</style>
    </div>
  )
}
