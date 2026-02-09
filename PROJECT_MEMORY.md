# Project Memory (GPTx)

This file captures decisions, evidence, and follow-ups from maintenance cycles.

## 2026-02-09

### Decision: Use browser-native clipboard APIs (no Node clipboard dependency)
- Why: `clipboardy` is Node-only and can break in extension/content-script contexts; a small helper keeps copy flows reliable and reduces bundle size.
- Evidence: `npm run lint`, `npm test`, `npm run build` all pass locally.
- Implementation: `src/utils/clipboard-utils.mjs` and callers updated.
- Commit: `f482a8f`
- Confidence: High
- Trust label: Local

### Decision: Add configurable history retention (TTL days + max entries) with pruning on writes
- Why: Avoid unbounded `storage.local` growth while keeping defaults non-destructive (0 = unlimited unless user opts in).
- Evidence: unit tests for pruning logic; local lint/test/build pass.
- Implementation: popup UI controls + pruning on history writes in content-script.
- Commit: `147e362`
- Confidence: High
- Trust label: Local

## Follow-ups
- Add a Playwright extension smoke test that loads `build/chromium` and exercises popup/history/security pages.
- Consider upgrading build deps flagged by `npm audit` (esbuild, cross-spawn, etc.) when safe.

