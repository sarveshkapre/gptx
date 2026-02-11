import { getViewHistoryIcon } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'
import { DEFAULT_HISTORY_RETENTION, normalizeHistoryRetention } from '../utils/history-utils.mjs'

main()

const DEFAULT_PREFERENCES = {
  mode: 'summary',
  format: 'bullets',
  citations: 'off',
}

const DEFAULT_OPENAI_SETTINGS = {
  model: 'gpt-4.1',
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

async function loadOpenAISettings() {
  const stored = await Browser.storage.local.get(['gptxOpenAIApiKey', 'gptxOpenAIModel'])
  const model = (stored.gptxOpenAIModel || DEFAULT_OPENAI_SETTINGS.model).trim()
  if (!stored.gptxOpenAIModel) {
    await Browser.storage.local.set({ gptxOpenAIModel: model })
  }
  return {
    apiKey: stored.gptxOpenAIApiKey || null,
    model,
  }
}

async function saveOpenAIModel(model) {
  await Browser.storage.local.set({
    gptxOpenAIModel: model,
  })
}

async function saveOpenAIApiKey(apiKey) {
  await Browser.storage.local.set({
    gptxOpenAIApiKey: apiKey,
  })
}

async function clearOpenAIApiKey() {
  await Browser.storage.local.remove('gptxOpenAIApiKey')
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
        })
    } else {
      // Disable the extension
      Browser.storage.local
        .set({
          gptxExtensionEnabled: false,
        })
        .then(() => {
          gptxExtensionStatusCheckLabel.innerHTML = 'Unpause GPTx'
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
  const citationsSelect = document.getElementById('gptx-default-citations')
  modeSelect.value = preferences.mode
  formatSelect.value = preferences.format
  if (citationsSelect) citationsSelect.value = preferences.citations || 'off'

  modeSelect.addEventListener('change', async () => {
    preferences.mode = modeSelect.value
    await savePreferences(preferences)
  })

  formatSelect.addEventListener('change', async () => {
    preferences.format = formatSelect.value
    await savePreferences(preferences)
  })

  if (citationsSelect) {
    citationsSelect.addEventListener('change', async () => {
      preferences.citations = citationsSelect.value === 'on' ? 'on' : 'off'
      await savePreferences(preferences)
    })
  }

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

  // OpenAI API settings
  const openai = await loadOpenAISettings()
  const openaiModelInput = document.getElementById('gptx-openai-model')
  const openaiKeyInput = document.getElementById('gptx-openai-api-key')
  const openaiSaveBtn = document.getElementById('gptx-openai-save')
  const openaiClearBtn = document.getElementById('gptx-openai-clear')
  const openaiStatus = document.getElementById('gptx-openai-status')
  let hasApiKey = Boolean(openai.apiKey)

  if (openaiModelInput) {
    openaiModelInput.value = openai.model
  }

  function setOpenAIStatus(text, variant = 'neutral') {
    if (!openaiStatus) return
    openaiStatus.textContent = text
    openaiStatus.classList.toggle('is-error', variant === 'error')
    openaiStatus.classList.toggle('is-ok', variant === 'ok')
  }

  function validateModel(raw) {
    const model = String(raw || '').trim()
    if (!model) return { ok: false, message: 'Model required' }
    if (model.length > 128) return { ok: false, message: 'Model too long' }
    if (/\s/.test(model)) return { ok: false, message: 'No spaces in model' }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(model)) {
      return { ok: false, message: 'Invalid model' }
    }
    return { ok: true, value: model }
  }

  function validateApiKey(raw) {
    const apiKey = String(raw || '').trim()
    if (!apiKey) return { ok: false, message: 'Enter key' }
    if (/\s/.test(apiKey)) return { ok: false, message: 'No spaces in key' }
    if (!apiKey.startsWith('sk-')) return { ok: false, message: 'Expected sk-...' }
    if (apiKey.length < 20) return { ok: false, message: 'Key too short' }
    return { ok: true, value: apiKey }
  }

  function setInvalid(el, invalid) {
    if (!el) return
    el.classList.toggle('is-invalid', Boolean(invalid))
  }

  const initialModelValidation = validateModel(openai.model)
  if (openaiModelInput) setInvalid(openaiModelInput, !initialModelValidation.ok)

  setOpenAIStatus(hasApiKey ? 'Key set' : 'Not set', hasApiKey ? 'ok' : 'neutral')

  if (openaiSaveBtn && openaiKeyInput) {
    openaiSaveBtn.addEventListener('click', async () => {
      const apiKey = String(openaiKeyInput.value || '')
      const validation = validateApiKey(apiKey)
      setInvalid(openaiKeyInput, !validation.ok)
      if (!validation.ok) {
        setOpenAIStatus(validation.message, 'error')
        return
      }
      await saveOpenAIApiKey(validation.value)
      hasApiKey = true
      openaiKeyInput.value = ''
      setInvalid(openaiKeyInput, false)
      setOpenAIStatus('Saved', 'ok')
    })
  }

  if (openaiClearBtn) {
    openaiClearBtn.addEventListener('click', async () => {
      await clearOpenAIApiKey()
      hasApiKey = false
      if (openaiKeyInput) openaiKeyInput.value = ''
      if (openaiKeyInput) setInvalid(openaiKeyInput, false)
      setOpenAIStatus('Cleared', 'neutral')
    })
  }

  if (openaiModelInput) {
    openaiModelInput.addEventListener('input', () => {
      // Live feedback only; persistence happens on change when valid.
      const validation = validateModel(openaiModelInput.value)
      setInvalid(openaiModelInput, !validation.ok)
      if (!validation.ok) return
      // Avoid flipping status to "ok" while the user is typing a key.
    })
    openaiModelInput.addEventListener('change', async () => {
      const validation = validateModel(openaiModelInput.value)
      setInvalid(openaiModelInput, !validation.ok)
      if (!validation.ok) {
        setOpenAIStatus(validation.message, 'error')
        return
      }
      await saveOpenAIModel(validation.value)
      openaiModelInput.value = validation.value
      setOpenAIStatus(hasApiKey ? 'Key set' : 'Not set', hasApiKey ? 'ok' : 'neutral')
    })
  }
}
