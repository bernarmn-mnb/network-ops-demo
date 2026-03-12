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

### Step 2b: Design for Extensibility

The template exists so demos can build on it. Every component you contribute should have a clear story for how a demo will extend it — not just use it as-is.

#### Config-Driven over Hardcoded

Generic components should accept a configuration object with sensible defaults that demos override. Don't bake in assumptions about any specific domain.

**Bad** — hardcoded section titles assume e-commerce:
```tsx
<h2>Shop by Category</h2>
```

**Good** — configurable with generic default:
```tsx
<h2>{config.categoriesTitle || 'Browse Categories'}</h2>
```

**Pattern**: Define a `*Config` type with all customisable content, export a `defaultConfig` with placeholder values, and accept the config as a prop. See `homeConfig.ts` + `BrandedHomePage.tsx` for the canonical example.

#### Composable, Not Monolithic

A new page should compose existing template components rather than reimplementing them. Before building a new component, check `docs/COMPONENT_REGISTRY.md` for existing ones.

| Instead of... | Compose with... |
|---------------|-----------------|
| Custom empty state markup | `BrandedEmptyState` |
| Inline product cards | `SearchResultCard` |
| Raw `fetch('/api/...')` calls | A `use*` hook (e.g. `useVisualSearch`, `useSearchSimple`) |
| Bespoke floating chat | `FloatingChatWidget` with custom props |
| Hardcoded persona data | `useProfile()` context |

#### Extension Points Checklist

When submitting a generic component, answer these questions in the PR description:

1. **How does a demo customise the content?** (config object, props, data file, env var)
2. **What does the component render with zero configuration?** It should look reasonable, not broken or empty.
3. **Can a demo wrap or compose this component?** (e.g. `<BrandedHomePage config={myDemoConfig} />`)
4. **Are labels, titles, and placeholder text generic?** No domain-specific vocabulary ("products", "recipes", "policies") in the defaults — or if present, configurable.
5. **Does it respect the brand theme?** Uses CSS variables (`var(--brand-primary)`, `var(--euiTextColor)`) not hardcoded colours.
6. **Is there a backend data source?** If so, is the index/field name configurable via `.env`?
7. **Did you add it to `docs/COMPONENT_REGISTRY.md`?**

#### Frontend Pages: The Config Pattern

Every reusable page should follow this structure:

```
config/fooConfig.ts     — FooPageConfig type + generic defaults
pages/FooPage.tsx       — accepts optional config prop, falls back to defaults
```

A demo then creates a thin wrapper:

```tsx
import { FooPage } from './FooPage'
import type { FooPageConfig } from '../config/fooConfig'

const myConfig: FooPageConfig = { title: 'My Demo Title', ... }
export default () => <FooPage config={myConfig} />
```

#### Backend Routes: Environment-Driven

Backend features should use `backend/app/config.py` settings with sensible defaults, not hardcoded values. Any index name, API key, or field name should be configurable via `backend/.env`.

```python
# Good: configurable
index = settings.VISUAL_SEARCH_INDEX or "products"

# Bad: hardcoded
index = "mns-products"
```

Update `backend/.env.example` with every new environment variable.

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

## PR Review Checklist

Reviewers should verify these before merging any component PR:

### Must Pass

- [ ] `./dev verify-template` — all checks green
- [ ] `npx tsc --noEmit` — frontend compiles
- [ ] No demo-specific content (grep for customer names, brand URLs, hardcoded data)
- [ ] No `package-lock.json` (project uses `yarn.lock`)
- [ ] No committed secrets or `.env` values
- [ ] New components added to `docs/COMPONENT_REGISTRY.md`
- [ ] New env vars added to `backend/.env.example`

### Extensibility Review

- [ ] **Config-driven**: Customisable content comes from a config object or props, not hardcoded strings
- [ ] **Sensible defaults**: Component renders a reasonable placeholder state with zero configuration
- [ ] **Composable**: New pages use existing components (`BrandedEmptyState`, `SearchResultCard`, `FloatingChatWidget`) rather than reimplementing
- [ ] **Theme-aware**: Uses CSS variables for colours, respects dark/light mode
- [ ] **Generic vocabulary**: Default labels don't assume a specific domain (e.g. "Browse Categories" not "Shop by Department")
- [ ] **Backend configurable**: Index names, API keys, field names read from `settings` / `.env`, not hardcoded
- [ ] **Clear extension story**: PR description explains how a demo would customise or extend the component

### Common Issues to Catch

| Issue | Fix |
|-------|-----|
| Lock file from wrong package manager | Remove `package-lock.json`, keep `yarn.lock` |
| Inline imports (`import shutil` inside function) | Move to module level |
| Hardcoded section titles | Make configurable via config prop with generic default |
| Missing module-level `__init__.py` or barrel export | Add `index.ts` or barrel file for clean imports |
| `__import__()` hacks | Use proper imports at the top of the file |
| Component exists but not in registry | Add to `docs/COMPONENT_REGISTRY.md` |

## Questions?

- Check existing issues/PRs in the template repo
- Review `hive-mind/patterns/` for similar patterns
- Ask in the template repo's discussions

______________________________________________________________________

**Remember**: The goal is to make the template better for everyone. If in doubt, make it more generic and configurable!
