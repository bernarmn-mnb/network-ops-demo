# Professional Clone QA Checklist

Use this checklist to verify a demo feels like a polished clone of the customer site, not a generic template.

## 1) Brand Package Completeness (Required)

- [ ] Customer source URL captured.
- [ ] Primary logo (light and dark-safe usage) captured.
- [ ] Color palette defined (primary, secondary, neutral, accent, success/warn/error).
- [ ] Typography pair selected (display + body) and applied.
- [ ] Imagery style captured (hero, card, section visuals).
- [ ] Brand package stored in a reusable theme/config location.

## 2) Comparative Visual Check (Customer vs Demo)

Capture matching screenshots for customer site and demo pages:
- [ ] Hero/landing surface
- [ ] Navigation/header area
- [ ] Content card/list section
- [ ] Chat/assistant surface
- [ ] Guide/storytelling surface

For each page pair, verify:
- [ ] Visual hierarchy matches intent (headline, body, CTA emphasis).
- [ ] Spacing rhythm feels intentional and consistent.
- [ ] Color use is on-brand (no default EUI/template bleed-through).
- [ ] Typography tone is aligned to customer brand.
- [ ] Imagery style is coherent with customer look.

## 3) Core UX Quality Gates

- [ ] No content hidden under fixed header.
- [ ] Empty states are domain-correct and visually complete.
- [ ] Mobile spot check (~375px width) shows no critical breakage.
- [ ] Light and dark mode both look professional.
- [ ] Navigation labels and page titles match customer/domain language.

## 4) Functional + Narrative Gates

- [ ] Every demo prompt in `demoPrompts.ts` is executed and logged.
- [ ] Every search pill in `searchConfig.ts` is executed and logged.
- [ ] Guide track walkthrough completed from customer persona perspective.
- [ ] Each wow moment in `DEMO_PLAN.md` has evidence from live run.
- [ ] Final flow tells a coherent story from problem to outcome.

## 5) Agent Readiness Gate (Conditional)

Apply this section only if the demo includes an agent/chat experience (for example, `/chat`, `/support-console`, voice chat, or agent-backed workflows).

- [ ] `./dev session` agent mode is understood:
  - Configured default (`AGENT_ID` set), or
  - Explicit `agent_id` mode (set per request)
- [ ] Evaluation commands use correct API schema for `/api/agent/chat/test`.
- [ ] Readiness signal and observed runtime behavior are consistent.

## 6) Sign-off Artifacts (Required)

- [ ] `docs/testing/eval-report.md` updated with verdict, scores, and issues.
- [ ] Screenshot evidence attached or linked.
- [ ] Open defects logged as beads with severity and owner.
- [ ] Presenter handoff includes URL, first-run path, and fallback path.
