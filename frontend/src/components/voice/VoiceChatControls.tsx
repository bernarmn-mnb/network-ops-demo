/**
 * VoiceChatControls Component
 *
 * Reusable mic button + voice state indicator that can be composed
 * into any page layout. Shows visual feedback for voice state
 * (idle/listening/processing/speaking) and interim STT transcript.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui'
import type { VoiceState } from '../../hooks/useVoiceChat'
import './voicePulse.css'

/** Inline SVG mic — EUI ships no microphone icon, so we render our own. */
function MicGlyph({ size = 28, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="12" rx="3" fill={color} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

interface VoiceChatControlsProps {
  voiceState: VoiceState
  transcript: string
  sttSupported: boolean
  isLoading: boolean
  onToggleListening: () => void
  onStopSpeaking: () => void
}

// Saturated brand-friendly colours so the mic stays obvious regardless of
// the active EUI theme (some brand themes lighten --euiColorPrimary so much
// that a mic with that background blends into the panel).
const STATE_COLORS: Record<VoiceState, string> = {
  idle: '#0077CC',
  listening: '#F04E98',
  processing: '#FEC514',
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

  const color = STATE_COLORS[voiceState]
  const isListening = voiceState === 'listening'
  const isSpeaking = voiceState === 'speaking'
  const isProcessing = voiceState === 'processing'
  const isDisabled = !sttSupported || (isLoading && !isSpeaking)
  const buttonSize = 72

  const tooltipText = !sttSupported
    ? 'Speech recognition not supported in this browser. Use Chrome for voice input.'
    : isSpeaking
      ? 'Tap to stop playback'
      : STATE_LABELS[voiceState]

  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        {/*
          The button is the direct child of EuiToolTip so keyboard focus on
          it triggers the tooltip (EuiToolTip listens for focus events on
          its anchor). The pulse ring is rendered as an absolutely-positioned
          sibling pseudo-overlay inside the button via box-shadow so it
          doesn't break the focusable-anchor contract.
        */}
        <EuiToolTip content={tooltipText}>
          <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            aria-label={STATE_LABELS[voiceState]}
            className={isListening ? 'voice-chat-mic--listening' : undefined}
            style={{
              width: buttonSize,
              height: buttonSize,
              borderRadius: '50%',
              border: 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              background: color,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isDisabled ? 0.5 : 1,
              boxShadow: isListening
                ? `0 0 0 6px rgba(240, 78, 152, 0.25), 0 0 0 2px ${color} inset`
                : '0 4px 14px rgba(0, 0, 0, 0.18)',
              transition: 'background 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {isProcessing ? (
              <EuiLoadingSpinner size="l" />
            ) : isListening ? (
              <EuiIcon type="stop" size="xl" color="ghost" />
            ) : isSpeaking ? (
              <EuiIcon type="stopFilled" size="xl" color="ghost" />
            ) : (
              <MicGlyph size={32} />
            )}
          </button>
        </EuiToolTip>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s" style={{ fontWeight: 600 }}>
          {STATE_LABELS[voiceState]}
        </EuiText>
        {!sttSupported && (
          <EuiText size="xs" color="subdued">
            Voice input requires Chrome — use the text box instead.
          </EuiText>
        )}
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
