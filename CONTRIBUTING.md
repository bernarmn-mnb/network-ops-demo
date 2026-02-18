# Contributing Back to elastic-demo-starter

This guide helps you identify and contribute reusable functionality back to the template project.

## Git Setup

`./setup.sh` handles git setup automatically — it creates a demo branch and optionally forks the repo. After setup, your remotes look like this:

- **`origin`**: The template repository (`elastic/elastic-demo-starter`)
- **`fork`**: Your personal fork (created by setup if you chose to fork)

Your demo work lives on a dedicated branch (e.g. `demo/acme-retail`). Push to your fork:

```bash
git push -u fork demo/acme-retail
```

### Manual Setup (if you skipped setup.sh)

```bash
# Create a demo branch
git checkout -b demo/customer-name

# Fork via GitHub CLI
gh repo fork elastic/elastic-demo-starter --remote --remote-name fork

# Or add a fork manually
git remote add fork https://github.com/YOUR-USERNAME/elastic-demo-starter.git
```

### Syncing with Template

Pull template updates from `origin/main` into your demo branch:

```bash
git fetch origin
git log HEAD..origin/main --oneline    # See what's new
git merge origin/main                  # Merge template updates
```

## Identifying Reusable Functionality

### ✅ Good Candidates for Template

These are **generic** and useful for any demo:

- **Core infrastructure**: Error boundaries, loading states, empty states
- **UI patterns**: Reusable components (not brand-specific)
- **Utilities**: Helper functions, hooks, API clients
- **Configuration**: Setup scripts, dev tools, build improvements
- **Documentation**: Patterns, troubleshooting guides, workflows
- **Hive Mind patterns**: New patterns in `hive-mind/patterns/`

### ❌ Keep in Demo Only

These are **demo-specific** and shouldn't go in template:

- Brand-specific components (e.g., `[customer]/`)
- Customer-specific logic or data
- Demo-specific agent configurations
- Hardcoded API endpoints or credentials
- Demo-specific routes/pages

## Contribution Workflow

### Step 1: Identify Reusable Code

Run the helper script to identify potential contributions:

```bash
./scripts/identify-reusable.sh
```

This will:

- List new files that might be reusable
- Identify demo-specific code (brand names, customer names)
- Suggest which files could be contributed

### Step 2: Extract and Sanitize

Before contributing:

1. **Remove demo-specific references**:

   - Replace hardcoded brand names with variables
   - Remove customer-specific data
   - Generalize component names if needed

2. **Make it configurable**:

   - Use environment variables
   - Add configuration options
   - Support multiple use cases

3. **Document it**:

   - Add JSDoc/type hints
   - Update README if needed
   - Add to hive-mind patterns if it's a pattern

### Step 3: Verify Template Integrity

Before submitting, run the verification suite to make sure your changes don't break the template:

```bash
# Run all structural checks (route conflicts, contract alignment, page completeness)
./dev verify-template

# These checks also run in CI — your PR will fail if they don't pass
```

The checks catch common issues:
- **Route conflicts**: Two route files defining the same endpoint path
- **Contract drift**: Frontend calling an API endpoint that doesn't exist in the backend
- **Missing pages**: App.tsx referencing a component file that doesn't exist
- **Localhost leaks**: Hardcoded `http://localhost` URLs that break Cloud Run

### Step 4: Test in Isolation

Create a test branch to verify the functionality works standalone:

```bash
# Create a clean branch
git checkout -b extract-reusable-feature

# Test that it works without demo-specific code
# ... make changes ...

# Commit
git add .
git commit -m "Extract reusable feature: [feature name]"
```

### Step 5: Contribute Back

#### Option A: Direct Push (if you have write access)

```bash
# Switch to template repo or create a branch
git checkout -b feature/reusable-feature-name

# Cherry-pick or manually copy the changes
# ... make changes ...

# Push to template
git push upstream feature/reusable-feature-name

# Open PR on GitHub
```

#### Option B: Fork Workflow (recommended)

1. Fork `elastic-demo-starter` on GitHub

2. Add your fork as a remote:

   ```bash
   git remote add my-fork https://github.com/YOUR-USERNAME/elastic-demo-starter.git
   ```

3. Push your changes:

   ```bash
   git push my-fork feature/reusable-feature-name
   ```

4. Open PR from your fork to upstream

## Example: Contributing a New Component

### Example 1: ErrorBoundary Component

#### 1. Original (Demo-Specific)

```tsx
// frontend/src/components/ErrorBoundary.tsx
// Line 49: "The kitchen page encountered an error:" ❌ Too specific
```

#### 2. Sanitized (Reusable)

```tsx
// frontend/src/components/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;  // ✅ Make configurable
  showDetails?: boolean;  // ✅ Optional
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  // Change line 49 to:
  <p>{this.props.title || "Something went wrong"}</p>  // ✅ Generic
}
```

### Example 2: QuickPrompts Component

#### 1. Original (Demo-Specific)

```tsx
// frontend/src/components/chat/QuickPrompts.tsx
// Before: Hardcoded domain-specific prompts ❌
const QUICK_PROMPTS = [
  { icon: '⏱️', label: 'Domain-specific prompt', ... },
  // Hardcoded prompts ❌
]
```

#### 2. Sanitized (Reusable)

```tsx
// frontend/src/components/chat/QuickPrompts.tsx
interface QuickPrompt {
  icon: string;
  label: string;
  prompt: string;
}

interface QuickPromptsProps {
  prompts?: QuickPrompt[];  // ✅ Make configurable
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

// Default prompts (can be overridden)
const DEFAULT_PROMPTS: QuickPrompt[] = [
  { icon: '⏱️', label: 'Quick meals', prompt: '...' },
  // Generic prompts ✅
]

export function QuickPrompts({
  prompts = DEFAULT_PROMPTS,  // ✅ Configurable
  onSelect,
  disabled = false
}: QuickPromptsProps) {
  // Use prompts prop instead of hardcoded constant
}
```

### 3. Document in Hive Mind

If it's a pattern, add to `hive-mind/patterns/`:

```bash
# Add pattern documentation
vim hive-mind/patterns/react/ERROR_BOUNDARY_PATTERN.md

# Commit to hive-mind submodule
cd hive-mind
git add .
git commit -m "Add error boundary pattern"
git push
cd ..
```

## Quick Reference

### Common Reusable Features

| Feature            | Location                                    | Template Path                   |
| ------------------ | ------------------------------------------- | ------------------------------- |
| Error Boundaries   | `frontend/src/components/ErrorBoundary.tsx` | `frontend/src/components/`      |
| Branding System    | `frontend/src/branding/`                    | `frontend/src/branding/`        |
| Chat Components    | `frontend/src/components/chat/`             | `frontend/src/components/chat/` |
| Hive Mind Patterns | `hive-mind/patterns/`                       | `hive-mind/patterns/`           |
| Setup Scripts      | `scripts/`                                  | `scripts/`                      |
| Dev Tools          | `dev`, `setup.sh`                           | Root                            |

### Files to Always Contribute

- ✅ `hive-mind/` changes (patterns, troubleshooting)
- ✅ `.cursorrules` / `CLAUDE.md` improvements
- ✅ `setup.sh` improvements
- ✅ `dev` script enhancements
- ✅ Generic utility functions

## Questions?

- Check existing issues/PRs in the template repo
- Review `hive-mind/patterns/` for similar patterns
- Ask in the template repo's discussions

______________________________________________________________________

**Remember**: The goal is to make the template better for everyone. If in doubt, make it more generic and configurable!
