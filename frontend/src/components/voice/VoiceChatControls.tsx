/**
 * VoiceChatControls Component
 *
 * Reusable mic button + voice state indicator that can be composed
 * into any page layout. Shows visual feedback for voice state
 * (idle/listening/processing/speaking) and interim STT transcript.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiLoadingSpinner,
} from '@elastic/eui'
import type { VoiceState } from '../../hooks/useVoiceChat'
import './voicePulse.css'

interface VoiceChatControlsProps {
  voiceState: VoiceState
  transcript: string
  sttSupported: boolean
  isLoading: boolean
  onToggleListening: () => void
  onStopSpeaking: () => void
}

const STATE_COLORS: Record<VoiceState, string> = {
  idle: 'var(--euiColorMediumShade)',
  listening: '#E7664C',
  processing: 'var(--euiColorPrimary)',
  speaking: '#00BFB3',
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle: 'Click to speak',
  listening: 'Listening...',
  processing: 'Processing...',
  speaking: 'Speaking...',
}

export function VoiceChatControls({
  voiceState,
  transcript,
  sttSupported,
  isLoading,
  onToggleListening,
  onStopSpeaking,
}: VoiceChatControlsProps) {
  const handleClick = () => {
    if (voiceState === 'speaking') {
      onStopSpeaking()
    } else {
      onToggleListening()
    }
  }

  const micIcon = voiceState === 'listening' ? 'stop' : 'discuss'
  const color = STATE_COLORS[voiceState]
  const isActive = voiceState === 'listening'

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={
            !sttSupported
              ? 'Speech recognition not supported in this browser. Use Chrome for voice input.'
              : STATE_LABELS[voiceState]
          }
        >
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `2px solid ${color}`,
                  animation: 'voicePulse 1.5s ease-in-out infinite',
                }}
              />
            )}
            <EuiButtonIcon
              iconType={micIcon}
              aria-label={STATE_LABELS[voiceState]}
              onClick={handleClick}
              isDisabled={!sttSupported || isLoading}
              display={isActive ? 'fill' : 'base'}
              size="m"
              style={{
                borderColor: color,
                color: isActive ? '#fff' : color,
                backgroundColor: isActive ? color : 'transparent',
              }}
            />
          </div>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            {voiceState === 'processing' ? (
              <EuiLoadingSpinner size="s" />
            ) : (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color,
                  transition: 'background-color 0.2s',
                }}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {STATE_LABELS[voiceState]}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      {transcript && (
        <EuiFlexItem>
          <EuiText size="s" color="subdued" style={{ fontStyle: 'italic' }}>
            {transcript}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  )
}
