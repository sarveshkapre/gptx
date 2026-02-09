import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { chromium } from 'playwright'

const SHOULD_RUN = process.env.GPTX_E2E === '1'

test(
  'e2e smoke: extension pages load (popup/history/security)',
  { skip: !SHOULD_RUN, timeout: 90_000 },
  async () => {
    const extensionPath = path.resolve('build/chromium')
    await fs.access(path.join(extensionPath, 'manifest.json'))

    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gptx-e2e-'))
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // extensions are most reliable in headed mode (use xvfb in CI)
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
      ],
    })

    try {
      // MV3: service worker URL includes the generated extension ID.
      let serviceWorker = context.serviceWorkers()[0]
      if (!serviceWorker) {
        serviceWorker = await context.waitForEvent('serviceworker')
      }
      const extensionId = new URL(serviceWorker.url()).host
      assert.ok(extensionId, 'expected an extension id derived from service worker url')

      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (err) => errors.push(String(err && err.message ? err.message : err)))

      await page.goto(`chrome-extension://${extensionId}/popup.html`)
      await page.waitForSelector('#gptx-popup-card-header-text', { state: 'visible' })
      // The checkbox input is intentionally visually hidden; assert it exists instead of "visible".
      await page.waitForSelector('#gptx-enable-extension-switch', { state: 'attached' })
      await page.waitForSelector('#gptx-default-mode', { state: 'attached' })
      await page.waitForSelector('#gptx-open-security-center', { state: 'visible' })

      await page.goto(`chrome-extension://${extensionId}/view-history.html`)
      await page.waitForSelector('#gptx-export-history', { state: 'visible' })

      await page.goto(`chrome-extension://${extensionId}/security-center.html`)
      await page.waitForSelector('#gptx-sec-save', { state: 'visible' })
      await page.waitForSelector('#gptx-sec-download-reports', { state: 'visible' })

      assert.deepEqual(errors, [], `unexpected page errors: ${errors.join('; ')}`)
    } finally {
      await context.close()
      await fs.rm(userDataDir, { recursive: true, force: true })
    }
  },
)
