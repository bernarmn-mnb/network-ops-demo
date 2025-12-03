/**
 * QuickPrompts Component
 * 
 * Clickable suggestion chips that demonstrate agent capabilities.
 * Helps users understand what the assistant can do and reduces friction.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui'

interface QuickPromptsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

// Generic agent prompts - customize for your use case
const QUICK_PROMPTS = [
  { icon: '👋', label: 'Get started', prompt: 'Hello! What can you help me with?' },
  { icon: '🔍', label: 'Search', prompt: 'What information do you have access to?' },
  { icon: '🛠️', label: 'Tools', prompt: 'What tools and actions can you perform?' },
  { icon: '💡', label: 'Ideas', prompt: 'Suggest some things I could ask you about' },
]

export function QuickPrompts({ onSelect, disabled = false }: QuickPromptsProps) {
  return (
    <div className="quick-prompts">
      <EuiFlexGroup 
        gutterSize="s" 
        wrap 
        responsive={false}
        justifyContent="center"
      >
        {QUICK_PROMPTS.map((item, index) => (
          <EuiFlexItem key={index} grow={false}>
            <button
              onClick={() => onSelect(item.prompt)}
              disabled={disabled}
              className="quick-prompt-chip"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '20px',
                border: '1px solid var(--euiColorLightShade)',
                background: 'var(--euiColorEmptyShade)',
                color: 'var(--euiTextColor)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '14px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      <style>{`
        .quick-prompt-chip:hover:not(:disabled) {
          border-color: var(--euiColorPrimary);
          background: var(--euiColorLightestShade);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        
        .quick-prompt-chip:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }
      `}</style>
    </div>
  )
}


