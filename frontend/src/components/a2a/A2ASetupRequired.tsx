/**
 * A2ASetupRequired Component
 * 
 * Displays a friendly setup guide when LLM proxy is not configured.
 * Shows clear instructions on how to enable A2A functionality.
 */

import {
  EuiEmptyPrompt,
  EuiButton,
  EuiText,
  EuiCode,
  EuiSpacer,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui'

interface A2ASetupRequiredProps {
  /** Called when user clicks retry button */
  onRetry: () => void
  /** Whether we're currently checking the status */
  isLoading?: boolean
  /** Setup steps from the health endpoint */
  setupSteps?: string[]
  /** Setup hint from the health endpoint */
  setupHint?: string
  /** Error details if there was a connectivity issue */
  error?: string
  /** Error code from backend */
  errorCode?: string
}

export function A2ASetupRequired({
  onRetry,
  isLoading = false,
  setupSteps,
  setupHint: _setupHint, // Reserved for future use
  error,
  errorCode,
}: A2ASetupRequiredProps) {
  // Determine the message based on error code
  const getErrorContent = () => {
    if (errorCode === 'LLM_PROXY_AUTH_FAILED') {
      return {
        title: 'LLM Proxy Authentication Failed',
        color: 'warning' as const,
        icon: 'alert',
        message: 'Your API key appears to be invalid or expired.',
        steps: [
          'Contact your LLM proxy administrator for a new API key',
          'Edit backend/.env and update LLM_PROXY_API_KEY',
          'Restart the backend: ./dev restart',
        ],
      }
    }
    
    if (errorCode === 'LLM_PROXY_UNREACHABLE') {
      return {
        title: 'Cannot Connect to LLM Proxy',
        color: 'warning' as const,
        icon: 'offline',
        message: 'The LLM proxy service is not responding.',
        steps: [
          'Check your network/VPN connection',
          'Verify LLM_PROXY_URL in backend/.env is correct',
          'The LLM proxy service may be temporarily down',
        ],
      }
    }
    
    // Default: not configured
    return {
      title: 'A2A Setup Required',
      color: 'primary' as const,
      icon: 'gear',
      message: 'The A2A coordinator requires LLM proxy configuration to orchestrate multiple agents.',
      steps: setupSteps || [
        'Edit backend/.env file',
        'Add LLM_PROXY_URL=<your-llm-proxy-url>',
        'Add LLM_PROXY_API_KEY=<your-api-key>',
        'Restart the backend: ./dev restart',
      ],
    }
  }

  const content = getErrorContent()

  return (
    <EuiEmptyPrompt
      iconType={content.icon}
      iconColor={content.color}
      title={<h2>{content.title}</h2>}
      body={
        <>
          <EuiText color="subdued">
            <p>{content.message}</p>
          </EuiText>
          
          <EuiSpacer size="l" />
          
          <EuiCallOut
            title="How to enable A2A"
            color={content.color}
            iconType="info"
          >
            <ol style={{ textAlign: 'left', paddingLeft: '20px', margin: 0 }}>
              {content.steps.map((step, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  {step.includes('.env') || step.includes('./dev') ? (
                    <EuiCode>{step}</EuiCode>
                  ) : (
                    step
                  )}
                </li>
              ))}
            </ol>
          </EuiCallOut>

          {error && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="s" color="subdued">
                <p><strong>Error details:</strong> {error}</p>
              </EuiText>
            </>
          )}
          
          <EuiSpacer size="m" />
          
          <EuiText size="s" color="subdued">
            <p>
              <EuiIcon type="help" size="s" /> Not sure where to get credentials? Ask your team lead or check the LLM proxy documentation.
            </p>
          </EuiText>
        </>
      }
      actions={
        <EuiFlexGroup gutterSize="s" justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={onRetry}
              isLoading={isLoading}
              iconType="refresh"
            >
              Check Again
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  )
}

