/**
 * ConversationDetail Component
 * 
 * Displays full conversation history including:
 * - User messages
 * - Agent reasoning steps
 * - Tool calls with parameters and results
 * - Assistant responses (rendered as markdown)
 */

import {
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiSpacer,
  EuiPanel,
  EuiText,
  EuiAccordion,
  EuiBadge,
  EuiCode,
  EuiHorizontalRule,
  EuiAvatar,
  EuiComment,
  EuiCommentList,
} from '@elastic/eui'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ConversationDetail as ConversationDetailType,
  ConversationRound,
  ConversationStep,
  isReasoningStep,
  isToolCallStep,
} from '../../services/auditApi'
import { formatFullDate } from '../../utils/dateUtils'

interface ConversationDetailProps {
  conversation: ConversationDetailType | null
  isLoading: boolean
}

/**
 * Renders a single step (reasoning or tool call)
 */
function StepDisplay({ step, index }: { step: ConversationStep; index: number }) {
  if (isReasoningStep(step)) {
    return (
      <EuiAccordion
        id={`reasoning-${index}`}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiBadge color="primary">Reasoning</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                Agent thinking...
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        paddingSize="s"
        initialIsOpen={true}
      >
        <EuiPanel color="subdued" paddingSize="s">
          <EuiText size="s">
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {step.reasoning}
            </pre>
          </EuiText>
        </EuiPanel>
      </EuiAccordion>
    )
  }

  if (isToolCallStep(step)) {
    return (
      <EuiAccordion
        id={`tool-${index}`}
        buttonContent={
          <EuiFlexGroup alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">Tool Call</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s">
                <strong>{step.tool_id}</strong>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        paddingSize="s"
        initialIsOpen={false}
      >
        <EuiPanel color="subdued" paddingSize="s">
          {/* Parameters */}
          <EuiText size="xs"><strong>Parameters:</strong></EuiText>
          <EuiCode language="json" transparentBackground>
            {JSON.stringify(step.params, null, 2)}
          </EuiCode>

          {/* Progression messages */}
          {step.progression && step.progression.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs"><strong>Progress:</strong></EuiText>
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                {step.progression.map((p, i) => (
                  <li key={i}>
                    <EuiText size="xs" color="subdued">{p.message}</EuiText>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Results */}
          {step.results && step.results.length > 0 && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="xs"><strong>Results ({step.results.length}):</strong></EuiText>
              <EuiAccordion
                id={`results-${index}`}
                buttonContent={<EuiText size="xs">View results</EuiText>}
                paddingSize="xs"
              >
                <EuiCode language="json" transparentBackground>
                  {JSON.stringify(step.results, null, 2)}
                </EuiCode>
              </EuiAccordion>
            </>
          )}
        </EuiPanel>
      </EuiAccordion>
    )
  }

  return null
}

/**
 * Renders a single conversation round
 */
function RoundDisplay({ round, index }: { round: ConversationRound; index: number }) {
  const formatTime = (ms?: number) => {
    if (!ms) return null
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const ttft = formatTime(round.time_to_first_token)
  const ttlt = formatTime(round.time_to_last_token)

  return (
    <div>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiBadge>Round {index + 1}</EuiBadge>
        </EuiFlexItem>
        {ttft && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">TTFT: {ttft}</EuiText>
          </EuiFlexItem>
        )}
        {ttlt && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">Total: {ttlt}</EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiCommentList>
        {/* User message */}
        <EuiComment
          username="User"
          timelineAvatar={<EuiAvatar name="User" size="m" color="#006BB4" />}
          event="asked"
        >
          <EuiText size="s">
            <p>{round.input.message}</p>
          </EuiText>
        </EuiComment>

        {/* Steps (reasoning + tool calls) */}
        {round.steps && round.steps.length > 0 && (
          <EuiComment
            username="Agent"
            timelineAvatar={<EuiAvatar name="Agent" size="m" iconType="sparkles" color="#00BFB3" />}
            event="processing"
          >
            <EuiPanel color="transparent" paddingSize="none">
              {round.steps.map((step, stepIndex) => (
                <div key={`${round.id}-step-${stepIndex}`}>
                  <StepDisplay step={step} index={stepIndex} />
                  {stepIndex < round.steps.length - 1 && <EuiSpacer size="xs" />}
                </div>
              ))}
            </EuiPanel>
          </EuiComment>
        )}

        {/* Assistant response */}
        {round.response && (
          <EuiComment
            username="Assistant"
            timelineAvatar={<EuiAvatar name="Assistant" size="m" iconType="discuss" color="#00BFB3" />}
            event="responded"
          >
            <EuiPanel paddingSize="s" hasShadow={false} hasBorder>
              <EuiText size="s">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {round.response.message}
                </ReactMarkdown>
              </EuiText>
            </EuiPanel>
          </EuiComment>
        )}
      </EuiCommentList>
    </div>
  )
}

export function ConversationDetail({
  conversation,
  isLoading,
}: ConversationDetailProps) {
  // Loading state
  if (isLoading) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 300 }}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    )
  }

  // Empty state
  if (!conversation) {
    return (
      <EuiEmptyPrompt
        iconType="document"
        title={<h3>Select a conversation</h3>}
        body={<p>Choose a conversation from the list to view details.</p>}
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <EuiTitle size="s">
        <h3>{conversation.title || 'Untitled Conversation'}</h3>
      </EuiTitle>
      
      <EuiSpacer size="xs" />
      
      <EuiFlexGroup gutterSize="m" wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">{conversation.agent_id}</EuiBadge>
        </EuiFlexItem>
        {conversation.user?.username && (
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              User: {conversation.user.username}
            </EuiText>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {formatFullDate(conversation.created_at)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="m" />

      {/* Rounds */}
      {conversation.rounds && conversation.rounds.length > 0 ? (
        conversation.rounds.map((round, index) => (
          <div key={round.id || index}>
            <RoundDisplay round={round} index={index} />
            {index < conversation.rounds.length - 1 && (
              <>
                <EuiSpacer size="m" />
                <EuiHorizontalRule margin="s" />
                <EuiSpacer size="m" />
              </>
            )}
          </div>
        ))
      ) : (
        <EuiEmptyPrompt
          iconType="document"
          title={<h3>No rounds</h3>}
          body={<p>This conversation has no recorded rounds.</p>}
        />
      )}
    </div>
  )
}
