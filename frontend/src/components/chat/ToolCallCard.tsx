/**
 * ToolCallCard Component
 * 
 * Displays tool/function calls made by the agent.
 * Compact, professional design with expandable details.
 */

import { useState } from 'react'
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiCode,
  EuiLoadingSpinner,
} from '@elastic/eui'
import { ToolCall } from '../../hooks/useAgentChat'

interface ToolCallCardProps {
  tool: ToolCall
}

export function ToolCallCard({ tool }: ToolCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Status configuration
  const statusConfig = {
    pending: { 
      icon: null, 
      color: 'var(--euiColorWarning)',
      bgColor: 'rgba(246, 184, 63, 0.1)',
      borderColor: 'rgba(246, 184, 63, 0.3)',
      label: 'Running...'
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

  const status = statusConfig[tool.status]
  const hasParams = tool.params && Object.keys(tool.params).length > 0
  const hasResult = tool.result !== undefined && tool.result !== null
  const hasDetails = hasParams || hasResult
  
  // Format JSON for display
  const formatJson = (data: unknown): string => {
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }
  
  // Get result item count for display
  const getResultSummary = (): string => {
    if (Array.isArray(tool.result)) {
      return `(${tool.result.length} items)`
    }
    if (typeof tool.result === 'object' && tool.result !== null) {
      return '(object)'
    }
    return '(value)'
  }

  return (
    <div
      className="tool-call-card"
      style={{
        background: status.bgColor,
        border: `1px solid ${status.borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Tool Header */}
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
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
            <EuiIcon type="wrench" size="s" color="subdued" />
          </EuiFlexItem>
          
          <EuiFlexItem grow={true}>
            <EuiText size="xs">
              <code style={{ 
                fontFamily: 'var(--euiFontFamilyCode)',
                fontSize: '12px',
                color: 'var(--euiTextColor)',
                fontWeight: 500,
              }}>
                {tool.id}
              </code>
            </EuiText>
          </EuiFlexItem>
          
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              {tool.status === 'pending' ? (
                <EuiFlexItem grow={false}>
                  <EuiLoadingSpinner size="s" />
                </EuiFlexItem>
              ) : (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiIcon 
                      type={status.icon!} 
                      size="s" 
                      color={tool.status === 'complete' ? 'success' : 'danger'} 
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
          maxHeight: isExpanded ? '300px' : 0,
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div style={{ 
          padding: '0 12px 10px 12px',
          borderTop: `1px solid ${status.borderColor}`,
        }}>
          {/* Parameters */}
          {hasParams && (
            <div style={{ marginTop: '10px' }}>
              <EuiText size="xs" color="subdued" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Parameters
                </span>
              </EuiText>
              <div style={{
                background: 'var(--euiColorEmptyShade)',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '80px',
                overflow: 'auto',
              }}>
                <EuiCode
                  language="json"
                  transparentBackground
                  style={{
                    fontSize: '11px',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatJson(tool.params)}
                </EuiCode>
              </div>
            </div>
          )}

          {/* Result */}
          {hasResult && (
            <div style={{ marginTop: '10px' }}>
              <EuiText size="xs" color="subdued" style={{ marginBottom: '4px' }}>
                <span style={{ fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Result
                  <span style={{ fontWeight: 400, marginLeft: '6px', opacity: 0.7 }}>
                    {getResultSummary()}
                  </span>
                </span>
              </EuiText>
              <div style={{
                background: 'var(--euiColorEmptyShade)',
                borderRadius: '4px',
                padding: '8px',
                maxHeight: '120px',
                overflow: 'auto',
              }}>
                <EuiCode
                  language="json"
                  transparentBackground
                  style={{
                    fontSize: '11px',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatJson(tool.result)}
                </EuiCode>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
