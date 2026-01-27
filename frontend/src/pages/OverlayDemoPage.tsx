/**
 * Overlay Demo Page
 * 
 * Demonstrates the FloatingChatWidget overlay concept.
 * Shows how AI chat can be added to any page without disrupting the layout.
 */

import {
  EuiPageTemplate,
  EuiText,
  EuiSpacer,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiHorizontalRule,
  EuiIcon,
  EuiCard,
  EuiButton,
  EuiLink,
} from '@elastic/eui'
import { FloatingChatWidget } from '../components/chat'
import { AppHeader } from '../components/layout/AppHeader'
import { useBrand } from '../components/providers/BrandedThemeProvider'

/**
 * Sample content to demonstrate the overlay in action
 */
function SamplePageContent() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <EuiCallOut
        title="Live Demo Area"
        iconType="eye"
        color="primary"
      >
        <p>
          This section simulates a typical webpage. Notice the <strong>chat button</strong> in 
          the bottom-right corner — click it to see the overlay in action. The chat floats 
          above this content without hiding or disrupting it.
        </p>
      </EuiCallOut>

      <EuiSpacer size="xl" />

      <EuiTitle size="m">
        <h2>How the User Experiences It</h2>
      </EuiTitle>
      
      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type="eye" size="xl" />}
            title="1. Discover"
            description="User notices the chat button while browsing. It's visible but not intrusive — they can ignore it if they don't need help."
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type="discuss" size="xl" />}
            title="2. Engage"
            description="When they have a question, one click opens the chat. They can ask without leaving the page or losing their place."
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            icon={<EuiIcon type="merge" size="xl" />}
            title="3. Continue"
            description="After getting an answer, they minimise the chat and continue browsing. Context is preserved for follow-up questions."
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />
      <EuiHorizontalRule />
      <EuiSpacer size="l" />

      <EuiTitle size="m">
        <h2>Example Use Cases</h2>
      </EuiTitle>
      
      <EuiSpacer size="m" />

      <EuiText>
        <ul>
          <li><strong>E-commerce:</strong> "Is this laptop compatible with my monitor?" while viewing a product page</li>
          <li><strong>Documentation:</strong> "How do I configure SSL?" while reading a setup guide</li>
          <li><strong>Support portals:</strong> "What's my order status?" without navigating away from the dashboard</li>
          <li><strong>Government services:</strong> "Am I eligible for this benefit?" while reading policy information</li>
          <li><strong>Banking:</strong> "What fees apply to international transfers?" while reviewing account options</li>
        </ul>
      </EuiText>

      <EuiSpacer size="xl" />
      
      <EuiCallOut
        title="Try it now"
        iconType="cheer"
        color="success"
      >
        <p>
          Click the chat button in the bottom-right corner. Ask anything — the assistant is 
          connected to your configured Elastic agent. Notice how you can scroll this page, 
          read content, and chat simultaneously.
        </p>
      </EuiCallOut>
    </div>
  )
}

export function OverlayDemoPage() {
  const { brand } = useBrand()

  return (
    <>
      <AppHeader />
      <EuiSpacer size="xxl" />
      <EuiSpacer size="l" />

      <EuiPageTemplate restrictWidth={1000} panelled={false}>
        <EuiPageTemplate.Section>
          {/* Page Header */}
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.accent || brand.colors.primary})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <EuiIcon type="layers" size="l" color="ghost" />
              </div>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="l">
                <h1>The Overlay Pattern</h1>
              </EuiTitle>
              <EuiText color="subdued">
                <p>Add AI assistance to any page without changing the user experience</p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="xl" />

          {/* Explanation Panel */}
          <EuiPanel color="subdued" paddingSize="l">
            <EuiFlexGroup alignItems="flexStart">
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>What is the Overlay Pattern?</h2>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p>
                    The <strong>overlay pattern</strong> adds a floating AI chat widget to any webpage — 
                    sitting on top of the existing content rather than replacing it. Users can access 
                    AI assistance instantly while continuing to view and interact with the underlying page.
                  </p>
                  <p>
                    This pattern is particularly powerful for <strong>customer demos</strong>: you can show 
                    an AI assistant running directly on the customer's own website, giving them an immediate 
                    sense of how it would look and feel in their environment.
                  </p>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiTitle size="xs">
                  <h3>When to use overlay vs dedicated chat</h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText size="s">
                  <p><strong>Overlay chat</strong> works best for:</p>
                  <ul>
                    <li>Contextual help while browsing (e-commerce, documentation, support)</li>
                    <li>Quick questions that don't require leaving the current page</li>
                    <li>Rapid demos on customer websites using browser injection</li>
                    <li>Supplementing existing UX without disrupting user flow</li>
                  </ul>
                  <p><strong>Dedicated chat page</strong> works best for:</p>
                  <ul>
                    <li>Complex, multi-turn conversations where chat is the primary focus</li>
                    <li>Tasks requiring full attention (planning, analysis, research)</li>
                    <li>Conversations with rich outputs (code, tables, long-form content)</li>
                  </ul>
                </EuiText>
                <EuiSpacer size="m" />
                <EuiFlexGroup gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiButton href="/chat" iconType="discuss">
                      Try Dedicated Chat
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton href="/overlay-guide" iconType="popout" color="text">
                      Inject onto External Sites
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <div style={{ 
                  width: 220, 
                  height: 280, 
                  background: 'var(--euiColorLightShade)',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: 12,
                }}>
                  {/* Mini mockup of overlay */}
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    background: 'var(--euiColorEmptyShade)',
                    borderRadius: 8,
                    position: 'relative',
                    padding: 12,
                  }}>
                    {/* Mock page content */}
                    <div style={{ 
                      height: 8, 
                      width: '60%', 
                      background: 'var(--euiColorMediumShade)', 
                      borderRadius: 4,
                      marginBottom: 8,
                    }} />
                    <div style={{ 
                      height: 6, 
                      width: '90%', 
                      background: 'var(--euiColorLightShade)', 
                      borderRadius: 3,
                      marginBottom: 4,
                    }} />
                    <div style={{ 
                      height: 6, 
                      width: '75%', 
                      background: 'var(--euiColorLightShade)', 
                      borderRadius: 3,
                      marginBottom: 4,
                    }} />
                    <div style={{ 
                      height: 6, 
                      width: '85%', 
                      background: 'var(--euiColorLightShade)', 
                      borderRadius: 3,
                      marginBottom: 12,
                    }} />
                    <div style={{ 
                      height: 40, 
                      width: '100%', 
                      background: 'var(--euiColorLightShade)', 
                      borderRadius: 4,
                    }} />
                    
                    {/* Chat overlay mockup */}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      right: 8,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: brand.colors.primary,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}>
                      <EuiIcon type="discuss" size="s" color="ghost" />
                    </div>
                  </div>
                  <EuiText size="xs" color="subdued" style={{ 
                    position: 'absolute', 
                    bottom: -24, 
                    textAlign: 'center',
                    width: '100%',
                  }}>
                    <em>Chat floats over content</em>
                  </EuiText>
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="xl" />
          <EuiHorizontalRule />
          <EuiSpacer size="l" />

          {/* Sample Content Area */}
          <EuiPanel paddingSize="xl">
            <SamplePageContent />
          </EuiPanel>

          <EuiSpacer size="xl" />

          {/* Footer note */}
          <EuiText size="s" color="subdued" textAlign="center">
            <p>
              Want to add this overlay to external websites? Check out the{' '}
              <EuiLink href="/overlay-guide">Tampermonkey Injection Guide</EuiLink>.
            </p>
          </EuiText>

        </EuiPageTemplate.Section>
      </EuiPageTemplate>

      {/* Floating Chat Widget */}
      <FloatingChatWidget
        title={brand.name ? `${brand.name} Assistant` : 'AI Assistant'}
        greeting={`Hello! I'm your AI assistant. I can help answer questions while you browse this page.\n\nWhat would you like to know?`}
        placeholder="Ask a question..."
        position="bottom-right"
        primaryColor={brand.colors.primary}
      />
    </>
  )
}

export default OverlayDemoPage
