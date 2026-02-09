import { getViewHistoryIcon } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'
import { DEFAULT_HISTORY_RETENTION, normalizeHistoryRetention } from '../utils/history-utils.mjs'

main()

const DEFAULT_PREFERENCES = {
  mode: 'summary',
  format: 'bullets',
}

async function loadHistoryRetention() {
  const stored = await Browser.storage.local.get('gptxHistoryRetention')
  const retention = {
    ...DEFAULT_HISTORY_RETENTION,
    ...normalizeHistoryRetention(stored.gptxHistoryRetention || {}),
  }
  if (!stored.gptxHistoryRetention) {
    await Browser.storage.local.set({ gptxHistoryRetention: retention })
  }
  return retention
}

async function saveHistoryRetention(retention) {
  await Browser.storage.local.set({
    gptxHistoryRetention: retention,
  })
}

async function loadPreferences() {
  const stored = await Browser.storage.local.get('gptxPreferences')
  return {
    ...DEFAULT_PREFERENCES,
    ...(stored.gptxPreferences || {}),
  }
}

async function savePreferences(preferences) {
  await Browser.storage.local.set({
    gptxPreferences: preferences,
  })
}

async function main() {
  // get extension enabled value from local storage to mark checkbox initially
  let isEnabledObj = await Browser.storage.local.get('gptxExtensionEnabled')
  let isEnabled
  if (Object.keys(isEnabledObj).length === 0) {
    // first time, enabled key is not set in local storage. So enabling extension by default
    await Browser.storage.local.set({
      gptxExtensionEnabled: true,
    })
    isEnabled = true
  } else {
    isEnabled = isEnabledObj.gptxExtensionEnabled
  }

  // set colors to footer icons based on dark/light mode
  let footerBtnsIconSvgColor
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // add border color for dark mode
    footerBtnsIconSvgColor = '#dadce0'
  } else {
    // add border color for light mode
    footerBtnsIconSvgColor = '#373b3e'
  }
  // setting UI and event listener for View History Button
  const gptxViewHistoryBtn = document.getElementById('gptx-view-history')
  gptxViewHistoryBtn.innerHTML = getViewHistoryIcon('1.6em', '1.6em', footerBtnsIconSvgColor)
  gptxViewHistoryBtn.addEventListener('click', () => {
    Browser.tabs.create({
      url: 'view-history.html',
    })
  })
  const gptxSecurityCenterBtn = document.getElementById('gptx-open-security-center')
  gptxSecurityCenterBtn.addEventListener('click', () => {
    Browser.tabs.create({
      url: 'security-center.html',
    })
  })

  // setting previous extension enabled value and event listener for enable extension switch
  const gptxExtensionStatusCheck = document.getElementById('gptx-enable-extension-switch')
  gptxExtensionStatusCheck.checked = isEnabled
  const gptxExtensionStatusCheckLabel = document.getElementById('gptx-enable-extension-label')
  gptxExtensionStatusCheckLabel.innerHTML = isEnabled ? 'Pause GPTx' : 'Unpause GPTx'
  gptxExtensionStatusCheck.addEventListener('change', function () {
    if (this.checked) {
      // Enable the extension
      Browser.storage.local
        .set({
          gptxExtensionEnabled: true,
        })
        .then(() => {
          gptxExtensionStatusCheckLabel.innerHTML = 'Pause GPTx'
          console.log('gptx extension enabled')
        })
    } else {
      // Disable the extension
      Browser.storage.local
        .set({
          gptxExtensionEnabled: false,
        })
        .then(() => {
          gptxExtensionStatusCheckLabel.innerHTML = 'Unpause GPTx'
          console.log('gptx extension disabled')
        })
    }
  })

  // security toggle
  let securityEnabledObj = await Browser.storage.local.get('gptxSecurityEnabled')
  let securityEnabled
  if (securityEnabledObj.gptxSecurityEnabled === undefined) {
    await Browser.storage.local.set({
      gptxSecurityEnabled: true,
    })
    securityEnabled = true
  } else {
    securityEnabled = securityEnabledObj.gptxSecurityEnabled
  }
  const gptxSecurityCheck = document.getElementById('gptx-security-switch')
  const gptxSecurityLabel = document.getElementById('gptx-security-label')
  gptxSecurityCheck.checked = securityEnabled
  gptxSecurityLabel.innerHTML = securityEnabled ? 'Security on' : 'Security off'
  gptxSecurityCheck.addEventListener('change', function () {
    Browser.storage.local
      .set({
        gptxSecurityEnabled: this.checked,
      })
      .then(() => {
        gptxSecurityLabel.innerHTML = this.checked ? 'Security on' : 'Security off'
      })
  })

  // set default preferences
  const preferences = await loadPreferences()
  const modeSelect = document.getElementById('gptx-default-mode')
  const formatSelect = document.getElementById('gptx-default-format')
  modeSelect.value = preferences.mode
  formatSelect.value = preferences.format

  modeSelect.addEventListener('change', async () => {
    preferences.mode = modeSelect.value
    await savePreferences(preferences)
  })

  formatSelect.addEventListener('change', async () => {
    preferences.format = formatSelect.value
    await savePreferences(preferences)
  })

  const retention = await loadHistoryRetention()
  const ttlInput = document.getElementById('gptx-history-ttl-days')
  const maxInput = document.getElementById('gptx-history-max-entries')
  ttlInput.value = String(retention.ttlDays ?? 0)
  maxInput.value = String(retention.maxEntries ?? 0)

  ttlInput.addEventListener('change', async () => {
    retention.ttlDays = Number(ttlInput.value || 0)
    await saveHistoryRetention(normalizeHistoryRetention(retention))
  })

  maxInput.addEventListener('change', async () => {
    retention.maxEntries = Number(maxInput.value || 0)
    await saveHistoryRetention(normalizeHistoryRetention(retention))
  })
}
