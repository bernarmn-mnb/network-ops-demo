/**
 * ReasoningSteps Component
 * 
 * Displays the agent's reasoning/thinking steps with elegant animations.
 * - Expands smoothly during streaming
 * - Auto-collapses gracefully when response completes
 * - Minimal footprint when collapsed
 */

import { useState, useEffect, useRef } from 'react'
import {
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui'

interface ReasoningStepsProps {
  steps: string[]
  isComplete: boolean
}

export function ReasoningSteps({ steps, isComplete }: ReasoningStepsProps) {
  const [isExpanded, setIsExpanded] = useState(!isComplete)
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto')
  const contentRef = useRef<HTMLDivElement>(null)
  const hasAutoCollapsed = useRef(false)

  // Measure content height for smooth animations
  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight)
    }
  }, [steps])

  // Auto-collapse when streaming completes (with delay for readability)
  useEffect(() => {
    if (isComplete && !hasAutoCollapsed.current && isExpanded) {
      hasAutoCollapsed.current = true
      const timer = setTimeout(() => {
        setIsExpanded(false)
      }, 800) // Brief pause before collapsing
      return () => clearTimeout(timer)
    }
  }, [isComplete, isExpanded])

  // Reset auto-collapse flag when new reasoning starts
  useEffect(() => {
    if (!isComplete) {
      hasAutoCollapsed.current = false
      setIsExpanded(true)
    }
  }, [isComplete])

  if (!steps.length) return null

  const latestStep = steps[steps.length - 1]

  return (
    <div className="reasoning-container" style={{ marginBottom: isExpanded ? '12px' : '8px' }}>
      {/* Collapsed/Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          padding: '4px 0',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          color: 'var(--euiTextSubduedColor)',
          fontSize: '12px',
          transition: 'opacity 0.2s ease',
        }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse thinking process' : 'Expand thinking process'}
      >
        <EuiIcon 
          type="sparkles" 
          size="s" 
          color="accent"
          style={{
            opacity: isComplete ? 0.6 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
        <span style={{ 
          fontWeight: 500,
          opacity: 0.8,
        }}>
          {isComplete ? `Thought process (${steps.length})` : 'Thinking...'}
        </span>
        <EuiIcon 
          type={isExpanded ? 'arrowDown' : 'arrowRight'} 
          size="s" 
          style={{
            transition: 'transform 0.2s ease',
            opacity: 0.5,
          }}
        />
        {/* Preview of latest thought when collapsed */}
        {!isExpanded && isComplete && (
          <span style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            opacity: 0.5,
            fontStyle: 'italic',
            marginLeft: '4px',
          }}>
            {latestStep}
          </span>
        )}
      </button>

      {/* Expandable Content */}
      <div
        style={{
          maxHeight: isExpanded ? contentHeight : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease, opacity 0.25s ease',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div
          ref={contentRef}
          style={{
            paddingLeft: '12px',
            borderLeft: '2px solid var(--euiColorAccent)',
            marginTop: '8px',
            marginLeft: '3px',
          }}
        >
          {steps.map((step, idx) => (
            <EuiFlexGroup 
              key={idx} 
              gutterSize="xs" 
              alignItems="flexStart"
              style={{ 
                marginBottom: idx < steps.length - 1 ? '6px' : 0,
                animation: !isComplete ? 'fadeSlideIn 0.2s ease' : 'none',
              }}
            >
              <EuiFlexItem grow={false} style={{ minWidth: '16px' }}>
                <span style={{ 
                  fontSize: '10px', 
                  color: 'var(--euiColorAccent)',
                  fontWeight: 500,
                  opacity: 0.7,
                }}>
                  {idx + 1}
                </span>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  <span style={{ 
                    fontStyle: 'italic',
                    lineHeight: '1.4',
                    display: 'block',
                  }}>
                    {step}
                  </span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ))}
          
          {/* Streaming indicator */}
          {!isComplete && (
            <div style={{
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <span className="thinking-dots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .thinking-dots {
          display: inline-flex;
          gap: 3px;
          padding-left: 16px;
        }
        
        .thinking-dots .dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--euiColorAccent);
          opacity: 0.5;
          animation: pulse 1.4s ease-in-out infinite;
        }
        
        .thinking-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .thinking-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes pulse {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          40% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
