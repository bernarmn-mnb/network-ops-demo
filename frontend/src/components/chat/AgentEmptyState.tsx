import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiIcon,
} from '@elastic/eui'
import { useBrand } from '../providers/BrandedThemeProvider'

export interface EmptyStateCard {
  icon: string
  title: string
  description: string
  prompt: string
  color: string
}

export interface AgentEmptyStateConfig {
  /** Logo image URL shown in the header (e.g. company wordmark) */
  logoUrl?: string
  /** Alternate text for the logo */
  logoAlt?: string
  /** Agent name displayed as the headline */
  name?: string
  /** Short tagline below the name */
  tagline?: string
  /** Accent colour for the avatar icon (hex) */
  accentColor?: string
  /** Three suggestion cards — replaces the generic defaults */
  cards?: EmptyStateCard[]
}

interface AgentEmptyStateProps {
  onSelect: (prompt: string) => void
  config?: AgentEmptyStateConfig
}

export function AgentEmptyState({ onSelect, config }: AgentEmptyStateProps) {
  const { brand } = useBrand()
  const p = config?.accentColor ?? brand.colors.primary
  const a = brand.colors.accent || p
  const third =
    (brand.colors as Record<string, string>).darkBlue ||
    brand.colors.border ||
    '#69707D'

  const cards: EmptyStateCard[] = config?.cards ?? [
    {
      icon: 'sparkles',
      title: 'Get started',
      description: 'Ask a question or describe what you need',
      prompt: 'Hello! What can you help me with?',
      color: p,
    },
    {
      icon: 'search',
      title: 'Explore',
      description: 'Search for information',
      prompt: 'What information do you have access to?',
      color: a,
    },
    {
      icon: 'compute',
      title: 'Use tools',
      description: 'See available capabilities',
      prompt: 'What tools and actions can you perform?',
      color: third,
    },
  ]

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
      {/* Header — logo + name */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        {config?.logoUrl ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 20px',
              borderRadius: '14px',
              background: p,
              marginBottom: '16px',
              boxShadow: `0 4px 16px ${p}40`,
            }}
          >
            <img
              src={config.logoUrl}
              alt={config.logoAlt ?? config.name ?? 'Agent'}
              style={{ height: '28px', width: 'auto', display: 'block' }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: `linear-gradient(135deg, ${p}, ${a})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: `0 4px 12px ${p}40`,
            }}
          >
            <EuiIcon type="sparkles" size="l" color="ghost" />
          </div>
        )}

        {config?.name && (
          <EuiText>
            <h3
              style={{
                margin: '0 0 6px',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--euiTextColor)',
              }}
            >
              {config.name}
            </h3>
          </EuiText>
        )}

        <EuiText>
          <p
            style={{
              margin: 0,
              color: 'var(--euiTextSubduedColor)',
              fontSize: '14px',
              maxWidth: '320px',
            }}
          >
            {config?.tagline ?? 'Ask a question, search for information, or explore what I can do'}
          </p>
        </EuiText>
      </div>

      {/* Cards */}
      <EuiFlexGroup
        gutterSize="m"
        responsive={false}
        style={{ maxWidth: '520px', width: '100%' }}
      >
        {cards.map((card, index) => (
          <EuiFlexItem key={index}>
            <button
              onClick={() => onSelect(card.prompt)}
              className="inspiration-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '18px 14px',
                borderRadius: '12px',
                border: '1px solid var(--euiColorLightShade)',
                background: 'var(--euiColorEmptyShade)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: `${card.color}18`,
                  border: `1px solid ${card.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                }}
              >
                <EuiIcon type={card.icon} size="m" color={card.color} />
              </div>

              <EuiText size="s" style={{ textAlign: 'center' }}>
                <strong
                  style={{
                    display: 'block',
                    marginBottom: '4px',
                    color: 'var(--euiTextColor)',
                    fontSize: '13px',
                  }}
                >
                  {card.title}
                </strong>
                <span
                  style={{
                    color: 'var(--euiTextSubduedColor)',
                    fontSize: '12px',
                    lineHeight: '1.4',
                  }}
                >
                  {card.description}
                </span>
              </EuiText>
            </button>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

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
