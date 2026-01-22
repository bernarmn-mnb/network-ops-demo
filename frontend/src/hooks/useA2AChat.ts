/**
 * useA2AChat Hook
 * 
 * Custom hook for managing A2A chat state with coordinator LLM and Agent Builder agents.
 * Handles function calling, agent execution, streaming responses, and error recovery.
 */

import { useState, useCallback, useRef } from 'react'
import { streamA2AChat, getA2AErrorDetails, A2AEvent, ClientFunctionDef } from '../services/llmProxyApi'

export interface FunctionCall {
  id: string
  functionName: string
  agentId: string
  input: string
  status: 'pending' | 'executing' | 'complete' | 'error'
  result?: string
  isClientSide?: boolean  // NEW: Flag for client-side functions
  steps?: Array<{
    id?: string
    type: 'text' | 'reasoning' | 'tool_call' | 'tool_status' | 'tool_result' | 'error'
    text?: string
    reasoning?: string
    message?: string
    toolId?: string
    toolName?: string
    params?: unknown
    result?: unknown
  }>
}

export interface A2AMessage {
  id: string
  role: 'user' | 'assistant' | 'function'
  content: string
  functionCalls?: FunctionCall[]
  isComplete: boolean
  error?: string
  errorCode?: string
  setupHint?: string
  isConfigError?: boolean
}

interface UseA2AChatOptions {
  initialGreeting?: string
  selectedAgents?: string[] // Agent IDs to include in function definitions
  systemPrompt?: string // Custom system instructions
  clientFunctions?: ClientFunctionDef[] // NEW: Client-side functions (executed in browser)
  onClientFunctionCall?: (functionName: string, args: Record<string, unknown>) => unknown // NEW: Handler for client functions
  endpoint?: string // NEW: Custom API endpoint
}

interface UseA2AChatReturn {
  messages: A2AMessage[]
  isLoading: boolean
  conversationId: string | undefined
  sendMessage: (content: string) => Promise<void>
  cancelStream: () => void
  resetConversation: () => void
}

/**
 * Hook for managing A2A chat interactions.
 */
export function useA2AChat({
  initialGreeting,
  selectedAgents: _selectedAgents,
  systemPrompt,
  clientFunctions,
  onClientFunctionCall,
  endpoint,
}: UseA2AChatOptions = {}): UseA2AChatReturn {
  // Initialize with optional greeting message
  const [messages, setMessages] = useState<A2AMessage[]>(() =>
    initialGreeting
      ? [{
          id: 'greeting',
          role: 'assistant',
          content: initialGreeting,
          isComplete: true,
        }]
      : []
  )

  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const abortControllerRef = useRef<AbortController | null>(null)
  const stepCounterRef = useRef(0)

  /**
   * Send a message and stream the response.
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message
    const userMessage: A2AMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      isComplete: true,
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    // Create assistant message placeholder
    const assistantMessageId = `assistant-${Date.now()}`
    const assistantMessage: A2AMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isComplete: false,
    }

    setMessages((prev) => [...prev, assistantMessage])

    // Create abort controller for cancellation
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      let currentFunctionCall: FunctionCall | null = null
      let accumulatedText = ''

      await streamA2AChat(
        content,
        conversationId,
        (event: A2AEvent) => {
          // Handle different event types
          switch (event.type) {
            case 'function_call': {
              const funcData = event.data
              const functionName = funcData.function_name as string
              const agentId = funcData.agent_id as string
              const input = funcData.input as string

              // Create new function call
              currentFunctionCall = {
                id: `func-${Date.now()}`,
                functionName,
                agentId,
                input,
                status: 'executing',
              }

              // Update message with function call
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: [
                          ...(msg.functionCalls || []).filter(
                            (fc): fc is FunctionCall => Boolean(fc && fc.id)
                          ),
                          currentFunctionCall!,
                        ],
                      }
                    : msg
                )
              )
              break
            }

            case 'text_chunk': {
              const textChunk = event.data.text_chunk as string
              accumulatedText += textChunk

              // Update message content
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: accumulatedText,
                      }
                    : msg
                )
              )

              // Mark function call as complete if we're getting text
              const targetId = currentFunctionCall?.id
              if (currentFunctionCall && currentFunctionCall.status === 'executing' && targetId) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          functionCalls: (msg.functionCalls || [])
                            .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                            .map((fc) =>
                              fc && fc.id === targetId
                                ? { ...fc, status: 'complete' as const }
                                : fc
                            ),
                        }
                      : msg
                  )
                )
                currentFunctionCall = null
              }
              break
            }

            case 'agent_text_chunk': {
              const textChunk = event.data.text_chunk as string
              const agentId = event.data.agent_id as string
              const functionName = event.data.function_name as string
              const stepId = `step-${assistantMessageId}-${functionName}-${Date.now()}-${stepCounterRef.current++}`
              const step = {
                id: stepId,
                type: 'text' as const,
                text: textChunk,
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: (msg.functionCalls || [])
                          .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                          .map((fc) =>
                            fc && fc.functionName === functionName && fc.agentId === agentId
                              ? {
                                  ...fc,
                                  steps: [...(fc.steps || []), step],
                                }
                              : fc
                          ),
                      }
                    : msg
                )
              )
              break
            }

            case 'agent_reasoning': {
              const reasoning = event.data.reasoning as string
              const agentId = event.data.agent_id as string
              const functionName = event.data.function_name as string
              const stepId = `step-${assistantMessageId}-${functionName}-${Date.now()}-${stepCounterRef.current++}`
              const step = {
                id: stepId,
                type: 'reasoning' as const,
                reasoning,
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: (msg.functionCalls || [])
                          .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                          .map((fc) =>
                            fc && fc.functionName === functionName && fc.agentId === agentId
                              ? { ...fc, steps: [...(fc.steps || []), step] }
                              : fc
                          ),
                      }
                    : msg
                )
              )
              break
            }

            case 'agent_tool_call': {
              const agentId = event.data.agent_id as string
              const functionName = event.data.function_name as string
              const toolId = (event.data.tool_id as string) || `tool-${Date.now()}-${Math.random().toString(36).slice(2)}-${stepCounterRef.current++}`
              const stepId = `step-${assistantMessageId}-${functionName}-${toolId}-${stepCounterRef.current++}`
              const step = {
                id: stepId,
                type: 'tool_call' as const,
                toolId,
                toolName: event.data.tool_name as string | undefined,
                params: event.data.params,
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: (msg.functionCalls || [])
                          .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                          .map((fc) =>
                            fc && fc.functionName === functionName && fc.agentId === agentId
                              ? { ...fc, steps: [...(fc.steps || []), step] }
                              : fc
                          ),
                      }
                    : msg
                )
              )
              break
            }

            case 'agent_tool_result': {
              const agentId = event.data.agent_id as string
              const functionName = event.data.function_name as string
              const toolId = (event.data.tool_id as string) || `tool-${Date.now()}-${stepCounterRef.current++}`
              const stepId = `step-${assistantMessageId}-${functionName}-${toolId}-${stepCounterRef.current++}`
              const step = {
                id: stepId,
                type: 'tool_result' as const,
                toolId,
                toolName: event.data.tool_name as string | undefined,
                result: event.data.result,
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: (msg.functionCalls || [])
                          .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                          .map((fc) =>
                            fc && fc.functionName === functionName && fc.agentId === agentId
                              ? { ...fc, steps: [...(fc.steps || []), step] }
                              : fc
                          ),
                      }
                    : msg
                )
              )
              break
            }

            case 'agent_tool_status': {
              const agentId = event.data.agent_id as string
              const functionName = event.data.function_name as string
              const toolId = (event.data.tool_id as string) || `tool-${Date.now()}-${stepCounterRef.current++}`
              const stepId = `step-${assistantMessageId}-${functionName}-status-${stepCounterRef.current++}`
              const step = {
                id: stepId,
                type: 'tool_status' as const,
                toolId,
                message: event.data.message as string,
              }
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: (msg.functionCalls || [])
                          .filter((fc): fc is FunctionCall => Boolean(fc && fc.id))
                          .map((fc) =>
                            fc && fc.functionName === functionName && fc.agentId === agentId
                              ? { ...fc, steps: [...(fc.steps || []), step] }
                              : fc
                          ),
                      }
                    : msg
                )
              )
              break
            }

            case 'client_function_call': {
              // Handle client-side function calls (executed in browser)
              const funcData = event.data
              const functionName = funcData.function_name as string
              const args = funcData.arguments as Record<string, unknown>
              
              // Create function call entry
              const funcCallId = `func-client-${Date.now()}`
              const clientFuncCall: FunctionCall = {
                id: funcCallId,
                functionName,
                agentId: 'client',
                input: JSON.stringify(args),
                status: 'executing',
                isClientSide: true,
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        functionCalls: [
                          ...(msg.functionCalls || []).filter(
                            (fc): fc is FunctionCall => Boolean(fc && fc.id)
                          ),
                          clientFuncCall,
                        ],
                      }
                    : msg
                )
              )

              // Execute the client function handler if provided
              if (onClientFunctionCall) {
                const result = onClientFunctionCall(functionName, args)
                // Mark as complete with result
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          functionCalls: (msg.functionCalls || []).map((fc) =>
                            fc.id === funcCallId
                              ? { ...fc, status: 'complete' as const, result: JSON.stringify(result) }
                              : fc
                          ),
                        }
                      : msg
                  )
                )
              } else {
                // No handler - just mark as complete
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? {
                          ...msg,
                          functionCalls: (msg.functionCalls || []).map((fc) =>
                            fc.id === funcCallId
                              ? { ...fc, status: 'complete' as const }
                              : fc
                          ),
                        }
                      : msg
                  )
                )
              }
              break
            }

            case 'error': {
              const errorMessage = event.data.message as string
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        error: errorMessage,
                        isComplete: true,
                      }
                    : msg
                )
              )
              setIsLoading(false)
              break
            }
          }
        },
        abortController.signal,
        systemPrompt,
        clientFunctions,
        endpoint
      )

      // Mark message as complete
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isComplete: true,
                content: accumulatedText || msg.content,
              }
            : msg
        )
      )
    } catch (error) {
      const errorDetails = getA2AErrorDetails(error)
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                error: errorDetails.message,
                errorCode: errorDetails.errorCode,
                setupHint: errorDetails.setupHint,
                isConfigError: errorDetails.isConfigError,
                isComplete: true,
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [isLoading, conversationId, systemPrompt, clientFunctions, onClientFunctionCall])

  /**
   * Cancel the current stream.
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  /**
   * Reset the conversation.
   */
  const resetConversation = useCallback(() => {
    cancelStream()
    setMessages(initialGreeting ? [{
      id: 'greeting',
      role: 'assistant',
      content: initialGreeting,
      isComplete: true,
    }] : [])
    setConversationId(undefined)
  }, [initialGreeting, cancelStream])

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    cancelStream,
    resetConversation,
  }
}

