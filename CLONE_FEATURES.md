# Clone Feature Tracker

## Context Sources
- README and docs
- TODO/FIXME markers in code
- Test and build failures
- Gaps found during codebase exploration

## Candidate Features To Do
- [ ] P0: Add data retention controls for GPT answer history (TTL + max entry count, configurable in popup and enforced on write).
- [ ] P0: Remove `clipboardy` from browser code paths; replace with a safe `navigator.clipboard` + fallback copy helper to avoid runtime breakage and shrink bundle size.
- [ ] P1: Add an end-to-end extension smoke test (Playwright + Chromium extension loading) to validate popup/history/security pages against real DOM behavior.
- [ ] P1: Migrate ChatGPT integration away from legacy webapp backend endpoints to an officially supported OpenAI API flow with user-provided API key.
- [ ] P1: Add baseline maintainer docs: `AGENTS.md`, `PROJECT_MEMORY.md`, `INCIDENTS.md` (minimal structure, then keep updated per cycle).
- [ ] P2: Normalize/validate allowlist + blocklist entries (domain canonicalization) and prevent obviously invalid entries from being saved.
- [ ] P2: Remove or quarantine legacy root-level `content-script.js` to reduce confusion (build outputs already live in `build/`).
- [ ] P3: Add a lightweight “export GPTx history” action in history UI (JSON/NDJSON) for power users and debugging.

## Implemented
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
- Legacy root-level `content-script.js` is stale and fails lint; lint scope should stay focused on maintained source (`src/`) to avoid false failures.
- ChatGPT session auth is sensitive to cookie context; `credentials: 'include'` is required for extension fetches that depend on logged-in ChatGPT web sessions.
- History/settings were stored in one local-storage namespace; explicit key filtering is required for safe "clear history" UX.
- Utility extraction (`history-utils`, `security-utils`, `safe-html`) reduces duplicate logic and makes critical behavior testable.
- Market scan (Feb 2026): top competing “AI for Google” extensions commonly offer multi-site coverage, user-provided API keys, and strong UX around summaries/citations; GPTx’s Security Center is a potential differentiator if it stays robust and low-friction.

## Notes
- This file is maintained by the autonomous clone loop.
