/**
 * A2A Multi-Agent Coordinator Configuration
 * 
 * ============================================================
 * CUSTOMIZE THIS FILE FOR YOUR USE CASE
 * ============================================================
 * 
 * This is the central configuration for the A2A multi-agent chat.
 * Edit these values to adapt the coordinator for your specific demo.
 * 
 * ## How A2A Works
 * 
 * 1. User sends a message to the Coordinator
 * 2. Coordinator LLM (via LLM Proxy) decides which agent(s) to call
 * 3. Selected agent(s) execute and return results
 * 4. Coordinator synthesizes a final response
 * 
 * ## Adding New Agents
 * 
 * Agents are auto-discovered from Elastic Agent Builder!
 * Just create a new agent in Agent Builder with an A2A Agent Card,
 * and it will automatically appear in the agent selection list.
 * 
 * ## System Prompt Tips
 * 
 * The system prompt tells the coordinator HOW to route requests.
 * Be specific about:
 * - What each agent specializes in
 * - When to call which agent
 * - How to combine information from multiple agents
 * 
 * ## Example Use Cases
 * 
 * - Retail: Product search agent + Inventory agent + Recommendations agent
 * - Support: FAQ agent + Ticket creation agent + Escalation agent
 * - Research: Document search agent + Summarization agent + Citation agent
 */

export interface A2AConfig {
  /** 
   * Title shown in the chat header.
   * Use {brandName} as placeholder for dynamic brand name.
   */
  title: string
  
  /**
   * Initial greeting message from the coordinator.
   * Use {brandName} as placeholder for dynamic brand name.
   */
  greeting: string
  
  /**
   * Placeholder text in the message input.
   * Use {brandName} as placeholder for dynamic brand name.
   */
  placeholder: string
  
  /**
   * API endpoint for the A2A chat.
   * Default: '/api/agno/v2/chat' (Agno framework)
   */
  endpoint: string
  
  /**
   * Optional system prompt override.
   * If not set, uses the default coordinator prompt.
   * 
   * TIP: Include descriptions of your agents and when to use them.
   */
  systemPrompt?: string
}

/**
 * Default A2A configuration.
 * 
 * EDIT THESE VALUES for your specific use case!
 */
export const a2aConfig: A2AConfig = {
  // ============================================================
  // BASIC SETTINGS - Edit these for your demo
  // ============================================================
  
  title: '{brandName} A2A Coordinator',
  
  greeting: `Hello! 👋 I'm your {brandName} coordinator agent. I can route your requests to specialized agents and orchestrate multi-step tasks.

What would you like help with today?`,
  
  placeholder: 'Ask {brandName} Coordinator anything...',
  
  endpoint: '/api/agno/v2/chat',
  
  // ============================================================
  // SYSTEM PROMPT - Customize for your agents
  // ============================================================
  // 
  // Uncomment and edit this to customize coordinator behavior.
  // Describe your agents and when to use them.
  //
  // systemPrompt: `You are a helpful coordinator assistant.
  // 
  // You have access to the following specialized agents:
  // 
  // 1. **Recipe Agent** - For finding recipes, cooking tips, and meal planning
  // 2. **Product Agent** - For searching products, checking prices, and inventory
  // 
  // When a user asks a question:
  // - Route recipe/cooking questions to the Recipe Agent
  // - Route shopping/product questions to the Product Agent
  // - For complex requests (e.g., "plan dinner and get ingredients"), 
  //   coordinate between multiple agents
  // 
  // Always synthesize information from agents into a helpful, conversational response.`,
}

/**
 * Example configurations for common use cases.
 * Copy and adapt these for your specific demo.
 */
export const exampleConfigs = {
  /**
   * Retail/E-commerce use case
   */
  retail: {
    title: '{brandName} Shopping Assistant',
    greeting: `Welcome! 🛒 I'm your shopping assistant. I can help you find products, check availability, and get personalized recommendations.

What are you looking for today?`,
    placeholder: 'Search products, ask for recommendations...',
    endpoint: '/api/agno/v2/chat',
    systemPrompt: `You are a helpful retail shopping assistant.
    
Route requests to specialized agents:
- Product questions → Product Search Agent
- Recommendations → Recommendation Agent
- Order status → Order Agent

Be conversational and helpful. Suggest related products when appropriate.`,
  } as A2AConfig,

  /**
   * Customer support use case
   */
  support: {
    title: '{brandName} Support Assistant',
    greeting: `Hi! 👋 I'm here to help with any questions or issues you might have.

How can I assist you today?`,
    placeholder: 'Describe your question or issue...',
    endpoint: '/api/agno/v2/chat',
    systemPrompt: `You are a helpful customer support coordinator.

Route requests appropriately:
- FAQ questions → Knowledge Base Agent
- Technical issues → Technical Support Agent
- Complaints/escalations → Escalation Agent

Be empathetic and solution-focused.`,
  } as A2AConfig,

  /**
   * Research/Knowledge use case
   */
  research: {
    title: '{brandName} Research Assistant',
    greeting: `Hello! 📚 I'm your research assistant. I can help you find information, summarize documents, and answer questions.

What would you like to explore?`,
    placeholder: "Ask a question or describe what you're researching...",
    endpoint: '/api/agno/v2/chat',
    systemPrompt: `You are a helpful research assistant.

Route requests to specialized agents:
- Document search → Search Agent
- Summarization → Summary Agent
- Fact-checking → Verification Agent

Cite sources when possible. Be thorough but concise.`,
  } as A2AConfig,
}
