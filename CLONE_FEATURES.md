# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] P1: Add CI failure triage note/guardrail for transient GitHub checkout 5xx errors and rerun policy (`score I/E/S/D/R/C: 3/1/4/2/1/5`).
- [ ] P2: Add per-site enable/disable toggle (Google-only default) with a small supported engine allowlist (`score I/E/S/D/R/C: 4/3/4/3/2/4`).
- [ ] P2: Add per-entry “Copy link + answer” share bundle for local support/debugging (no upload) (`score I/E/S/D/R/C: 3/2/4/3/2/4`).
- [ ] P2: Add keyboard shortcut (`Shift+R`) for “Regenerate” when answer card is focused (`score I/E/S/D/R/C: 2/1/3/1/1/5`).
- [ ] P2: Add source-domain badges for generated answers when citations mode is on (`score I/E/S/D/R/C: 3/2/4/4/2/3`).
- [ ] P2: Add privacy-safe truncation policy for stored answer reports/history size caps (`score I/E/S/D/R/C: 4/2/5/2/2/4`).
- [ ] P2: Add structured telemetry-free debug snapshot export (settings + latest cache metadata only) (`score I/E/S/D/R/C: 3/2/4/3/2/4`).
- [ ] P3: Add stale-cache age indicator in card/history metadata (`score I/E/S/D/R/C: 2/1/3/2/1/5`).
- [ ] P3: Add “retry with fallback mode” CTA when OpenAI API fails (`score I/E/S/D/R/C: 3/2/4/2/2/4`).
- [ ] P3: Refactor duplicated storage bootstrapping into shared utilities (`score I/E/S/D/R/C: 3/2/4/1/1/4`).
- [ ] P3: Add smoke test asserting follow-up keyboard shortcuts (`/`, `Enter`, `Escape`) (`score I/E/S/D/R/C: 2/2/3/1/1/4`).
- [ ] P3: Add optional warning when a query appears sensitive before generation (`score I/E/S/D/R/C: 2/2/3/3/2/3`).
- [ ] P3: Improve popup layout token consistency and fix duplicated CSS variable declaration (`score I/E/S/D/R/C: 2/1/3/1/1/5`).
- [ ] P3: Add docs split so README stays short and links deep guides under `docs/` (`score I/E/S/D/R/C: 2/2/4/1/1/4`).
- [ ] P3: Add automated check ensuring ignored storage keys are documented in one source of truth (`score I/E/S/D/R/C: 2/2/3/1/1/4`).

## Implemented
- [x] 2026-02-11: Add optional citations mode (popup default + in-card toggle) with source-aware prompt constraints and citation-friendly markdown output.
  Evidence: `src/popup/index.html`, `src/popup/index.mjs`, `src/constants/template-strings.mjs`, `src/content-script/index.mjs`, `src/utils/history-utils.mjs`, `test/utils.test.mjs`, `test/extension-smoke.test.mjs`, `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run check:build`, `GPTX_E2E=1 npm run test:e2e`
- [x] 2026-02-11: Add “Clear cache for this query” footer control to delete only the active query cache key(s) without touching global settings/history.
  Evidence: `src/constants/template-strings.mjs`, `src/content-script/index.mjs`, `npm run lint`, `npm test`, `npm run build`, `npm run check:build`
- [x] 2026-02-11: Fix sensitive-data leak risk by excluding OpenAI keys/model and answer-report storage keys from history rendering/export.
  Evidence: `src/utils/history-utils.mjs`, `test/utils.test.mjs`, `npm run lint`, `npm test`
- [x] 2026-02-10: Add an Escape-key shortcut to stop generation when the user is not typing (follow-up input not focused).
  Evidence: `src/content-script/index.mjs`, `npm run lint`, `npm test`, `npm run build`, `npm run check:build`
- [x] 2026-02-10: Add “Stop generating” to cancel streaming answers without forcing page reload; avoid clearing the cached ChatGPT access token on user-initiated abort.
  Evidence: `src/constants/template-strings.mjs`, `src/css/result-card.css`, `src/content-script/index.mjs`, `src/background/index.mjs`, `npm run lint`, `npm test`, `npm run build`, `npm run check:build`
- [x] 2026-02-10: Improve OpenAI API error UX (invalid model/quota/rate-limit/server) with a small classifier + tests; optimize background SSE decoding and include HTTP error snippets for safer classification.
  Evidence: `src/utils/openai-error-utils.mjs`, `src/background/index.mjs`, `src/background/fetch-sse.mjs`, `src/content-script/index.mjs`, `test/utils.test.mjs`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run check:build`
- [x] 2026-02-09: Throttle streaming markdown renders to reduce UI jank; update “Copy” to copy rendered plaintext and add “Copy Markdown” to copy the raw markdown answer.
  Evidence: `src/content-script/index.mjs`, `src/constants/template-strings.mjs`, `src/css/result-card.css`, `npm run lint`, `npm test`, `npm run build`
- [x] 2026-02-09: Validate OpenAI settings input in popup (model string + API key sanity checks) and show clearer error states.
  Evidence: `src/popup/index.mjs`, `src/css/popup.css`, `npm run lint`, `npm test`, `npm run build`
- [x] 2026-02-09: Add an end-to-end extension smoke test (Playwright) that loads the MV3 extension and verifies popup/history/security pages render; runs in CI under `xvfb`.
  Evidence: `test/extension-smoke.test.mjs`, `.github/workflows/ci.yml`, `package.json`, `npm run test:e2e`
- [x] 2026-02-09: Reduce packaged extension size by stripping Bootstrap CSS sourcemap references and no longer shipping `bootstrap.min.css.map`.
  Evidence: `build.mjs` and `build/chromium/bootstrap.min.css` (no `sourceMappingURL`), plus `npm run build`
- [x] 2026-02-09: Remove noisy popup `console.log` calls on enable/disable toggle.
  Evidence: `src/popup/index.mjs` and `npm run lint`
- [x] 2026-02-09: Add optional OpenAI API mode (Responses API, streaming) using a user-provided API key + model setting, with ChatGPT-web session fallback.
  Evidence: `src/background/index.mjs`, `src/popup/index.html`, `src/popup/index.mjs`, `src/content-script/index.mjs`, `README.md`
- [x] 2026-02-09: Add a lightweight build artifact checker (validate `build/chromium/manifest.json` references exist) and run it in CI.
  Evidence: `scripts/check-build-artifacts.mjs`, `.github/workflows/ci.yml`, `package.json`
- [x] 2026-02-09: Add a one-click “Report incorrect/unsafe answer” action on the result card that stores a local report bundle in extension storage.
  Evidence: `src/constants/template-strings.mjs`, `src/content-script/index.mjs`
- [x] 2026-02-09: Normalize/validate Security Center allowlist + blocklist inputs (accept domains or URLs, canonicalize, dedupe, reject invalid).
  Evidence: `src/utils/security-utils.mjs`, `src/security-center/index.mjs`, `test/utils.test.mjs`
- [x] 2026-02-09: Make allowlist/blocklist matching work for both exact hostnames and root domains; when “Allow”ing from the warning modal, store the root domain.
  Evidence: `src/utils/security-utils.mjs`, `src/content-script/index.mjs`, `test/utils.test.mjs`
- [x] 2026-02-09: Add “Export history” (JSON) to the History UI and “Download” exports for Security Center reports/events.
  Evidence: `src/view-history/index.html`, `src/view-history/index.mjs`, `src/security-center/index.html`, `src/security-center/index.mjs`, `src/css/security-center.css`
- [x] 2026-02-09: Remove stale legacy root-level `content-script.js` to reduce confusion (extension loads from `build/chromium/`).
  Evidence: removed `content-script.js`
- [x] 2026-02-09: Added baseline maintainer documentation and memory/incident tracking.
  Evidence: `AGENTS.md`, `PROJECT_MEMORY.md`, `INCIDENTS.md`, `README.md`
- [x] 2026-02-09: Fixed `npm audit` findings and upgraded build toolchain dependency (`esbuild`) to a non-vulnerable version.
  Evidence: `package.json`, `package-lock.json`
- [x] 2026-02-09: Added history retention controls (TTL days + max items) in popup and pruning on history writes.
  Evidence: `src/utils/history-utils.mjs`, `src/popup/index.html`, `src/popup/index.mjs`, `src/content-script/index.mjs`, `test/utils.test.mjs`, `src/css/popup.css`
- [x] 2026-02-09: Replaced Node-only clipboard handling with a browser-safe copy helper (Clipboard API + execCommand fallback).
  Evidence: `src/utils/clipboard-utils.mjs`, `src/content-script/index.mjs`, `src/new-tab/index.mjs`, `src/chatgpt-script/index.mjs`
- [x] 2026-02-08: Hardened extension-page rendering against injection in history/new-tab/security UI and modal reason rendering.
  Evidence: `src/constants/template-strings.mjs`, `src/new-tab/index.mjs`, `src/security-center/index.mjs`, `src/content-script/index.mjs`, `src/utils/safe-html.mjs`
- [x] 2026-02-08: Fixed history deletion UX to remove only GPT answer records while preserving extension/security settings.
  Evidence: `src/view-history/index.mjs`, `src/utils/history-utils.mjs`, `README.md`
- [x] 2026-02-08: Improved ChatGPT compatibility with domain fallback, credentialed session fetch, and updated unauthorized guidance.
  Evidence: `src/background/index.mjs`, `src/background/fetch-sse.mjs`, `src/content-script/index.mjs`, `src/manifest.json`
- [x] 2026-02-08: Corrected Firefox packaging drift and version mismatch.
  Evidence: `src/manifest.v2.json`
- [x] 2026-02-08: Added unit tests covering cache keying, history normalization/filtering, escaping, tracking cleanup, and risk scoring.
  Evidence: `test/utils.test.mjs`, `src/utils/history-utils.mjs`, `src/utils/security-utils.mjs`
- [x] 2026-02-08: Added CI workflow to run install/lint/test/build on PRs and pushes to main.
  Evidence: `.github/workflows/ci.yml`, `package.json`, `.eslintrc.json`
- [x] 2026-02-08: Reduced noisy background logs, keeping only actionable error paths.
  Evidence: `src/background/index.mjs`
- [x] 2026-02-08: Refreshed README developer and feature docs for new data-retention behavior and local quality checks.
  Evidence: `README.md`

## Insights
- CI signal review (2026-02-11): failed runs `21833444591`, `21833240265`, and `21833232432` all failed in `actions/checkout` with transient GitHub HTTP `500/502` during `git fetch`; no project-code regression was executed in those jobs.
- Market scan (bounded, Feb 2026): leading extensions emphasize source-grounded answers and citation workflows as trust features; GPTx citations mode closes a clear parity gap while keeping default UX simple.
  Sources (untrusted): https://chromewebstore.google.com/detail/chatgpt-sources-citations/acobdliolhcfmmiconpdpipcpjdnphci, https://sider.ai/en/extensions/side-panel
- Market scan (bounded, Feb 2026): mainstream assistants position around multi-engine support and in-page actions (summarize/rewrite/chat), so per-site support controls remain a meaningful near-term backlog item.
  Sources (untrusted): https://chromewebstore.google.com/detail/sider-chatgpt-sidebar-gpt/difoiogjjojoaoomphldepapgpbgkhkb, https://www.gptforchrome.com/, https://www.harpa.ai/
- Code sweep finding: history/export logic must maintain an explicit ignore list for non-history storage keys (including secrets) to avoid data-leak regressions.
- Legacy root-level `content-script.js` was stale and has been removed; build outputs should remain under `build/chromium/`.
- ChatGPT session auth is sensitive to cookie context; `credentials: 'include'` is required for extension fetches that depend on logged-in ChatGPT web sessions.
- History/settings were stored in one local-storage namespace; explicit key filtering is required for safe "clear history" UX.
- Utility extraction (`history-utils`, `security-utils`, `safe-html`) reduces duplicate logic and makes critical behavior testable.
- Market scan (Feb 2026): competing “AI for Google” extensions commonly emphasize multi-site coverage, summarize/page-reading, and model choice; GPTx’s Security Center is a potential differentiator if it stays robust and low-friction.
  Sources (untrusted): https://chromewebstore.google.com/detail/sider-chatgpt-sidebar-%2B-g/difoiogjjojoaoomphldepapgpbgkhkb, https://chromewebstore.google.com/detail/perplexity-ai-search/bnaffjbjpgiagpondjlnneblepbdchol, https://harpa.ai/, https://chromewebstore.google.com/detail/chatgpt-for-google/pjhdflpjemjalkidecigcjcamkbllhoj, https://www.getmerlin.in/en, https://www.techradar.com/pro/security/this-new-malware-campaign-is-stealing-chat-logs-via-chrome-extensions
- Takeaway: using an official API mode (user-provided key) reduces brittleness versus relying on ChatGPT web session endpoints; keeping the extension low-permission and privacy-forward helps differentiate amid growing “malicious extension” reporting.
- Market scan (Feb 2026, bounded): “AI assistant” extensions are increasingly positioning around (1) side-panel + multi-model, (2) in-context “read this page / summarize / translate,” and (3) citations/source extraction workflows for trust.
  Sources (untrusted): https://chromewebstore.google.com/detail/sider-chatgpt-sidebar-gpt/difoiogjjojoaoomphldepapgpbgkhkb, https://sider.ai/en/extensions/side-panel, https://chromewebstore.google.com/detail/chatgpt-sources-citations/acobdliolhcfmmiconpdpipcpjdnphci

## Notes
- This file is maintained by the autonomous clone loop.
