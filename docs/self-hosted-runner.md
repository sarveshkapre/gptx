# Self-Hosted GitHub Actions Runner Setup

This repository's CI workflow is configured for `runs-on: self-hosted`.

## Runner Host Requirements

- OS: Linux (recommended: Ubuntu 22.04+) or macOS 13+.
- Tools: `bash`, `git`, `curl`, `tar`, `unzip`.
- Display tools for headed Playwright:
  - Linux: `xvfb` (`xvfb-run` must be available).
  - macOS: no `xvfb` needed, but the runner must have access to a GUI session.
- Node.js: 20.x (matches CI).
- Docker: not required by this workflow.

One-time Ubuntu package bootstrap:

```bash
sudo apt-get update
sudo apt-get install -y git curl unzip xvfb
```

One-time macOS bootstrap (Homebrew):

```bash
brew install git curl
```

## Register Runner (Repository Scope)

1. Open GitHub: repository `Settings` -> `Actions` -> `Runners`.
2. Click `New self-hosted runner`.
3. Select Linux/macOS and architecture matching your host.
4. Run the exact download/config commands shown by GitHub on the runner machine.
5. During config, keep default labels (`self-hosted`, `linux`, `x64`/`arm64`) and add an optional custom label like `gptx`.
6. Install and start the runner service (commands are shown by GitHub UI):
   - `sudo ./svc.sh install`
   - `sudo ./svc.sh start`
7. Confirm runner status is `Idle` in repository runners list.

## Playwright/Browser Dependencies

CI installs Chromium at runtime with:

```bash
npx playwright install chromium
```

System libraries are host-managed on self-hosted runners. If Playwright reports missing Linux libs, install them once on the host:

```bash
sudo npx playwright install-deps chromium
```

## Local End-to-End CI Validation (Same Machine as Runner)

From repository root:

```bash
npm ci
npm run lint
npm test
npm run build
npm run check:build
npx playwright install chromium
xvfb-run -a env GPTX_E2E=1 node --test test/extension-smoke.test.mjs
```

If all commands pass, the self-hosted runner has the prerequisites needed by CI.

For macOS local validation, run:

```bash
npm ci
npm run lint
npm test
npm run build
npm run check:build
npx playwright install chromium
env GPTX_E2E=1 node --test test/extension-smoke.test.mjs
```
