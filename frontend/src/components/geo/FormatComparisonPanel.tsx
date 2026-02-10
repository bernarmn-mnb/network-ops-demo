/**
 * FormatComparisonPanel - Collapsible panel showing the ES query and response.
 *
 * Helps users understand what Elasticsearch query was sent and
 * what the response format looks like (JSON for standard, protobuf for vector tiles).
 */

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiBadge,
} from '@elastic/eui'

interface FormatComparisonPanelProps {
  /** The ES query body that was sent */
  queryBody?: Record<string, unknown> | null
  /** The response data (or a description for binary formats) */
  responseBody?: Record<string, unknown> | string | null
  /** Label for the response format */
  responseFormat?: string
  /** Total hits from the search */
  totalHits?: number
  /** Query time in ms */
  tookMs?: number
}

export function FormatComparisonPanel({
  queryBody,
  responseBody,
  responseFormat = 'JSON',
  totalHits,
  tookMs,
}: FormatComparisonPanelProps) {
  const hasContent = queryBody || responseBody

  if (!hasContent) return null

  const responseStr =
    typeof responseBody === 'string'
      ? responseBody
      : responseBody
        ? JSON.stringify(responseBody, null, 2)
        : ''

  return (
    <EuiAccordion
      id="formatComparisonPanel"
      buttonContent={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s"><strong>Query Inspector</strong></EuiText>
          </EuiFlexItem>
          {totalHits !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{totalHits} hits</EuiBadge>
            </EuiFlexItem>
          )}
          {tookMs !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{tookMs}ms</EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{responseFormat}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      paddingSize="m"
    >
      <EuiSpacer size="s" />

      {queryBody && (
        <>
          <EuiTitle size="xxs"><h4>Elasticsearch Query</h4></EuiTitle>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language="json"
            fontSize="s"
            paddingSize="s"
            overflowHeight={200}
            isCopyable
          >
            {JSON.stringify(queryBody, null, 2)}
          </EuiCodeBlock>
        </>
      )}

      {responseStr && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs"><h4>Response ({responseFormat})</h4></EuiTitle>
          <EuiSpacer size="xs" />
          <EuiCodeBlock
            language={responseFormat === 'JSON' ? 'json' : 'text'}
            fontSize="s"
            paddingSize="s"
            overflowHeight={200}
            isCopyable
          >
            {responseStr}
          </EuiCodeBlock>
        </>
      )}
    </EuiAccordion>
  )
}

export default FormatComparisonPanel
