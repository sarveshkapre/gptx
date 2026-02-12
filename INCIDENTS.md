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

### 2026-02-12T20:00:59Z | Codex execution failure
- Date: 2026-02-12T20:00:59Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-2.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:04:26Z | Codex execution failure
- Date: 2026-02-12T20:04:26Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-3.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:07:55Z | Codex execution failure
- Date: 2026-02-12T20:07:55Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-4.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:11:29Z | Codex execution failure
- Date: 2026-02-12T20:11:29Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-5.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:14:54Z | Codex execution failure
- Date: 2026-02-12T20:14:54Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-6.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:18:26Z | Codex execution failure
- Date: 2026-02-12T20:18:26Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-7.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:21:51Z | Codex execution failure
- Date: 2026-02-12T20:21:51Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-8.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:25:20Z | Codex execution failure
- Date: 2026-02-12T20:25:20Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-9.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:28:57Z | Codex execution failure
- Date: 2026-02-12T20:28:57Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-10.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:32:27Z | Codex execution failure
- Date: 2026-02-12T20:32:27Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-11.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:35:54Z | Codex execution failure
- Date: 2026-02-12T20:35:54Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-12.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:39:25Z | Codex execution failure
- Date: 2026-02-12T20:39:25Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-13.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:42:52Z | Codex execution failure
- Date: 2026-02-12T20:42:52Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-14.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:46:26Z | Codex execution failure
- Date: 2026-02-12T20:46:26Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-15.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:49:55Z | Codex execution failure
- Date: 2026-02-12T20:49:55Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-16.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:53:24Z | Codex execution failure
- Date: 2026-02-12T20:53:24Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-17.log
- Commit: pending
- Confidence: medium

### 2026-02-12T20:57:01Z | Codex execution failure
- Date: 2026-02-12T20:57:01Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-18.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:00:29Z | Codex execution failure
- Date: 2026-02-12T21:00:29Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-19.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:03:53Z | Codex execution failure
- Date: 2026-02-12T21:03:53Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-20.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:07:28Z | Codex execution failure
- Date: 2026-02-12T21:07:28Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-21.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:10:57Z | Codex execution failure
- Date: 2026-02-12T21:10:57Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-22.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:14:32Z | Codex execution failure
- Date: 2026-02-12T21:14:32Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-23.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:17:59Z | Codex execution failure
- Date: 2026-02-12T21:17:59Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-24.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:21:23Z | Codex execution failure
- Date: 2026-02-12T21:21:23Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-25.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:24:35Z | Codex execution failure
- Date: 2026-02-12T21:24:35Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-26.log
- Commit: pending
- Confidence: medium

### 2026-02-12T21:27:53Z | Codex execution failure
- Date: 2026-02-12T21:27:53Z
- Trigger: Codex execution failure
- Impact: Repo session did not complete cleanly
- Root Cause: codex exec returned a non-zero status
- Fix: Captured failure logs and kept repository in a recoverable state
- Prevention Rule: Re-run with same pass context and inspect pass log before retrying
- Evidence: pass_log=logs/20260212-101456-gptx-cycle-27.log
- Commit: pending
- Confidence: medium
