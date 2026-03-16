/**
 * Demo Track Configuration
 *
 * This file defines the demo guide tracks — the structured walkthrough
 * content shown on the Guide page. Each track is a themed demo flow
 * with scenarios, steps, and talking points.
 *
 * CUSTOMIZE THIS FILE for your specific demo!
 *
 * The build process fills this in during Phase 4c (Demo Polish).
 * SAs can edit talking points here without touching React code.
 *
 * Pattern: same as demoPrompts.ts — content separated from layout.
 * The DemoGuidePage.tsx renders whatever tracks are defined here.
 */

// =============================================================================
// Types
// =============================================================================

export interface DemoTrack {
  id: string
  title: string
  description: string
  color: 'primary' | 'success'
  badges: string[]
  valueProposition: {
    title: string
    icon: string
    content: string
  }
  scenarios: DemoScenario[]
  keyMessages: string[]
}

export interface DemoScenario {
  id: string
  badge?: string
  badgeColor?: 'primary' | 'accent' | 'success' | 'warning'
  title: string
  keyInsight: string
  steps?: string[]
  talkingPoints?: string[]
  demoPills?: Array<{ label: string; path: string; query?: string }>
  resources?: Array<{ label: string; href: string; type: 'docs' | 'blog' }>
}

// =============================================================================
// Resources
// =============================================================================

const RESOURCES = {
  agentBuilder: {
    docs: 'https://www.elastic.co/docs/solutions/security/ai-assistant',
    blog: 'https://www.elastic.co/blog/elastic-ai-assistant',
  },
  elasticCloud: {
    docs: 'https://www.elastic.co/cloud',
  },
  eui: {
    docs: 'https://eui.elastic.co/',
  },
}

// =============================================================================
// Demo Tracks
// =============================================================================

/**
 * DEFINE YOUR DEMO TRACKS HERE
 *
 * Example: Two tracks for an Agent Builder demo
 * - Track A: Core chat functionality
 * - Track B: Customization & debugging
 *
 * Delete or modify these for your specific demo needs.
 */
export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'ee-support',
    title: 'EE Support Knowledge Copilot',
    description: 'A fast path from symptom search to executive-ready resolution guidance',
    color: 'primary',
    badges: ['Incident Search', 'AI Guidance', 'Executive Narrative'],
    valueProposition: {
      title: 'From uncertainty to action in one flow',
      icon: 'wrench',
      content: 'This demo shows how support teams can search incidents, extract the right context, and generate a concise action plan that both technical and business stakeholders can trust.',
    },
    keyMessages: [
      '"The right context appears quickly with symptom-aware search"',
      '"Support decisions become faster when AI translates technical details into clear actions"',
      '"Leadership gets a crisp risk and downtime briefing without waiting for manual synthesis"',
    ],
    scenarios: [
      {
        id: 'open-console-and-search',
        badge: '1',
        badgeColor: 'primary',
        title: 'Search by symptom or fault signal',
        keyInsight: 'Incident retrieval starts from natural language, not exact system codes.',
        steps: [
          'Open the Support Console page',
          'Run a query such as "high vibration at high RPM"',
          'Use severity and equipment facets to focus the result set',
          'Select a relevant incident card',
        ],
        talkingPoints: [
          'The experience works for both known IDs and unknown symptoms',
          'Facets help technical users quickly isolate high-impact incidents',
          'Search relevance is transparent and easy to validate live',
        ],
        demoPills: [
          { label: 'Open Support Console', path: '/support-console' },
          { label: 'Open Search', path: '/search', query: 'high vibration at high RPM' },
        ],
        resources: [
          { label: 'Elastic Cloud', href: RESOURCES.elasticCloud.docs, type: 'docs' },
        ],
      },
      {
        id: 'send-to-copilot',
        badge: '2',
        badgeColor: 'primary',
        title: 'Send incident context to copilot',
        keyInsight: 'One click bridges raw incident data to actionable support guidance.',
        steps: [
          'Click "Send to Copilot" on a selected incident',
          'Observe the assistant response stream with clear recommended actions',
          'Highlight immediate action, risk framing, and expected downtime guidance',
        ],
        talkingPoints: [
          'The agent response is understandable by non-technical stakeholders',
          'This is where support velocity improves: less manual synthesis work',
          'The same pattern can be reused across many operational workflows',
        ],
        demoPills: [
          { label: 'Open Chat', path: '/chat' },
          { label: 'Return to Console', path: '/support-console' },
        ],
      },
      {
        id: 'executive-briefing',
        badge: '3',
        badgeColor: 'primary',
        title: 'Deliver a 30-second executive briefing',
        keyInsight: 'The narrative shifts from technical detail to business impact and decision readiness.',
        steps: [
          'Use the prompt asking for a 30-second briefing',
          'Read out the summary with immediate action and risk level',
          'Show how this closes the loop from symptom to decision',
        ],
        talkingPoints: [
          'Executives hear impact and confidence, not just raw diagnostics',
          'Technical users still retain evidence through incident selection and context',
          'The flow is repeatable for daily operations and incident reviews',
        ],
        demoPills: [
          { label: 'Support Console', path: '/support-console' },
          { label: 'Guide', path: '/guide' },
        ],
      },
    ],
  },
]
