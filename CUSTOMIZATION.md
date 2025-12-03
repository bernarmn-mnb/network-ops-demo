# Customizing the Chat Experience

This guide covers common customization patterns for the chat interface. These configurations allow you to create branded, domain-specific demos without modifying core components.

---

## Quick Prompts

Quick prompts are clickable suggestion chips that help users understand what they can ask. They appear above the input when the conversation is fresh (≤1 messages) and disappear after the first user message.

### Basic Usage

```tsx
import { ChatContainer } from './components/chat'
import { Suggestion } from './components/chat/SuggestionChips'

function MyDemo() {
  const suggestions: Suggestion[] = [
    { icon: '🔍', label: 'Search products', prompt: 'Search for organic vegetables' },
    { icon: '📊', label: 'Show analytics', prompt: 'Show me sales analytics for this week' },
    { icon: 'help', label: 'Get help', prompt: 'What can you help me with?' },
  ]

  return (
    <ChatContainer
      suggestions={suggestions}
    />
  )
}
```

### Suggestion Interface

```typescript
interface Suggestion {
  icon?: string      // Emoji (e.g. '🔍') or EUI icon name (e.g. 'search')
  label: string      // Text displayed on the chip
  prompt: string     // Full message sent when clicked
}
```

### Tips

- **Use 3-5 prompts** - Too many can overwhelm users
- **Make them specific** - "Search for..." is better than just "Search"
- **Mix emojis and icons** - Emojis add personality, EUI icons feel professional
- **Cover key capabilities** - Show the range of what your assistant can do

---

## Custom Empty States

Replace the default "Start a Conversation" message with domain-specific content. This is shown when there are no messages in the conversation.

### Static Empty State

```tsx
<ChatContainer
  emptyState={
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h2>Welcome!</h2>
      <p>I'm your AI assistant. How can I help you today?</p>
    </div>
  }
/>
```

### Interactive Empty State

Pass a function to receive the `onSelect` callback, which triggers prompt submission:

```tsx
<ChatContainer
  emptyState={(onSelect) => (
    <AgentEmptyState
      onSelect={onSelect}  // Click handler to send prompts
    />
  )}
/>
```

### Example: Custom Empty State Component

```tsx
// MyEmptyState.tsx
import { EuiFlexGroup, EuiFlexItem, EuiCard, EuiIcon } from '@elastic/eui'

interface Props {
  onSelectPrompt: (prompt: string) => void
}

export function MyEmptyState({ onSelectPrompt }: Props) {
  const options = [
    { 
      icon: 'calendar', 
      title: 'Weekly Plan',
      description: 'Create a meal plan for the week',
      prompt: 'Help me plan meals for this week'
    },
    { 
      icon: 'search', 
      title: 'Find Recipes',
      description: 'Search by ingredients',
      prompt: 'Find recipes using chicken and rice'
    },
  ]

  return (
    <EuiFlexGroup gutterSize="m" wrap>
      {options.map((opt) => (
        <EuiFlexItem key={opt.title}>
          <EuiCard
            icon={<EuiIcon type={opt.icon} size="xl" />}
            title={opt.title}
            description={opt.description}
            onClick={() => onSelectPrompt(opt.prompt)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  )
}
```

---

## Greeting Messages

Set the initial assistant message that appears when the chat loads.

```tsx
<ChatContainer
  greeting="Hi there! I'm your personal shopping assistant. I can help you find products, compare prices, and track orders. What would you like to do?"
/>
```

### Tips

- **Introduce capabilities** - Tell users what the assistant can do
- **Set expectations** - Mention any limitations
- **Match the brand voice** - Formal for enterprise, friendly for consumer
- **Keep it concise** - 2-3 sentences maximum

---

## Placeholder Text

Customize the input field placeholder:

```tsx
<ChatContainer
  placeholder="Ask about recipes, nutrition, or meal planning..."
/>
```

---

## Title

Set the chat header title:

```tsx
<ChatContainer
  title="Meal Planning Assistant"
/>
```

---

## Standalone SuggestionChips

Use the `SuggestionChips` component independently for custom UIs:

```tsx
import { SuggestionChips } from './components/chat'

function MyComponent() {
  const handleSelect = (prompt: string) => {
    console.log('Selected:', prompt)
  }

  return (
    <SuggestionChips
      suggestions={[
        { icon: '🎯', label: 'Option A', prompt: 'Full prompt for A' },
        { icon: '🚀', label: 'Option B', prompt: 'Full prompt for B' },
      ]}
      onSelect={handleSelect}
      disabled={false}
    />
  )
}
```

---

## Complete Example

Here's a fully customized chat for a retail demo:

```tsx
import { ChatContainer } from './components/chat'

function RetailDemo() {
  return (
    <ChatContainer
      title="Shopping Assistant"
      greeting="Welcome! I can help you find products, check availability, and answer questions about our store. What are you looking for today?"
      placeholder="Search products, ask about deals..."
      quickPrompts={[
        { icon: '🔥', label: 'Today\'s deals', prompt: 'Show me today\'s best deals' },
        { icon: '📦', label: 'Track order', prompt: 'Track my recent order' },
        { icon: '🛒', label: 'View cart', prompt: 'Show my shopping cart' },
        { icon: 'help', label: 'Store info', prompt: 'What are your store hours?' },
      ]}
    />
  )
}
```

---

## Branding

For visual customization (colors, fonts, logos), see the branding system:

- `frontend/src/branding/` - Brand context and theming
- `hive-mind/patterns/branding/` - Brand extraction patterns
- `backend/app/routes/branding.py` - Brand API endpoints

---

## What NOT to Do

❌ **Don't hardcode domain content in core components** - Always use props  
❌ **Don't fork ChatContainer** - Use the customization props instead  
❌ **Don't add use-case specific logic** - Keep the template generic  

If you need functionality beyond these customization options, consider:
1. Creating a wrapper component that uses `ChatContainer`
2. Using the `emptyState` render prop for complex interactive states
3. Proposing an enhancement to the template (see CLAUDE.md for contribution guidelines)


