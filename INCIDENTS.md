# Incidents

This file tracks notable failures/regressions, root causes, and prevention rules.

## Template

### YYYY-MM-DD: Title
- Impact:
- Detection:
- Root cause:
- Fix:
- Prevention:
- Evidence (commands/logs/tests):
- Related commits/refs:

## Incidents
### 2026-02-11: History View Could Leak Stored OpenAI Key
- Impact: `gptxOpenAIApiKey`/`gptxOpenAIModel`/`gptxAnswerReports` were not excluded from history filtering and could appear in history/export flows.
- Detection: code-review sweep during cycle 1 while implementing citations/cache features.
- Root cause: `DEFAULT_HISTORY_IGNORE_KEYS` did not include newly added non-history storage keys.
- Fix: add missing keys to ignore set and test with mixed storage data.
- Prevention: require test coverage whenever introducing new `storage.local` keys; classify them as history vs non-history in the same change.
- Evidence (commands/logs/tests): `npm run lint`, `npm test` (including updated history filter tests), `npm run build`, `npm run check:build`, `GPTX_E2E=1 npm run test:e2e`.
- Related commits/refs: `66ca85e`
