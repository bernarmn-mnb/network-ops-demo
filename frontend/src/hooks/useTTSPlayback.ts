/**
 * useTTSPlayback Hook
 *
 * Manages TTS synthesis and audio playback as two independent queues:
 * 1. Synthesis queue: text chunks → fetch /api/voice/synthesize → audio blobs
 * 2. Audio queue: blobs → HTMLAudioElement playback in sequence
 *
 * Supports chunked streaming — callers enqueue text as it arrives and
 * playback starts as soon as the first chunk is synthesized.
 */

import { useCallback, useRef, useEffect } from 'react'

const MAX_TTS_CHUNK_LENGTH = 2000

interface UseTTSPlaybackOptions {
  voice: string
  speed: number
  dataDelimiter?: string
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
}

interface UseTTSPlaybackReturn {
  enqueueChunk: (text: string) => void
  speakText: (text: string) => Promise<void>
  stop: () => void
  isPlaying: () => boolean
}

/** Strip delimiter-separated data and clean markdown for TTS. */
export function cleanTextForTTS(text: string, delimiter?: string): string {
  let cleaned = text
  if (delimiter) {
    const delimIdx = cleaned.indexOf(delimiter)
    if (delimIdx >= 0) cleaned = cleaned.substring(0, delimIdx)
  }
  cleaned = cleaned.replace(/---[A-Z_]+---[\s\S]*$/, '')
  return cleaned
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[-*+]\s/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim()
}

export function useTTSPlayback({
  voice,
  speed,
  dataDelimiter,
  onPlaybackStart,
  onPlaybackEnd,
}: UseTTSPlaybackOptions): UseTTSPlaybackReturn {
  // Stable refs so async callbacks always read current values
  const voiceRef = useRef(voice)
  const speedRef = useRef(speed)
  const delimiterRef = useRef(dataDelimiter)
  const onPlaybackStartRef = useRef(onPlaybackStart)
  const onPlaybackEndRef = useRef(onPlaybackEnd)
  voiceRef.current = voice
  speedRef.current = speed
  delimiterRef.current = dataDelimiter
  onPlaybackStartRef.current = onPlaybackStart
  onPlaybackEndRef.current = onPlaybackEnd

  const synthQueueRef = useRef<string[]>([])
  const isSynthesizingRef = useRef(false)
  const audioQueueRef = useRef<HTMLAudioElement[]>([])
  const isPlayingRef = useRef(false)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Track mounted state for safe async callbacks
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const playNextInQueue = useCallback(() => {
    if (!mountedRef.current) return
    if (isPlayingRef.current) return
    if (audioQueueRef.current.length === 0) {
      currentAudioRef.current = null
      onPlaybackEndRef.current?.()
      return
    }

    isPlayingRef.current = true
    onPlaybackStartRef.current?.()

    const audio = audioQueueRef.current.shift()!
    currentAudioRef.current = audio

    audio.onended = () => {
      URL.revokeObjectURL(audio.src)
      currentAudioRef.current = null
      isPlayingRef.current = false
      playNextInQueue()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src)
      currentAudioRef.current = null
      isPlayingRef.current = false
      playNextInQueue()
    }

    audio.play().catch(() => {
      isPlayingRef.current = false
      playNextInQueue()
    })
  }, [])

  const processSynthQueue = useCallback(async () => {
    if (isSynthesizingRef.current) return
    if (synthQueueRef.current.length === 0) return

    isSynthesizingRef.current = true
    const text = synthQueueRef.current.shift()!
    const cleanText = cleanTextForTTS(text, delimiterRef.current)

    if (cleanText) {
      const ttsText =
        cleanText.length > MAX_TTS_CHUNK_LENGTH
          ? cleanText.slice(0, MAX_TTS_CHUNK_LENGTH)
          : cleanText
      try {
        const controller = new AbortController()
        abortRef.current = controller
        const response = await fetch('/api/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: ttsText,
            voice: voiceRef.current,
            speed: speedRef.current,
          }),
          signal: controller.signal,
        })
        if (response.ok && mountedRef.current) {
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          audioQueueRef.current.push(new Audio(url))
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.warn('TTS chunk synthesis failed:', error)
      } finally {
        abortRef.current = null
      }
    }

    isSynthesizingRef.current = false

    if (synthQueueRef.current.length > 0) {
      await processSynthQueue()
    }
    playNextInQueue()
  }, [playNextInQueue])

  const enqueueChunk = useCallback(
    (text: string) => {
      synthQueueRef.current.push(text)
      processSynthQueue()
    },
    [processSynthQueue],
  )

  const speakText = useCallback(
    async (text: string) => {
      stop()
      const cleanText = cleanTextForTTS(text, delimiterRef.current)
      if (!cleanText) return
      const ttsText =
        cleanText.length > MAX_TTS_CHUNK_LENGTH
          ? cleanText.slice(0, MAX_TTS_CHUNK_LENGTH) + '...'
          : cleanText

      onPlaybackStartRef.current?.()

      try {
        const controller = new AbortController()
        abortRef.current = controller
        const response = await fetch('/api/voice/synthesize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: ttsText,
            voice: voiceRef.current,
            speed: speedRef.current,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`TTS failed: ${response.status}`)
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        currentAudioRef.current = audio
        isPlayingRef.current = true

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          isPlayingRef.current = false
          onPlaybackEndRef.current?.()
        }
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl)
          currentAudioRef.current = null
          isPlayingRef.current = false
          onPlaybackEndRef.current?.()
        }

        await audio.play()
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        console.warn('TTS playback failed:', error)
        onPlaybackEndRef.current?.()
      } finally {
        abortRef.current = null
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- uses refs for all mutable values
    [],
  )

  const stop = useCallback(() => {
    // Abort any in-flight synthesis fetch
    abortRef.current?.abort()
    abortRef.current = null
    // Clear synthesis queue
    synthQueueRef.current = []
    isSynthesizingRef.current = false
    // Revoke and clear queued audio
    audioQueueRef.current.forEach((a) => URL.revokeObjectURL(a.src))
    audioQueueRef.current = []
    isPlayingRef.current = false
    // Stop current audio
    if (currentAudioRef.current) {
      URL.revokeObjectURL(currentAudioRef.current.src)
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
  }, [])

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      synthQueueRef.current = []
      audioQueueRef.current.forEach((a) => URL.revokeObjectURL(a.src))
      audioQueueRef.current = []
      if (currentAudioRef.current) {
        URL.revokeObjectURL(currentAudioRef.current.src)
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
    }
  }, [])

  const isPlaying = useCallback(() => isPlayingRef.current, [])

  return { enqueueChunk, speakText, stop, isPlaying }
}
