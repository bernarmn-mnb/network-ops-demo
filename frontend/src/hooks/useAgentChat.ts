/**
 * useAgentChat Hook
 * 
 * Custom hook for managing chat state with Elastic Agent Builder.
 * Handles message streaming, tool calls, reasoning steps, and error recovery.
 */

import { useState, useCallback, useRef } from 'react'
import { streamAgentMessage, getErrorMessage, NormalizedEvent } from '../services/agentApi'

export interface ToolCall {
  id: string
  params: Record<string, unknown>
  status: 'pending' | 'complete' | 'error'
  result?: unknown
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string[]
  toolCalls?: ToolCall[]
  isComplete: boolean
  error?: string
}

interface UseAgentChatOptions {
  initialGreeting?: string
}

interface UseAgentChatReturn {
  messages: Message[]
  isLoading: boolean
  conversationId: string | undefined
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
  resetConversation: () => void
}

/**
 * Hook for managing Agent Builder chat interactions.
 */
export function useAgentChat({
  initialGreeting,
}: UseAgentChatOptions = {}): UseAgentChatReturn {
  // Initialize with optional greeting message
  const [messages, setMessages] = useState<Message[]>(() =>
    initialGreeting
      ? [{
          id: 'welcome',
          role: 'assistant',
          content: initialGreeting,
          isComplete: true,
        }]
      : []
  )
  
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string>()
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    // Add user message immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      isComplete: true,
    }

    // Create placeholder for assistant response
    const assistantId = `assistant-${Date.now()}`
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      reasoning: [],
      toolCalls: [],
      isComplete: false,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setIsLoading(true)

    // Set up abort controller for cancellation
    const abortController = new AbortController()
    abortRef.current = abortController

    try {
      await streamAgentMessage(
        content.trim(),
        conversationId,
        (event: NormalizedEvent) => {
          // Update conversation ID when received
          if (event.conversationId && !conversationId) {
            setConversationId(event.conversationId)
          }

          // Update assistant message based on event type
          setMessages(prev => prev.map(msg => {
            if (msg.id !== assistantId) return msg

            switch (event.type) {
              case 'reasoning':
                return {
                  ...msg,
                  reasoning: [
                    ...(msg.reasoning || []),
                    event.data.reasoning as string,
                  ],
                }

              case 'tool_call':
                return {
                  ...msg,
                  toolCalls: [
                    ...(msg.toolCalls || []),
                    {
                      id: (event.data.tool_id || event.data.tool_call_id) as string,
                      params: (event.data.params || event.data.arguments || {}) as Record<string, unknown>,
                      status: 'pending' as const,
                    },
                  ],
                }

              case 'tool_result': {
                const tools = [...(msg.toolCalls || [])]
                const lastTool = tools[tools.length - 1]
                if (lastTool) {
                  lastTool.status = 'complete'
                  lastTool.result = event.data.result || event.data.output
                }
                return { ...msg, toolCalls: tools }
              }

              case 'text_chunk': {
                const text = (event.data.text_chunk || event.data.text || '') as string
                return { ...msg, content: msg.content + text }
              }

              case 'message_complete': {
                // Only use message_content if it has actual content
                // Prefer streamed content if available (it's already complete)
                const finalContent = event.data.message_content as string | undefined
                return {
                  ...msg,
                  content: msg.content || finalContent || '',
                  isComplete: true,
                }
              }

              case 'error':
                return {
                  ...msg,
                  error: getErrorMessage(new Error(event.data.message as string)),
                }

              default:
                return msg
            }
          }))
        },
        abortController.signal
      )
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                error: getErrorMessage(error),
                content: msg.content || 'Sorry, I encountered an error.',
              }
            : msg
        ))
      }
    } finally {
      setIsLoading(false)
      abortRef.current = null
      
      // Mark message as complete
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId ? { ...msg, isComplete: true } : msg
      ))
    }
  }, [conversationId])

  /**
   * Cancel the current streaming response.
   */
  const cancelStream = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /**
   * Reset conversation to initial state.
   */
  const resetConversation = useCallback(() => {
    setConversationId(undefined)
    setMessages(
      initialGreeting
        ? [{
            id: 'welcome',
            role: 'assistant',
            content: initialGreeting,
            isComplete: true,
          }]
        : []
    )
  }, [initialGreeting])

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    cancelStream,
    resetConversation,
  }
}
