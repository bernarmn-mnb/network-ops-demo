/**
 * SuggestionChips Component
 * 
 * Generic, reusable clickable prompt suggestions.
 * Use for quick prompts, empty state actions, or any prompt-selection UI.
 * 
 * Features:
 * - Supports emoji or EUI icon
 * - Responsive wrapping
 * - Disabled state during loading
 * - No hardcoded content - fully configurable via props
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, IconType } from '@elastic/eui'

export interface Suggestion {
  /** Emoji string (e.g. '🔍') or EUI icon name (e.g. 'search') */
  icon?: string
  /** Display text on the chip */
  label: string
  /** Full prompt text sent when clicked */
  prompt: string
}

export interface SuggestionChipsProps {
  /** Array of suggestion items to render */
  suggestions: Suggestion[]
  /** Callback when a suggestion is clicked, receives the prompt string */
  onSelect: (prompt: string) => void
  /** Disable all chips (e.g. while loading) */
  disabled?: boolean
  /** Optional custom styles for the container */
  style?: React.CSSProperties
}

/**
 * Determine if a string is an emoji vs an EUI icon name.
 * Emojis are typically multi-byte unicode characters.
 */
function isEmoji(str: string): boolean {
  // Simple heuristic: if it's 1-2 chars and contains non-ASCII, it's likely an emoji
  return str.length <= 4 && /[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str)
}

export function SuggestionChips({
  suggestions,
  onSelect,
  disabled = false,
  style,
}: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <EuiFlexGroup
      gutterSize="s"
      wrap
      responsive={false}
      style={{
        justifyContent: 'center',
        ...style,
      }}
    >
      {suggestions.map((suggestion, index) => (
        <EuiFlexItem key={index} grow={false}>
          <button
            type="button"
            onClick={() => onSelect(suggestion.prompt)}
            disabled={disabled}
            className="suggestion-chip"
            aria-label={`Send prompt: ${suggestion.label}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              color: disabled ? 'var(--euiColorDisabledText)' : 'var(--euiTextColor)',
              background: 'var(--euiColorEmptyShade)',
              border: '1px solid var(--euiColorLightShade)',
              borderRadius: '20px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {suggestion.icon && (
              isEmoji(suggestion.icon) ? (
                <span style={{ fontSize: '14px' }}>{suggestion.icon}</span>
              ) : (
                <EuiIcon 
                  type={suggestion.icon as IconType} 
                  size="s" 
                  color={disabled ? 'subdued' : 'text'}
                />
              )
            )}
            <span>{suggestion.label}</span>
          </button>
        </EuiFlexItem>
      ))}

      <style>{`
        .suggestion-chip:hover:not(:disabled) {
          background: var(--euiColorLightestShade);
          border-color: var(--euiColorMediumShade);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }
        
        .suggestion-chip:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }
        
        .suggestion-chip:focus {
          outline: none;
          box-shadow: 0 0 0 2px var(--euiColorPrimary);
        }
      `}</style>
    </EuiFlexGroup>
  )
}


