# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] P1: Add an end-to-end extension smoke test (Playwright + Chromium extension loading) to validate popup/history/security pages against real DOM behavior.
- [ ] P2: Throttle streaming UI updates (markdown render) to reduce jank and reflow while still feeling realtime.
- [ ] P2: Add optional “Citations” mode (user can ask for sources; render as links) while keeping defaults simple.
- [ ] P3: Add per-site enable/disable toggle (Google-only by default) with a small allowlist of supported search engines.
- [ ] P3: Add a “Clear cache for this query” control (delete cached answer entry only) without touching global settings or all-history.
- [ ] P3: Add a “Copy as Markdown” action alongside “Copy” to preserve formatting.

## Implemented
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
- Legacy root-level `content-script.js` was stale and has been removed; build outputs should remain under `build/chromium/`.
- ChatGPT session auth is sensitive to cookie context; `credentials: 'include'` is required for extension fetches that depend on logged-in ChatGPT web sessions.
- History/settings were stored in one local-storage namespace; explicit key filtering is required for safe "clear history" UX.
- Utility extraction (`history-utils`, `security-utils`, `safe-html`) reduces duplicate logic and makes critical behavior testable.
- Market scan (Feb 2026): competing “AI for Google” extensions commonly emphasize multi-site coverage, summarize/page-reading, and model choice; GPTx’s Security Center is a potential differentiator if it stays robust and low-friction.
  Sources (untrusted): https://chromewebstore.google.com/detail/sider-chatgpt-sidebar-%2B-g/difoiogjjojoaoomphldepapgpbgkhkb, https://chromewebstore.google.com/detail/perplexity-ai-search/bnaffjbjpgiagpondjlnneblepbdchol, https://harpa.ai/, https://chromewebstore.google.com/detail/chatgpt-for-google/pjhdflpjemjalkidecigcjcamkbllhoj, https://www.getmerlin.in/en, https://www.techradar.com/pro/security/this-new-malware-campaign-is-stealing-chat-logs-via-chrome-extensions
- Takeaway: using an official API mode (user-provided key) reduces brittleness versus relying on ChatGPT web session endpoints; keeping the extension low-permission and privacy-forward helps differentiate amid growing “malicious extension” reporting.

## Notes
- This file is maintained by the autonomous clone loop.
