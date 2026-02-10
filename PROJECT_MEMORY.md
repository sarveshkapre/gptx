# Project Memory (GPTx)

This file captures decisions, evidence, and follow-ups from maintenance cycles.

## 2026-02-09

### Decision: Throttle streaming markdown renders and provide “Copy Markdown”
- Why: re-rendering markdown on every streamed delta causes layout thrash/jank; also users often want either clean plaintext paste or raw markdown source.
- Evidence: `npm run lint`, `npm test`, `npm run build` pass locally.
- Implementation: throttled render loop in `src/content-script/index.mjs`; added a dedicated “Copy Markdown” footer action in `src/constants/template-strings.mjs` + styling in `src/css/result-card.css`.
- Commit: `a5ce952`
- Confidence: High
- Trust label: Local

### Decision: Validate OpenAI popup settings with clear inline feedback
- Why: invalid model strings / malformed keys create confusing background failures; catching obvious input errors early improves reliability and reduces support burden.
- Evidence: `npm run lint`, `npm test`, `npm run build` pass locally.
- Implementation: model + key validation + status styling in `src/popup/index.mjs`, `src/css/popup.css`.
- Commit: `4bd2acf`
- Confidence: High
- Trust label: Local

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

### Decision: Add CI packaging regression guard (manifest artifact checker)
- Why: Extension builds can silently drift (missing JS/CSS/icon references); validating `build/chromium/manifest.json` references in CI catches broken packages early.
- Evidence: `npm run build` + `npm run check:build` pass locally; GitHub Actions run includes the new step and is green.
- Implementation: added `scripts/check-build-artifacts.mjs`, `npm run check:build`, and CI step.
- Commit: `725900f`
- Confidence: High
- Trust label: Local

### Decision: Add optional OpenAI Responses API streaming mode (user-provided key + model)
- Why: ChatGPT web-session endpoints are brittle and can break without warning; offering an official OpenAI API path improves long-term reliability and user control.
- Evidence: local lint/test/build/check pass; GitHub Actions CI green after push.
- Implementation: popup OpenAI settings UI + background streaming via `https://api.openai.com/v1/responses` with fallback to ChatGPT session mode.
- Commit: `dd8e021`
- Confidence: Medium
- Trust label: Local

### Decision: Add local “Report answer” capture on result card
- Why: Enables lightweight user feedback/debug bundles without any server-side collection; useful for triage and future UX iteration.
- Evidence: local lint/test/build/check pass; GitHub Actions CI green after push.
- Implementation: report button on result card + store bundles in `storage.local` under `gptxAnswerReports`.
- Commit: `0b2b509`
- Confidence: High
- Trust label: Local

### Mistakes And Fixes: Domain normalization didn’t strip `WWW.` when input was mixed case
- Root cause: `normalizeDomain` removed `www.` before lowercasing, so `WWW.Example.com` was not canonicalized.
- Fix: lowercase first, then strip `www.`.
- Prevention: add a unit test that covers mixed-case `WWW.` domains (kept in `test/utils.test.mjs`).
- Commit: `c6467a7`
- Trust label: Local

### Mistakes And Fixes: Parallel git commits caused a transient `.git/index.lock`
- Root cause: attempted to run two `git commit` commands concurrently.
- Fix: reran the second commit after the first completed.
- Prevention: do not parallelize git write operations (commit/push/tag); run them sequentially.
- Commit: `725900f`
- Trust label: Local

### Mistakes And Fixes: `git push`/`git ls-remote` hung due to HTTP/2 transport
- Root cause: `git-remote-https` stalled when negotiating HTTP/2 to GitHub on this machine.
- Fix: force Git to use HTTP/1.1 (`git config --global http.version HTTP/1.1`) and retry.
- Prevention: keep `http.version` pinned to `HTTP/1.1` for this environment; if reverting, verify `git ls-remote origin` completes quickly first.
- Commit: N/A (environment config)
- Trust label: Local

### Verification Evidence
- `npm ci` (pass, 0 vulnerabilities)
- `npm run lint` (pass)
- `npm test` (pass)
- `npm run build` (pass)
- `npm run check:build` (pass)
- `npm run test:e2e` (pass)

## Follow-ups
- Add optional “Citations” mode (user can ask for sources; render as links) while keeping defaults simple.
- Add per-site enable/disable toggle (Google-only by default) with a small allowlist of supported search engines.
- Add a “Clear cache for this query” control (delete cached answer entry only) without touching global settings or all-history.

## 2026-02-10

### Decision: Add “Stop generating” and treat abort as non-fatal (don’t clear ChatGPT token cache)
- Why: Streaming can get stuck or become “good enough” before completion; users need a fast cancel path. Clearing the cached ChatGPT access token on abort forces unnecessary re-logins.
- Evidence: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run check:build` pass locally; GitHub Actions run `21861123594` is green.
- Implementation: stop button wired to disconnect the active stream port (background aborts via `AbortController`); background no longer deletes cached ChatGPT token on abort; new-tab action moved to `runtime.sendMessage`.
- Commit: `1a381bc`
- Confidence: High
- Trust label: Local

### Decision: Classify OpenAI API errors and optimize SSE decoding
- Why: Generic “OpenAI error” messaging increases support load and user confusion; classifying invalid model vs quota/billing vs rate limit vs server error enables actionable, safe UX. Reusing a single `TextDecoder` reduces overhead while streaming.
- Evidence: unit tests added; `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run check:build` pass locally; GitHub Actions run `21861189540` is green.
- Implementation: add `src/utils/openai-error-utils.mjs` + tests; include a bounded body snippet in `HTTP_XXX:` errors to improve classification; update UI error messages.
- Commit: `2009868`
- Confidence: High
- Trust label: Local

### Verification Evidence
- `npm run lint` (pass)
- `npm test` (pass)
- `npm run test:e2e` (pass)
- `npm run build` (pass)
- `npm run check:build` (pass)
