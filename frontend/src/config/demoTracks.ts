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
    id: 'a',
    title: '💬 Track A: Agent Chat',
    description: 'Core chat functionality with Agent Builder',
    color: 'primary',
    badges: ['Streaming', 'Reasoning', 'Tool Calls'],
    valueProposition: {
      title: 'AI-Powered Conversations',
      icon: 'discuss',
      content: 'Agent Builder enables sophisticated AI assistants with streaming responses, visible reasoning steps, and tool integration. Build customer-facing chat experiences that show users how the AI thinks through problems.',
    },
    keyMessages: [
      '"Streaming responses feel instant — no waiting for the full answer"',
      '"Reasoning steps build trust by showing the AI\'s thought process"',
      '"Tool calls extend capabilities beyond just conversation"',
    ],
    scenarios: [
      {
        id: 'chat-basics',
        badge: '1',
        badgeColor: 'primary',
        title: 'Basic Chat Interaction',
        keyInsight: 'Agent Builder provides streaming responses with full reasoning visibility.',
        steps: [
          'Navigate to the Chat page',
          'Type a question and observe the streaming response',
          'Notice the reasoning steps appearing before the final answer',
          'Ask a follow-up question to show conversation context',
        ],
        talkingPoints: [
          'Responses stream in real-time for better UX',
          'Reasoning steps show how the agent thinks through the problem',
          'Conversation history is maintained for context',
        ],
        demoPills: [
          { label: 'Open Chat', path: '/chat' },
        ],
        resources: [
          { label: 'Agent Builder Docs', href: RESOURCES.agentBuilder.docs, type: 'docs' },
        ],
      },
      {
        id: 'tool-calls',
        badge: '2',
        badgeColor: 'primary',
        title: 'Tool Calls & Actions',
        keyInsight: 'Agents can use tools to search data, call APIs, and take actions.',
        steps: [
          'Ask a question that requires data lookup',
          'Observe the tool call card appearing',
          'Show the input/output of the tool',
          'See how the agent incorporates the result into its answer',
        ],
        talkingPoints: [
          'Tools extend agent capabilities beyond just chat',
          'Tool calls are visible for transparency',
          'The agent decides when and which tools to use',
        ],
        demoPills: [
          { label: 'Open Chat', path: '/chat' },
          { label: 'MCP Explorer', path: '/mcp' },
        ],
      },
      {
        id: 'audit',
        badge: '3',
        badgeColor: 'primary',
        title: 'Conversation Audit',
        keyInsight: 'Full visibility into agent reasoning and tool usage.',
        steps: [
          'Have a conversation in the Chat page',
          'Navigate to the Audit page',
          'Select the conversation',
          'Expand to see reasoning steps and tool calls',
        ],
        talkingPoints: [
          'Complete audit trail of all interactions',
          'Useful for debugging and quality assurance',
          'Shows exactly why the agent gave a certain response',
        ],
        demoPills: [
          { label: 'View Audit', path: '/audit' },
        ],
      },
    ],
  },
  {
    id: 'b',
    title: '🎨 Track B: Customization',
    description: 'Branding, theming, and presentation',
    color: 'success',
    badges: ['Branding', 'Themes', 'White-label'],
    valueProposition: {
      title: 'Quick Customization',
      icon: 'brush',
      content: 'Demos can be quickly rebranded for different customers without code changes. Support for multiple brand themes, dark/light modes, and AI-powered brand extraction from websites.',
    },
    keyMessages: [
      '"Rebrand in minutes, not days"',
      '"Same demo, different look for each customer"',
      '"AI can extract brand colors and fonts automatically"',
    ],
    scenarios: [
      {
        id: 'brand-editor',
        badge: '1',
        badgeColor: 'success',
        title: 'Brand Editor',
        keyInsight: 'Create custom themes with a visual editor — no code required.',
        steps: [
          'Open the Brand Editor page',
          'Create a new brand or select existing',
          'Adjust colors using the color pickers',
          'Upload a logo for light and dark modes',
          'Preview the changes in real-time',
        ],
        talkingPoints: [
          'Non-technical users can customize the look',
          'Changes persist across sessions',
          'Multiple brands can be saved and switched',
        ],
        demoPills: [
          { label: 'Brand Editor', path: '/brands' },
        ],
      },
      {
        id: 'branded-demo',
        badge: '2',
        badgeColor: 'success',
        title: 'Branded Presentation',
        keyInsight: 'Full-screen mode designed for customer presentations.',
        steps: [
          'Select a brand theme',
          'Navigate to the Branded Demo page',
          'Show the clean, full-screen interface',
          'Toggle between light and dark modes',
        ],
        talkingPoints: [
          'Distraction-free interface for demos',
          'Brand colors applied throughout',
          'Professional look for customer meetings',
        ],
        demoPills: [
          { label: 'Branded Demo', path: '/branded' },
        ],
      },
      {
        id: 'ai-extraction',
        badge: '⭐',
        badgeColor: 'accent',
        title: 'AI Brand Extraction',
        keyInsight: 'AI can extract brand colors, fonts, and style from any website.',
        steps: [
          'Tell your AI assistant: "Extract branding from [customer-website.com]"',
          'AI visits the site and identifies brand elements',
          'A complete theme file is generated automatically',
          'Brand is immediately available in the editor',
        ],
        talkingPoints: [
          'Works with any public website',
          'Extracts primary colors, accent colors, fonts',
          'Creates production-ready theme code',
        ],
        resources: [
          { label: 'Branding Docs', href: RESOURCES.eui.docs, type: 'docs' },
        ],
      },
    ],
  },
]
