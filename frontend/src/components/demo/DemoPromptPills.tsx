/**
 * DemoPromptPills - Clickable prompt suggestions with feature labels.
 * 
 * Shows 4-5 key demo prompts as pills. Each pill shows:
 * - The prompt text (or short label)
 * - What feature it demonstrates (visible badge)
 * - Tooltip with expected outcome for presenters
 * 
 * Easy to customize: Edit frontend/src/config/demoPrompts.ts
 */

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiText,
} from '@elastic/eui'
import { DEMO_PROMPTS, DemoPrompt } from '../../config/demoPrompts'

export interface DemoPromptPillsProps {
  /** Callback when a prompt pill is clicked */
  onPromptSelect: (prompt: string) => void
  
  /** Whether the chat is currently loading/streaming */
  isLoading?: boolean
  
  /** Label to show before the pills (default: "Try:") */
  label?: string
  
  /** Hide the label */
  hideLabel?: boolean
}

/**
 * Single prompt pill showing label + feature badge
 */
function PromptPill({
  prompt,
  isDisabled,
  onClick,
}: {
  prompt: DemoPrompt
  isDisabled?: boolean
  onClick: () => void
}) {
  return (
    <EuiToolTip
      content={
        <div style={{ maxWidth: 280 }}>
          <EuiText size="xs">
            <strong>💡 Demo tip:</strong>
            <br />
            {prompt.outcome}
            <br /><br />
            <em>Prompt: "{prompt.prompt}"</em>
          </EuiText>
        </div>
      }
      position="bottom"
      delay="long"
    >
      <div 
        onClick={isDisabled ? undefined : onClick}
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          backgroundColor: 'var(--euiColorLightestShade)',
          border: '1px solid var(--euiColorLightShade)',
          transition: 'all 0.15s ease',
          opacity: isDisabled ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            e.currentTarget.style.backgroundColor = 'var(--euiColorLightShade)'
            e.currentTarget.style.borderColor = 'var(--euiColorMediumShade)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--euiColorLightestShade)'
          e.currentTarget.style.borderColor = 'var(--euiColorLightShade)'
        }}
      >
        {/* Icon */}
        {prompt.icon && (
          <span style={{ fontSize: '14px' }}>{prompt.icon}</span>
        )}
        
        {/* Label text */}
        <span style={{ 
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--euiTextColor)',
        }}>
          {prompt.label || prompt.prompt.slice(0, 30)}
        </span>
        
        {/* Feature badge */}
        <EuiBadge 
          color={prompt.color || 'hollow'}
          style={{ 
            fontSize: '10px',
            padding: '0 6px',
            height: '18px',
            lineHeight: '18px',
          }}
        >
          {prompt.feature}
        </EuiBadge>
      </div>
    </EuiToolTip>
  )
}

export function DemoPromptPills({
  onPromptSelect,
  isLoading = false,
  label = 'Try:',
  hideLabel = false,
}: DemoPromptPillsProps) {
  if (DEMO_PROMPTS.length === 0) {
    return null
  }

  return (
    <EuiFlexGroup 
      gutterSize="s" 
      wrap 
      responsive={false}
      alignItems="center"
    >
      {!hideLabel && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {label}
          </EuiText>
        </EuiFlexItem>
      )}
      
      {DEMO_PROMPTS.map((prompt, index) => (
        <EuiFlexItem grow={false} key={index}>
          <PromptPill
            prompt={prompt}
            isDisabled={isLoading}
            onClick={() => onPromptSelect(prompt.prompt)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
}

export default DemoPromptPills
