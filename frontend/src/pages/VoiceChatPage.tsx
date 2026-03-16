/**
 * Voice Chat Page
 *
 * Voice-first chat interface with STT (Speech-to-Text) and TTS (Text-to-Speech).
 * Uses the useVoiceChat hook for voice capabilities on top of Agent Builder chat.
 *
 * Features:
 * - Mic button with visual state feedback (idle/listening/processing/speaking)
 * - Interim transcript display while speaking
 * - Full message history with markdown rendering
 * - Text input fallback for non-voice interaction
 * - Graceful degradation when TTS or STT unavailable
 */

import { useState, useEffect, useRef } from 'react'
import {
  EuiPageTemplate,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiCallOut,
  EuiFieldText,
  EuiButtonIcon,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiHorizontalRule,
} from '@elastic/eui'
import { VoiceChatControls } from '../components/voice/VoiceChatControls'
import { MessageBubble } from '../components/chat/MessageBubble'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { useBrand } from '../components/providers/BrandedThemeProvider'

const HEADER_HEIGHT = 48

export function VoiceChatPage() {
  const { brand } = useBrand()
  const [textInput, setTextInput] = useState('')
  const [ttsAvailable, setTtsAvailable] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const headerHeight = parseInt(brand.layout?.headerHeight || '48', 10) || HEADER_HEIGHT
  const topOffset = headerHeight + 16

  const voice = useVoiceChat({
    initialGreeting: `Hello! I'm your ${brand.name} voice assistant. You can speak to me by clicking the microphone button, or type your question below.`,
  })
  const { setAutoSpeak, stopSpeaking } = voice

  useEffect(() => {
    fetch('/api/voice/health')
      .then((res) => setTtsAvailable(res.ok))
      .catch(() => setTtsAvailable(false))
  }, [])

  useEffect(() => {
    if (ttsAvailable === false) {
      setAutoSpeak(false)
      stopSpeaking()
    }
  }, [setAutoSpeak, stopSpeaking, ttsAvailable])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [voice.messages])

  const handleTextSubmit = () => {
    if (!textInput.trim()) return
    voice.sendMessage(textInput.trim())
    setTextInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  return (
    <>
      <div style={{ height: topOffset }} />

      <EuiPageTemplate
        panelled={false}
        grow={true}
        restrictWidth={900}
        style={{ minHeight: `calc(100vh - ${topOffset}px)` }}
      >
        <EuiPageTemplate.Section>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h1>Voice Chat</h1>
              </EuiTitle>
              <EuiText size="xs" color="subdued">
                Speak or type to chat with your agent
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label="Auto-speak responses"
                checked={voice.autoSpeak}
                onChange={(e) => voice.setAutoSpeak(e.target.checked)}
                disabled={ttsAvailable === false}
                compressed
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {!voice.sttSupported && (
            <>
              <EuiCallOut
                title="Speech recognition not available"
                color="warning"
                iconType="alert"
                size="s"
              >
                <p>
                  Your browser does not support the Web Speech API. Voice input requires Chrome.
                  You can still use text input and hear spoken responses.
                </p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

          {ttsAvailable === false && (
            <>
              <EuiCallOut
                title="Text-to-speech unavailable"
                color="warning"
                iconType="alert"
                size="s"
              >
                <p>
                  Google Cloud TTS is not configured. Responses will be displayed as text only.
                  Set up Google Cloud credentials to enable spoken responses.
                </p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}

          <EuiPanel color="subdued" paddingSize="m" borderRadius="none" hasBorder>
            <VoiceChatControls
              voiceState={voice.voiceState}
              transcript={voice.transcript}
              sttSupported={voice.sttSupported}
              isLoading={voice.isLoading}
              onToggleListening={voice.toggleListening}
              onStopSpeaking={voice.stopSpeaking}
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel
            paddingSize="m"
            style={{
              minHeight: '400px',
              maxHeight: `calc(100vh - ${topOffset + 340}px)`,
              overflowY: 'auto',
            }}
          >
            {voice.messages.length === 0 ? (
              <EuiFlexGroup
                justifyContent="center"
                alignItems="center"
                style={{ minHeight: '300px' }}
              >
                <EuiFlexItem grow={false}>
                  <EuiText textAlign="center" color="subdued">
                    <p>Click the microphone to start a voice conversation</p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              voice.messages.map((msg) => (
                <div key={msg.id} style={{ marginBottom: '16px' }}>
                  <MessageBubble message={msg} />
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <EuiFieldText
                placeholder="Type a message..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={voice.isLoading}
                fullWidth
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="returnKey"
                aria-label="Send message"
                onClick={handleTextSubmit}
                isDisabled={!textInput.trim() || voice.isLoading}
                display="fill"
                size="m"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" textAlign="center">
            <p>
              STT: Web Speech API (Chrome) &middot; TTS: Google Cloud Text-to-Speech
              {voice.conversationId && <> &middot; Session: {voice.conversationId.slice(0, 8)}</>}
            </p>
          </EuiText>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </>
  )
}
