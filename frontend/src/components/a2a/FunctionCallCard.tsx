/**
 * FunctionCallCard Component
 * 
 * Displays function calls (agent invocations) made by the coordinator LLM.
 * Shows which agent was called and with what input, including streaming
 * reasoning, tool calls, and results.
 */

import { useState, useRef } from 'react'
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiBadge,
  EuiSpacer,
  EuiCode,
} from '@elastic/eui'
import { FunctionCall } from '../../hooks/useA2AChat'

// Helper to render step content based on type
interface Step {
  id?: string
  type: 'text' | 'reasoning' | 'tool_call' | 'tool_status' | 'tool_result' | 'error'
  text?: string
  reasoning?: string
  message?: string
  toolId?: string
  toolName?: string
  params?: unknown
  result?: unknown
}

interface FunctionCallCardProps {
  functionCall: FunctionCall
}

export function FunctionCallCard({ functionCall }: FunctionCallCardProps) {
  // Auto-expand while executing, collapse when complete
  const isExecuting = functionCall.status === 'executing' || functionCall.status === 'pending'
  const [userToggled, setUserToggled] = useState(false)
  const [isExpanded, setIsExpanded] = useState(isExecuting)
  
  // Auto-collapse when execution completes (unless user manually toggled)
  const prevStatus = useRef(functionCall.status)
  if (prevStatus.current !== functionCall.status) {
    if (functionCall.status === 'complete' && !userToggled) {
      setIsExpanded(false)
    }
    prevStatus.current = functionCall.status
  }
  
  // Status configuration
  const statusConfig = {
    pending: { 
      icon: null, 
      color: 'var(--euiColorWarning)',
      bgColor: 'rgba(246, 184, 63, 0.1)',
      borderColor: 'rgba(246, 184, 63, 0.3)',
      label: 'Pending'
    },
    executing: { 
      icon: null, 
      color: 'var(--euiColorPrimary)',
      bgColor: 'rgba(0, 119, 204, 0.1)',
      borderColor: 'rgba(0, 119, 204, 0.3)',
      label: 'Executing...'
    },
    complete: { 
      icon: 'checkInCircleFilled' as const, 
      color: 'var(--euiColorSuccess)',
      bgColor: 'rgba(0, 191, 179, 0.08)',
      borderColor: 'rgba(0, 191, 179, 0.2)',
      label: 'Complete'
    },
    error: { 
      icon: 'crossInCircle' as const, 
      color: 'var(--euiColorDanger)',
      bgColor: 'rgba(189, 39, 30, 0.08)',
      borderColor: 'rgba(189, 39, 30, 0.2)',
      label: 'Error'
    },
  }

  const status = statusConfig[functionCall.status]
  const hasResult = functionCall.result !== undefined && functionCall.result !== null
  const hasSteps = (functionCall.steps?.length || 0) > 0
  const hasDetails = hasResult || functionCall.input || hasSteps
  
  return (
    <div
      className="function-call-card"
      style={{
        background: status.bgColor,
        border: `1px solid ${status.borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Function Call Header */}
      <button
        onClick={() => {
          if (hasDetails) {
            setUserToggled(true)
            setIsExpanded(!isExpanded)
          }
        }}
        disabled={!hasDetails}
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          cursor: hasDetails ? 'pointer' : 'default',
          textAlign: 'left',
        }}
        aria-expanded={isExpanded}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="cluster" size="s" color="subdued" />
          </EuiFlexItem>
          
          <EuiFlexItem grow={true}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <code style={{ 
                    fontFamily: 'var(--euiFontFamilyCode)',
                    fontSize: '12px',
                    color: 'var(--euiTextColor)',
                    fontWeight: 500,
                  }}>
                    {functionCall.functionName}
                  </code>
                </EuiText>
              </EuiFlexItem>
              
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {functionCall.agentId}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {functionCall.status === 'executing' || functionCall.status === 'pending' ? (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiIcon 
                      type={status.icon!} 
                      size="s" 
                      color={functionCall.status === 'complete' ? 'success' : 'danger'} 
                    />
                  </EuiFlexItem>
                </>
              )}
              
              {hasDetails && (
                <EuiFlexItem grow={false}>
                  <EuiIcon 
                    type={isExpanded ? 'arrowDown' : 'arrowRight'} 
                    size="s" 
                    color="subdued"
                    style={{
                      marginLeft: '4px',
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>

      {/* Expandable Details */}
      <div
        style={{
          maxHeight: isExpanded ? '400px' : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div style={{ 
          padding: '0 12px 10px 12px',
          borderTop: `1px solid ${status.borderColor}`,
        }}>
          {/* Input */}
          {functionCall.input && (
            <div style={{ marginTop: '10px' }}>
              <EuiText size="xs" color="subdued" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Input
                </span>
              </EuiText>
              <div style={{
                background: 'var(--euiColorEmptyShade)',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '80px',
                overflow: 'auto',
              }}>
                <EuiText size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {functionCall.input}
                </EuiText>
              </div>
            </div>
          )}

          {/* Result */}
          {hasResult && (
            <div style={{ marginTop: '10px' }}>
              <EuiText size="xs" color="subdued" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Result
                </span>
              </EuiText>
              <div style={{
                background: 'var(--euiColorEmptyShade)',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                <EuiText size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {functionCall.result}
                </EuiText>
              </div>
            </div>
          )}

          {/* Steps (agent streaming) */}
          {hasSteps && (
            <div style={{ marginTop: '10px' }}>
              <EuiText size="xs" color="subdued" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Agent Activity
                </span>
              </EuiText>
              <div style={{
                background: 'var(--euiColorEmptyShade)',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '300px',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}>
                {functionCall.steps?.map((step: Step, idx, allSteps) => {
                  const key = step.id || `${functionCall.id}-step-${idx}`
                  const isLastStep = idx === allSteps.length - 1
                  const isStillExecuting = functionCall.status === 'executing' || functionCall.status === 'pending'
                  
                  switch (step.type) {
                    case 'reasoning':
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <EuiIcon type="iInCircle" size="s" color="subdued" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <EuiText size="xs" color="subdued" style={{ fontStyle: 'italic' }}>
                            {step.reasoning}
                          </EuiText>
                        </div>
                      )
                    
                    case 'tool_call':
                      return (
                        <div key={key} style={{ 
                          background: 'rgba(0, 119, 204, 0.08)', 
                          borderRadius: '4px', 
                          padding: '6px 8px',
                          border: '1px solid rgba(0, 119, 204, 0.2)'
                        }}>
                          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="wrench" size="s" color="primary" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiBadge color="hollow">{step.toolName || step.toolId}</EuiBadge>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          {step.params != null && (
                            <>
                              <EuiSpacer size="xs" />
                              <EuiCode language="json" style={{ fontSize: '10px' }}>
                                {JSON.stringify(step.params, null, 2).slice(0, 200)}
                              </EuiCode>
                            </>
                          )}
                        </div>
                      )
                    
                    case 'tool_status':
                      // Show spinner only if this is the last step AND still executing
                      const showSpinner = isLastStep && isStillExecuting
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          {showSpinner ? (
                            <EuiLoadingSpinner size="s" style={{ flexShrink: 0 }} />
                          ) : (
                            <EuiIcon type="check" size="s" color="subdued" style={{ flexShrink: 0 }} />
                          )}
                          <EuiText size="xs" color="subdued">
                            {step.message}
                          </EuiText>
                        </div>
                      )
                    
                    case 'tool_result':
                      return (
                        <div key={key} style={{ 
                          background: 'rgba(0, 191, 179, 0.08)', 
                          borderRadius: '4px', 
                          padding: '6px 8px',
                          border: '1px solid rgba(0, 191, 179, 0.2)'
                        }}>
                          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiIcon type="checkInCircleFilled" size="s" color="success" />
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiText size="xs" color="success">
                                <strong>Result from {step.toolName || step.toolId}</strong>
                              </EuiText>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          {step.result != null && (
                            <>
                              <EuiSpacer size="xs" />
                              <EuiText size="xs" style={{ 
                                maxHeight: '80px', 
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '10px',
                                opacity: 0.8
                              }}>
                                {typeof step.result === 'string' 
                                  ? step.result.slice(0, 300) 
                                  : JSON.stringify(step.result, null, 2).slice(0, 300)}
                                {(typeof step.result === 'string' ? step.result.length : JSON.stringify(step.result).length) > 300 && '...'}
                              </EuiText>
                            </>
                          )}
                        </div>
                      )
                    
                    case 'text':
                      return (
                        <EuiText
                          key={key}
                          size="xs"
                          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                          {step.text}
                        </EuiText>
                      )
                    
                    default:
                      return null
                  }
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

