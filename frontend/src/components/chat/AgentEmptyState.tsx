/**
 * AgentEmptyState Component
 * 
 * Context-aware empty state for the AI agent chat.
 * Shows inspiring cards to help users get started.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
} from '@elastic/eui'

interface AgentEmptyStateProps {
  onSelect: (prompt: string) => void
}

const INSPIRATION_CARDS = [
  {
    icon: 'sparkles',
    title: 'Get Started',
    description: 'Ask a question or describe what you need',
    prompt: 'Hello! What can you help me with?',
    color: '#07C', // Elastic Blue
  },
  {
    icon: 'search',
    title: 'Explore',
    description: 'Search for information',
    prompt: 'What information do you have access to?',
    color: '#00BFB3', // Elastic Teal
  },
  {
    icon: 'compute',
    title: 'Use Tools',
    description: 'See available capabilities',
    prompt: 'What tools and actions can you perform?',
    color: '#F04E98', // Elastic Pink
  },
]

export function AgentEmptyState({ onSelect }: AgentEmptyStateProps) {
  return (
    <div 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #07C, #00BFB3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 4px 12px rgba(0, 119, 204, 0.3)',
        }}>
          <EuiIcon type="logoElastic" size="l" color="ghost" />
        </div>
        
        <EuiText>
          <h3 style={{ 
            margin: '0 0 8px', 
            fontWeight: 600,
            color: 'var(--euiTextColor)',
          }}>
            How can I help you today?
          </h3>
          <p style={{ 
            margin: 0, 
            color: 'var(--euiTextSubduedColor)',
            fontSize: '14px',
          }}>
            Ask a question, search for information, or explore what I can do
          </p>
        </EuiText>
      </div>

      {/* Inspiration Cards */}
      <EuiFlexGroup 
        gutterSize="m" 
        responsive={false}
        style={{ maxWidth: '500px', width: '100%' }}
      >
        {INSPIRATION_CARDS.map((card, index) => (
          <EuiFlexItem key={index}>
            <button
              onClick={() => onSelect(card.prompt)}
              className="inspiration-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 16px',
                borderRadius: '12px',
                border: '1px solid var(--euiColorLightShade)',
                background: 'var(--euiColorEmptyShade)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `${card.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
              }}>
                <EuiIcon type={card.icon} size="m" color={card.color} />
              </div>
              
              <EuiText size="s" style={{ textAlign: 'center' }}>
                <strong style={{ 
                  display: 'block', 
                  marginBottom: '4px',
                  color: 'var(--euiTextColor)',
                }}>
                  {card.title}
                </strong>
                <span style={{ 
                  color: 'var(--euiTextSubduedColor)',
                  fontSize: '12px',
                }}>
                  {card.description}
                </span>
              </EuiText>
            </button>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {/* Hint */}
      <EuiText size="xs" color="subdued" style={{ marginTop: '24px' }}>
        <p style={{ margin: 0 }}>
          💡 Tip: Be specific about what you need for best results
        </p>
      </EuiText>

      <style>{`
        .inspiration-card:hover {
          border-color: var(--euiColorPrimary);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        
        .inspiration-card:active {
          transform: translateY(0);
          box-shadow: none;
        }
      `}</style>
    </div>
  )
}

