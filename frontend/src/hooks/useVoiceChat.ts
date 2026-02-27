/**
 * useVoiceChat Hook
 *
 * Reusable voice layer that wraps useAgentChat with Speech-to-Text (STT)
 * and Text-to-Speech (TTS) capabilities. Any demo can opt into voice by
 * using this hook instead of useAgentChat directly.
 *
 * STT: Browser Web Speech API (Chrome-native, zero latency)
 * TTS: Google Cloud Text-to-Speech via backend /api/voice/synthesize
 *
 * TTS streaming: sentences are synthesized as they arrive during streaming,
 * so playback starts before the full response is complete.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAgentChat, Message } from './useAgentChat'
import { useTTSPlayback } from './useTTSPlayback'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseVoiceChatOptions {
  initialGreeting?: string
  voice?: string
  speed?: number
  autoSpeak?: boolean
  lang?: string
  silenceTimeout?: number
  dataDelimiter?: string
}

interface UseVoiceChatReturn {
  messages: Message[]
  isLoading: boolean
  conversationId: string | undefined
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
  resetConversation: () => void

  voiceState: VoiceState
  isListening: boolean
  isSpeaking: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  speakText: (text: string) => Promise<void>
  stopSpeaking: () => void

  autoSpeak: boolean
  setAutoSpeak: (value: boolean) => void
  sttSupported: boolean
}

export function useVoiceChat({
  initialGreeting,
  voice = 'default',
  speed = 1.0,
  autoSpeak = true,
  lang = 'en-GB',
  silenceTimeout = 2000,
  dataDelimiter,
}: UseVoiceChatOptions = {}): UseVoiceChatReturn {
  const chat = useAgentChat({ initialGreeting })

  const [voiceState, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(autoSpeak)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const lastSpokenMsgId = useRef<string>('')
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSpokenRef = useRef(false)

  // Chunked TTS tracking for streaming auto-speak
  const ttsSentLengthRef = useRef(0)
  const streamingMsgIdRef = useRef('')

  // Stable refs for values used in event handlers
  const chatRef = useRef(chat)
  const silenceTimeoutRef = useRef(silenceTimeout)
  const autoSpeakRef = useRef(autoSpeakEnabled)
  chatRef.current = chat
  silenceTimeoutRef.current = silenceTimeout
  autoSpeakRef.current = autoSpeakEnabled

  const {
    enqueueChunk: ttsEnqueue,
    speakText: ttsSpeakText,
    stop: ttsStop,
    isPlaying: ttsIsPlaying,
  } = useTTSPlayback({
    voice,
    speed,
    dataDelimiter,
    onPlaybackStart: useCallback(() => setVoiceState('speaking'), []),
    onPlaybackEnd: useCallback(() => setVoiceState('idle'), []),
  })

  // Stable ref for ttsStop so callbacks don't need it as a dependency
  const ttsStopRef = useRef(ttsStop)
  ttsStopRef.current = ttsStop

  const sttSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // ── STT Setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!sttSupported) return

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }

      if (finalTranscript) {
        hasSpokenRef.current = true
        setTranscript('')
        recognition.stop()
        chatRef.current.sendMessage(finalTranscript)
        setVoiceState('processing')
      } else {
        setTranscript(interimTranscript)
        if (interimTranscript) {
          hasSpokenRef.current = true
        }
        const timeout = silenceTimeoutRef.current
        if (timeout > 0 && hasSpokenRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            recognition.stop()
          }, timeout)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error)
      if (event.error !== 'aborted') {
        setVoiceState('idle')
      }
    }

    recognition.onend = () => {
      setVoiceState((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [sttSupported, lang])

  // ── Auto-speak: stream TTS sentence-by-sentence ────────────────────
  useEffect(() => {
    if (!autoSpeakEnabled) return

    const lastMsg = chat.messages[chat.messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant' || !lastMsg.content) return
    if (lastMsg.error || lastMsg.id === 'welcome') return
    if (lastMsg.id === lastSpokenMsgId.current) return

    if (lastMsg.id !== streamingMsgIdRef.current) {
      streamingMsgIdRef.current = lastMsg.id
      ttsSentLengthRef.current = 0
    }

    const content = lastMsg.content
    const delimiterPattern = dataDelimiter || /---[A-Z_]+---/.source
    const delimRegex = new RegExp(delimiterPattern)
    const delimMatch = content.match(delimRegex)
    const spokenContent = delimMatch ? content.substring(0, delimMatch.index) : content
    const sentLength = ttsSentLengthRef.current
    const newText = spokenContent.substring(sentLength)

    if (!newText.trim()) return

    if (lastMsg.isComplete) {
      const remaining = spokenContent.substring(sentLength).trim()
      if (remaining) {
        ttsEnqueue(remaining)
        ttsSentLengthRef.current = spokenContent.length
      }
      lastSpokenMsgId.current = lastMsg.id
    } else {
      const sentenceBreaks = [...newText.matchAll(/[.!?]\s/g)]
      if (sentenceBreaks.length > 0) {
        const lastBreak = sentenceBreaks[sentenceBreaks.length - 1]
        const cutPoint = lastBreak.index! + lastBreak[0].length
        const completeSentences = newText.substring(0, cutPoint).trim()
        if (completeSentences) {
          ttsEnqueue(completeSentences)
          ttsSentLengthRef.current = sentLength + cutPoint
        }
      }
    }
  }, [chat.messages, autoSpeakEnabled, ttsEnqueue, dataDelimiter])

  // Update voice state based on chat loading
  useEffect(() => {
    if (chat.isLoading) {
      setVoiceState('processing')
    } else if (!autoSpeakRef.current && !ttsIsPlaying()) {
      setVoiceState((prev) => (prev === 'processing' ? 'idle' : prev))
    }
  }, [chat.isLoading, ttsIsPlaying])

  // ── STT Controls ───────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    ttsStopRef.current()
    setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev))
  }, [])

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return
    ttsStopRef.current()
    setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev))
    try {
      hasSpokenRef.current = false
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
      recognitionRef.current.start()
      setVoiceState('listening')
      setTranscript('')
    } catch {
      // Already started — ignore
    }
  }, [])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setVoiceState('idle')
  }, [])

  const toggleListening = useCallback(() => {
    if (voiceState === 'listening') {
      stopListening()
    } else {
      startListening()
    }
  }, [voiceState, startListening, stopListening])

  const resetConversation = useCallback(() => {
    ttsStopRef.current()
    setVoiceState((prev) => (prev === 'speaking' ? 'idle' : prev))
    streamingMsgIdRef.current = ''
    ttsSentLengthRef.current = 0
    chat.resetConversation()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chat.resetConversation is stable
  }, [chat.resetConversation])

  return {
    messages: chat.messages,
    isLoading: chat.isLoading,
    conversationId: chat.conversationId,
    sendMessage: chat.sendMessage,
    cancelStream: chat.cancelStream,
    resetConversation,

    voiceState,
    isListening: voiceState === 'listening',
    isSpeaking: voiceState === 'speaking',
    transcript,
    startListening,
    stopListening,
    toggleListening,
    speakText: ttsSpeakText,
    stopSpeaking,

    autoSpeak: autoSpeakEnabled,
    setAutoSpeak: setAutoSpeakEnabled,
    sttSupported,
  }
}
