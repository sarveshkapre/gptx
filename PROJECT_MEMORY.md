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

### Decision: Add baseline maintainer docs and trackers in-repo
- Why: Make the maintenance contract and change memory explicit and reviewable.
- Evidence: docs added; local checks pass.
- Implementation: `AGENTS.md`, `PROJECT_MEMORY.md`, `INCIDENTS.md`, README update.
- Commit: `891b542`
- Confidence: High
- Trust label: Local

### Decision: Keep `npm audit` clean by upgrading `esbuild`
- Why: Reduce supply-chain risk and keep CI free of known vulnerabilities; esbuild is build-time only here.
- Evidence: `npm audit` reports 0 vulnerabilities; build still succeeds.
- Implementation: dependency bump + lockfile refresh.
- Commit: `b262cd3`
- Confidence: High
- Trust label: Local

### Decision: Normalize Security Center allowlist/blocklist inputs and match on root domains
- Why: Users paste URLs and mixed-case domains; without canonicalization, lists silently fail to match. Root-domain matching makes allow/block rules work across subdomains with less surprise.
- Evidence: `npm run lint`, `npm test`, `npm run build` pass locally.
- Implementation: `normalizeDomainEntry/normalizeDomainList` helpers + root-domain matching in risk assessment; Security Center saves canonical lists.
- Commit: `f836ab7`, `c6467a7`
- Confidence: High
- Trust label: Local

### Decision: Add JSON export actions for History and Security Center (reports/alerts)
- Why: Makes debugging/support easier and gives power users control over their data without external services.
- Evidence: `npm run lint`, `npm test`, `npm run build` pass locally.
- Implementation: “Export history (JSON)” in history UI; “Download” buttons for Security Center reports/alerts.
- Commit: `19e55b9`, `f836ab7`
- Confidence: High
- Trust label: Local

### Decision: Remove stale legacy root-level `content-script.js`
- Why: It was tracked but not used by the build output (`build/chromium/`), and it conflicted with the maintained MV3 source under `src/`.
- Evidence: `npm run lint`, `npm test`, `npm run build` pass locally after removal.
- Implementation: deleted tracked legacy file.
- Commit: `d22031b`
- Confidence: High
- Trust label: Local

### Mistakes And Fixes: Domain normalization didn’t strip `WWW.` when input was mixed case
- Root cause: `normalizeDomain` removed `www.` before lowercasing, so `WWW.Example.com` was not canonicalized.
- Fix: lowercase first, then strip `www.`.
- Prevention: add a unit test that covers mixed-case `WWW.` domains (kept in `test/utils.test.mjs`).
- Commit: `c6467a7`
- Trust label: Local

### Verification Evidence
- `npm ci` (pass, 0 vulnerabilities)
- `npm run lint` (pass)
- `npm test` (pass)
- `npm run build` (pass)

## Follow-ups
- Add a Playwright extension smoke test that loads `build/chromium` and exercises popup/history/security pages.
