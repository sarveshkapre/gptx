import {
  getResultCardTemplate,
  getApprovedCheckIconSvg,
  getCopyIconSvg,
} from '../constants/template-strings.mjs'
import {
  buildCacheKey,
  DEFAULT_HISTORY_RETENTION,
  getHistoryKeysToPrune,
  normalizeEntry,
  normalizeHistoryRetention,
} from '../utils/history-utils.mjs'
import {
  applyUrlSafety,
  assessDomainRisk,
  getRootDomain,
  getRiskLevel,
  getTrackingParams,
  isSensitiveUrl,
  normalizeDomain,
  normalizeDomainList,
} from '../utils/security-utils.mjs'
import { copyText } from '../utils/clipboard-utils.mjs'
import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'

const DEFAULT_PREFERENCES = {
  mode: 'summary',
  format: 'bullets',
  citations: 'off',
}

const DEFAULT_SECURITY_SETTINGS = {
  warnOnRisky: true,
  blockOnHighRisk: false,
  stripTracking: true,
  upgradeHttps: true,
  hideAds: true,
  showBadges: true,
  sensitiveAlerts: true,
}

const DEFAULT_SECURITY = {
  enabled: true,
  allowlist: [],
  blocklist: [],
  settings: DEFAULT_SECURITY_SETTINGS,
}

const MODE_CONFIG = {
  summary: {
    label: 'Summary',
    instruction: 'Provide a concise, high-signal answer in 6 bullets or fewer.',
  },
  balanced: {
    label: 'Balanced',
    instruction: 'Provide a balanced answer with key points and brief explanations.',
  },
  deep: {
    label: 'Deep',
    instruction:
      'Provide a thorough, structured answer with nuance, trade-offs, and clear sections.',
  },
}

const FORMAT_CONFIG = {
  bullets: {
    label: 'Bullets',
    instruction: 'Format the response using bullet points.',
  },
  steps: {
    label: 'Steps',
    instruction: 'Format the response as numbered steps.',
  },
  table: {
    label: 'Table',
    instruction: 'Use a table when helpful; otherwise use bullets.',
  },
}

const CITATION_CONFIG = {
  off: {
    label: 'Off',
    instruction: '',
  },
  on: {
    label: 'On',
    instruction:
      'When making factual claims, include a final "Sources" section with markdown links from the provided search sources.',
  },
}

const searchInput = document.getElementsByName('q')[0]
if (searchInput && searchInput.value) {
  const startParam = new URL(location.href).searchParams.get('start') || '0'
  if (startParam === '0') {
    run(searchInput.value)
  }
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

async function storeHistoryEntry(storageKey, entry) {
  await Browser.storage.local.set({
    [storageKey]: entry,
  })
  const retention = await loadHistoryRetention()
  if (!retention.ttlDays && !retention.maxEntries) return
  const allData = await Browser.storage.local.get(null)
  const keysToRemove = getHistoryKeysToPrune(allData, retention)
  if (keysToRemove.length) {
    await Browser.storage.local.remove(keysToRemove)
  }
}

async function loadSecuritySettings() {
  const stored = await Browser.storage.local.get([
    'gptxSecurityEnabled',
    'gptxSecurityAllowlist',
    'gptxSecurityBlocklist',
    'gptxSecuritySettings',
  ])
  const enabled =
    stored.gptxSecurityEnabled === undefined ? DEFAULT_SECURITY.enabled : stored.gptxSecurityEnabled
  const allowlistRaw = stored.gptxSecurityAllowlist || DEFAULT_SECURITY.allowlist
  const blocklistRaw = stored.gptxSecurityBlocklist || DEFAULT_SECURITY.blocklist
  const allowlist = normalizeDomainList(allowlistRaw).domains
  const blocklist = normalizeDomainList(blocklistRaw).domains
  const settings = {
    ...DEFAULT_SECURITY_SETTINGS,
    ...(stored.gptxSecuritySettings || {}),
  }
  if (stored.gptxSecurityEnabled === undefined) {
    await Browser.storage.local.set({ gptxSecurityEnabled: enabled })
  }
  if (!stored.gptxSecurityAllowlist) {
    await Browser.storage.local.set({ gptxSecurityAllowlist: allowlist })
  } else if (JSON.stringify(allowlistRaw) !== JSON.stringify(allowlist)) {
    await Browser.storage.local.set({ gptxSecurityAllowlist: allowlist })
  }
  if (!stored.gptxSecurityBlocklist) {
    await Browser.storage.local.set({ gptxSecurityBlocklist: blocklist })
  } else if (JSON.stringify(blocklistRaw) !== JSON.stringify(blocklist)) {
    await Browser.storage.local.set({ gptxSecurityBlocklist: blocklist })
  }
  if (!stored.gptxSecuritySettings) {
    await Browser.storage.local.set({ gptxSecuritySettings: settings })
  }
  return { ...DEFAULT_SECURITY, enabled, allowlist, blocklist, settings }
}

async function saveSecurityAllowlist(allowlist) {
  await Browser.storage.local.set({
    gptxSecurityAllowlist: allowlist,
  })
}

function buildPrompt({ question, preferences, followUp, priorAnswer, sources = [] }) {
  const modeInstruction = MODE_CONFIG[preferences.mode]?.instruction || ''
  const formatInstruction = FORMAT_CONFIG[preferences.format]?.instruction || ''
  const citationsInstruction = CITATION_CONFIG[preferences.citations]?.instruction || ''
  const sourceBlock =
    preferences.citations === 'on' && sources.length
      ? `
Search sources (use only these URLs in citations):
${sources.map((source, index) => `${index + 1}. ${source.title} - ${source.url}`).join('\n')}
      `.trim()
      : ''
  if (followUp) {
    return `
You are a helpful research assistant.
${modeInstruction}
${formatInstruction}
${citationsInstruction}
${sourceBlock}

Original question: ${question}
Previous answer: ${priorAnswer || 'N/A'}
Follow-up: ${followUp}
    `.trim()
  }
  return `
You are a helpful research assistant.
${modeInstruction}
${formatInstruction}
${citationsInstruction}
${sourceBlock}

Question: ${question}
  `.trim()
}

function extractTargetUrl(href) {
  if (!href) return null
  try {
    const url = new URL(href, window.location.origin)
    if (url.hostname.includes('google.') && url.pathname === '/url') {
      return url.searchParams.get('q') || url.searchParams.get('url')
    }
    return url.href
  } catch {
    return null
  }
}

function getSearchResultLinks() {
  const links = []
  document.querySelectorAll('a h3').forEach((heading) => {
    const anchor = heading.closest('a')
    if (!anchor) return
    const targetUrl = extractTargetUrl(anchor.getAttribute('href'))
    if (!targetUrl || !targetUrl.startsWith('http')) return
    try {
      const parsed = new URL(targetUrl)
      links.push({
        anchor,
        heading,
        url: targetUrl,
        hostname: parsed.hostname,
      })
    } catch {
      return
    }
  })
  return links
}

function normalizePromptSourceText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .trim()
}

function buildPromptSources(resultLinks, maxItems = 8) {
  const seen = new Set()
  return resultLinks
    .map((item) => {
      const title = normalizePromptSourceText(item.heading?.textContent || item.hostname || 'Source')
      const url = normalizePromptSourceText(item.url)
      return { title, url }
    })
    .filter((item) => {
      if (!item.url || seen.has(item.url)) return false
      seen.add(item.url)
      return true
    })
    .slice(0, maxItems)
}

function hideGoogleAds() {
  const selectors = [
    '#tads',
    '#tadsb',
    '#taw',
    '.uEierd',
    '.commercial-unit-desktop-top',
    '.commercial-unit-desktop-rhs',
    '[data-text-ad]',
  ]
  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.style.display = 'none'
    })
  })
}

function createBadge(text, className) {
  const badge = document.createElement('span')
  badge.className = `gptx-security-badge ${className}`
  badge.textContent = text
  return badge
}

function ensureModal() {
  let modal = document.getElementById('gptx-security-modal')
  if (modal) return modal
  modal = document.createElement('div')
  modal.id = 'gptx-security-modal'
  modal.className = 'gptx-security-modal'
  modal.innerHTML = `
    <div class="gptx-security-modal-backdrop"></div>
    <div class="gptx-security-modal-card">
      <div class="gptx-security-modal-title">Potential phishing risk</div>
      <div class="gptx-security-modal-subtitle"></div>
      <div class="gptx-security-modal-url"></div>
      <ul class="gptx-security-modal-reasons"></ul>
      <div class="gptx-security-modal-actions">
        <button class="gptx-security-btn" id="gptx-security-cancel">Cancel</button>
        <button class="gptx-security-btn" id="gptx-security-report">Report</button>
        <button class="gptx-security-btn danger" id="gptx-security-allow">Always allow</button>
        <button class="gptx-security-btn primary" id="gptx-security-continue">Continue</button>
      </div>
    </div>
  `
  document.body.appendChild(modal)
  return modal
}

async function storeSecurityReport(report) {
  const stored = await Browser.storage.local.get('gptxSecurityReports')
  const reports = stored.gptxSecurityReports || []
  reports.unshift(report)
  await Browser.storage.local.set({
    gptxSecurityReports: reports.slice(0, 100),
  })
}

async function storeSecurityEvent(event) {
  const stored = await Browser.storage.local.get('gptxSecurityEvents')
  const events = stored.gptxSecurityEvents || []
  events.unshift(event)
  await Browser.storage.local.set({
    gptxSecurityEvents: events.slice(0, 200),
  })
}

async function storeAnswerReport(report) {
  const stored = await Browser.storage.local.get('gptxAnswerReports')
  const reports = stored.gptxAnswerReports || []
  reports.unshift(report)
  await Browser.storage.local.set({
    gptxAnswerReports: reports.slice(0, 100),
  })
}

async function run(baseQuestion) {
  const isEnabledObj = await Browser.storage.local.get('gptxExtensionEnabled')
  let gptxExtensionEnabled = isEnabledObj.gptxExtensionEnabled
  if (gptxExtensionEnabled === undefined) {
    await Browser.storage.local.set({
      gptxExtensionEnabled: true,
    })
    gptxExtensionEnabled = true
  }
  if (!gptxExtensionEnabled) {
    return
  }

  const parentNode = document.getElementById('cnt')
  const marginLeft = window
    .getComputedStyle(document.getElementById('center_col'), null)
    .getPropertyValue('margin-left')
  const newNode = document.createElement('div')
  newNode.classList.add('gptx-card')

  let footerBtnsIconSvgColor
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    footerBtnsIconSvgColor = '#dadce0'
  } else {
    footerBtnsIconSvgColor = '#373b3e'
  }
  newNode.innerHTML = getResultCardTemplate(footerBtnsIconSvgColor)

  const referenceNode = document.getElementById('rcnt')
  const maxWidth = window.getComputedStyle(referenceNode, null).getPropertyValue('max-width')

  newNode.style['margin-left'] = marginLeft
  newNode.style['max-width'] = maxWidth

  parentNode.insertBefore(newNode, referenceNode)

  const gptxLoadingParaElem = document.getElementById('gptx-loading-para')
  const gptxTimeParaElem = document.getElementById('gptx-time-para')
  const gptxResponseBodyElem = document.getElementById('gptx-response-body')
  const gptxQuestionElem = document.getElementById('gptx-question')
  const gptxSecurityBannerElem = document.getElementById('gptx-security-banner')
  const gptxFooterRefreshBtn = document.getElementById('gptx-footer-refresh-btn')
  const gptxFooterStopBtn = document.getElementById('gptx-footer-stop-btn')
  const gptxFooterClearCacheBtn = document.getElementById('gptx-footer-clear-cache-btn')
  const gptxFooterCopyBtn = document.getElementById('gptx-footer-copy-btn')
  const gptxFooterCopyMdBtn = document.getElementById('gptx-footer-copy-md-btn')
  const gptxFooterNewTabBtn = document.getElementById('gptx-footer-new-tab-btn')
  const gptxFooterReportBtn = document.getElementById('gptx-footer-report-btn')
  const gptxFollowupInput = document.getElementById('gptx-followup-input')
  const gptxFollowupBtn = document.getElementById('gptx-followup-btn')
  const securityCenterUrl = Browser.runtime.getURL('security-center.html')

  let preferences = await loadPreferences()
  preferences.citations = preferences.citations === 'on' ? 'on' : 'off'
  let securitySettings = await loadSecuritySettings()
  const { enabled: securityEnabled, allowlist, blocklist, settings } = securitySettings
  let activeRequest = null
  let previousResponse = ''
  const riskMap = new WeakMap()
  const searchResultLinks = getSearchResultLinks()
  const promptSources = buildPromptSources(searchResultLinks)
  let isGenerating = false

  let port = null
  let portDisconnectWasUserCancel = false

  const markdown = new MarkdownIt()
  const STREAM_RENDER_INTERVAL_MS = 90
  let renderTimer = null
  let lastRenderAt = 0
  let pendingRenderText = ''
  let pendingRenderStartTime = 0

  function setStatus(text) {
    gptxLoadingParaElem.textContent = text
  }

  function setQuestion(text) {
    gptxQuestionElem.textContent = text
  }

  function setButtonsDisabled(disabled) {
    if (disabled) {
      gptxFooterRefreshBtn.classList.add('gptx-disable-btn')
      if (gptxFooterClearCacheBtn) gptxFooterClearCacheBtn.classList.add('gptx-disable-btn')
      gptxFooterCopyBtn.classList.add('gptx-disable-btn')
      if (gptxFooterCopyMdBtn) gptxFooterCopyMdBtn.classList.add('gptx-disable-btn')
      gptxFooterNewTabBtn.classList.add('gptx-disable-btn')
      if (gptxFooterReportBtn) gptxFooterReportBtn.classList.add('gptx-disable-btn')
    } else {
      gptxFooterRefreshBtn.classList.remove('gptx-disable-btn')
      if (gptxFooterClearCacheBtn) gptxFooterClearCacheBtn.classList.remove('gptx-disable-btn')
      gptxFooterCopyBtn.classList.remove('gptx-disable-btn')
      if (gptxFooterCopyMdBtn) gptxFooterCopyMdBtn.classList.remove('gptx-disable-btn')
      gptxFooterNewTabBtn.classList.remove('gptx-disable-btn')
      if (gptxFooterReportBtn) gptxFooterReportBtn.classList.remove('gptx-disable-btn')
    }
  }

  function setStopVisible(visible) {
    if (!gptxFooterStopBtn) return
    gptxFooterStopBtn.classList.toggle('is-hidden', !visible)
  }

  function setFollowupDisabled(disabled) {
    gptxFollowupInput.disabled = disabled
    gptxFollowupBtn.disabled = disabled
  }

  function showPlaceholder(message, isError = false) {
    gptxResponseBodyElem.innerHTML = `<div class="gptx-response-placeholder${
      isError ? ' is-error' : ''
    }">${message}</div>`
  }

  function endGenerationUI({ status, placeholder = null, isError = false, html = null }) {
    isGenerating = false
    setStopVisible(false)
    setButtonsDisabled(false)
    setFollowupDisabled(false)
    setStatus(status)

    if (html) {
      gptxResponseBodyElem.innerHTML = html
      return
    }
    if (placeholder) {
      showPlaceholder(placeholder, isError)
    }
  }

  function isInteractiveField(element) {
    if (!element) return false
    if (element instanceof HTMLInputElement) return true
    if (element instanceof HTMLTextAreaElement) return true
    if (element instanceof HTMLSelectElement) return true
    if (element instanceof HTMLElement && element.isContentEditable) return true
    return false
  }

  function setSecurityBanner(message, variant = 'info', withLink = false) {
    if (!gptxSecurityBannerElem) return
    if (!message) {
      gptxSecurityBannerElem.className = 'gptx-security-banner'
      gptxSecurityBannerElem.textContent = ''
      return
    }
    if (withLink) {
      gptxSecurityBannerElem.innerHTML = `${message} <button class="gptx-security-link" id="gptx-security-center-link">Security center</button>`
      const link = gptxSecurityBannerElem.querySelector('#gptx-security-center-link')
      if (link) {
        link.addEventListener('click', () => {
          window.open(securityCenterUrl, '_blank')
        })
      }
    } else {
      gptxSecurityBannerElem.textContent = message
    }
    gptxSecurityBannerElem.className = `gptx-security-banner is-visible is-${variant}`
  }

  function applyPreferencesToUI() {
    document.querySelectorAll('[data-gptx-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.gptxMode === preferences.mode)
    })
    document.querySelectorAll('[data-gptx-format]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.gptxFormat === preferences.format)
    })
    document.querySelectorAll('[data-gptx-citations]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.gptxCitations === preferences.citations)
    })
  }

  function resetPort() {
    if (!port) return
    try {
      portDisconnectWasUserCancel = false
      port.disconnect()
    } catch {
      // Ignore: can throw if already disconnected.
    }
    port = null
  }

  function attachPortListeners(attachedPort) {
    attachedPort.onMessage.addListener(async (msg) => {
      if (msg.answer) {
        if (msg.answer === 'CHAT_GPTX_ANSWER_END') {
          isGenerating = false
          setStopVisible(false)
          renderAnswer(previousResponse, activeRequest?.startTime || performance.now(), true)
          setButtonsDisabled(false)
          setFollowupDisabled(false)
          setStatus('GPTx answer')
          if (activeRequest?.cacheKey) {
            await storeHistoryEntry(activeRequest.cacheKey, {
              question: activeRequest.displayQuestion,
              answer: previousResponse,
              mode: activeRequest.preferences.mode,
              format: activeRequest.preferences.format,
              citations: activeRequest.preferences.citations,
              createdAt: Date.now(),
            })
          }
        } else {
          previousResponse = msg.answer
          // Rendering markdown is expensive; throttle updates to reduce jank while streaming.
          renderAnswer(msg.answer, activeRequest?.startTime || performance.now(), false)
        }
      } else if (msg.error === 'UNAUTHORIZED') {
        endGenerationUI({
          status: 'Login required',
          html: '<div class="gptx-response-placeholder is-error">Please log in at <a href="https://chatgpt.com" target="_blank">chatgpt.com</a> first.</div>',
        })
      } else if (msg.error === 'OPENAI_API_KEY_MISSING') {
        endGenerationUI({
          status: 'API key required',
          placeholder: 'Set your OpenAI API key in the extension popup (OpenAI API section).',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_UNAUTHORIZED') {
        endGenerationUI({
          status: 'Invalid API key',
          placeholder: 'OpenAI API key rejected. Update it in the extension popup.',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_RATE_LIMIT') {
        endGenerationUI({
          status: 'Rate limited',
          placeholder: 'OpenAI API rate limited. Try again later or switch to a smaller model.',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_INVALID_MODEL') {
        endGenerationUI({
          status: 'Invalid model',
          placeholder:
            'OpenAI model not found. Update the model name in the extension popup (OpenAI API section).',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_INSUFFICIENT_QUOTA') {
        endGenerationUI({
          status: 'Quota / billing',
          placeholder:
            'OpenAI API quota/billing issue. Check your OpenAI account or remove the API key to use ChatGPT-session mode.',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_SERVER_ERROR') {
        endGenerationUI({
          status: 'OpenAI server error',
          placeholder: 'OpenAI API server error. Try again later.',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_BAD_REQUEST') {
        endGenerationUI({
          status: 'OpenAI request rejected',
          placeholder: 'OpenAI API rejected the request. Check your model and try again.',
          isError: true,
        })
      } else if (typeof msg.error === 'string' && msg.error.startsWith('OPENAI_ERROR:')) {
        endGenerationUI({
          status: 'OpenAI error',
          placeholder: 'OpenAI API request failed. Check your key/model in the popup and try again.',
          isError: true,
        })
      } else if (msg.error === 'OPENAI_ERROR') {
        endGenerationUI({
          status: 'OpenAI error',
          placeholder: 'OpenAI API request failed. Check your key/model in the popup and try again.',
          isError: true,
        })
      } else {
        endGenerationUI({
          status: 'Unable to load',
          placeholder: 'Failed to load response from ChatGPT.',
          isError: true,
        })
      }
    })

    attachedPort.onDisconnect.addListener(() => {
      if (attachedPort !== port) return
      port = null

      if (portDisconnectWasUserCancel) {
        portDisconnectWasUserCancel = false
        return
      }

      if (!isGenerating) return
      endGenerationUI({
        status: 'Disconnected',
        placeholder: 'Connection lost while generating. Please try again.',
        isError: true,
      })
    })
  }

  function ensurePort() {
    resetPort()
    port = Browser.runtime.connect()
    attachPortListeners(port)
    return port
  }

  async function requestAnswer({ prompt, displayQuestion, cacheKey }) {
    // Cancel any in-flight stream and reset render state.
    isGenerating = true
    setStopVisible(true)
    if (renderTimer) {
      clearTimeout(renderTimer)
      renderTimer = null
    }
    pendingRenderText = ''

    activeRequest = {
      prompt,
      displayQuestion,
      cacheKey,
      preferences: { ...preferences },
      startTime: performance.now(),
    }
    previousResponse = ''
    setQuestion(displayQuestion)
    setStatus('Generating answer...')
    gptxTimeParaElem.style.display = 'none'
    showPlaceholder('Thinking...')
    setButtonsDisabled(true)
    setFollowupDisabled(true)
    ensurePort().postMessage({ question: prompt })
  }

  async function loadFromCacheOrRequest({ prompt, displayQuestion, cacheKey }) {
    const cachedQuestion = await Browser.storage.local.get(cacheKey)
    const cachedEntry = normalizeEntry(cacheKey, cachedQuestion[cacheKey])
    if (cachedEntry) {
      setQuestion(displayQuestion)
      previousResponse = cachedEntry.answer
      activeRequest = {
        prompt,
        displayQuestion,
        cacheKey,
        preferences: { ...preferences },
        startTime: performance.now(),
      }
      updateResultDOM(cachedEntry.answer, activeRequest.startTime)
      setButtonsDisabled(false)
      setFollowupDisabled(false)
      setStatus('Cached answer')
      return
    }
    const legacyQuestion = await Browser.storage.local.get(displayQuestion)
    const legacyEntry = normalizeEntry(displayQuestion, legacyQuestion[displayQuestion])
    if (legacyEntry) {
      setQuestion(displayQuestion)
      previousResponse = legacyEntry.answer
      activeRequest = {
        prompt,
        displayQuestion,
        cacheKey,
        preferences: { ...preferences },
        startTime: performance.now(),
      }
      updateResultDOM(legacyEntry.answer, activeRequest.startTime)
      setButtonsDisabled(false)
      setFollowupDisabled(false)
      setStatus('Cached answer')
      await storeHistoryEntry(cacheKey, {
        question: displayQuestion,
        answer: legacyEntry.answer,
        mode: preferences.mode,
        format: preferences.format,
        citations: preferences.citations,
        createdAt: legacyEntry.createdAt || Date.now(),
      })
      return
    }
    await requestAnswer({ prompt, displayQuestion, cacheKey })
  }

  function updateResultDOM(text, startTime) {
    // One-shot render for cached answers.
    renderAnswer(text, startTime, true)
  }

  function renderAnswer(text, startTime, finalize) {
    pendingRenderText = text
    pendingRenderStartTime = startTime || performance.now()
    if (renderTimer) {
      if (finalize) {
        clearTimeout(renderTimer)
        renderTimer = null
        flushRender(true)
      }
      return
    }

    const now = performance.now()
    const delay = finalize ? 0 : Math.max(0, STREAM_RENDER_INTERVAL_MS - (now - lastRenderAt))
    renderTimer = setTimeout(() => {
      renderTimer = null
      flushRender(finalize)
    }, delay)
  }

  function flushRender(finalize) {
    const text = pendingRenderText
    lastRenderAt = performance.now()
    gptxResponseBodyElem.innerHTML = markdown.render(text)
    if (!finalize) return
    gptxTimeParaElem.style.display = 'inline'
    const endTime = performance.now()
    gptxTimeParaElem.textContent = `(${((endTime - pendingRenderStartTime) / 1000).toFixed(2)}s)`
  }

  function attachChipListeners() {
    document.querySelectorAll('[data-gptx-mode]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (preferences.mode === button.dataset.gptxMode) return
        preferences.mode = button.dataset.gptxMode
        await savePreferences(preferences)
        applyPreferencesToUI()
        const prompt = buildPrompt({ question: baseQuestion, preferences, sources: promptSources })
        const cacheKey = buildCacheKey(baseQuestion, preferences)
        await loadFromCacheOrRequest({
          prompt,
          displayQuestion: baseQuestion,
          cacheKey,
        })
      })
    })
    document.querySelectorAll('[data-gptx-format]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (preferences.format === button.dataset.gptxFormat) return
        preferences.format = button.dataset.gptxFormat
        await savePreferences(preferences)
        applyPreferencesToUI()
        const prompt = buildPrompt({ question: baseQuestion, preferences, sources: promptSources })
        const cacheKey = buildCacheKey(baseQuestion, preferences)
        await loadFromCacheOrRequest({
          prompt,
          displayQuestion: baseQuestion,
          cacheKey,
        })
      })
    })
    document.querySelectorAll('[data-gptx-citations]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (preferences.citations === button.dataset.gptxCitations) return
        preferences.citations = button.dataset.gptxCitations === 'on' ? 'on' : 'off'
        await savePreferences(preferences)
        applyPreferencesToUI()
        const prompt = buildPrompt({ question: baseQuestion, preferences, sources: promptSources })
        const cacheKey = buildCacheKey(baseQuestion, preferences)
        await loadFromCacheOrRequest({
          prompt,
          displayQuestion: baseQuestion,
          cacheKey,
        })
      })
    })
  }

  async function handleFollowUp() {
    const followUp = gptxFollowupInput.value.trim()
    if (!followUp || !previousResponse) return
    const displayQuestion = `${baseQuestion} — ${followUp}`
    const prompt = buildPrompt({
      question: baseQuestion,
      preferences,
      followUp,
      priorAnswer: previousResponse,
      sources: promptSources,
    })
    const cacheKey = buildCacheKey(displayQuestion, preferences)
    await requestAnswer({ prompt, displayQuestion, cacheKey })
    gptxFollowupInput.value = ''
  }

  gptxFooterRefreshBtn.addEventListener('click', async () => {
    if (!activeRequest) return
    await requestAnswer({
      prompt: activeRequest.prompt,
      displayQuestion: activeRequest.displayQuestion,
      cacheKey: activeRequest.cacheKey,
    })
  })

  async function clearActiveCacheEntry() {
    const keys = []
    if (activeRequest?.cacheKey) keys.push(activeRequest.cacheKey)
    // Legacy cache format used the display question as a storage key.
    if (activeRequest?.displayQuestion) keys.push(activeRequest.displayQuestion)
    const uniqueKeys = Array.from(new Set(keys))
    if (!uniqueKeys.length) return false
    await Browser.storage.local.remove(uniqueKeys)
    setStatus('Cache cleared for this query')
    return true
  }

  if (gptxFooterClearCacheBtn) {
    gptxFooterClearCacheBtn.addEventListener('click', async () => {
      const cleared = await clearActiveCacheEntry()
      if (!cleared) return
      const tooltip = gptxFooterClearCacheBtn.querySelector('.gptx-tooltip-text')
      if (tooltip) {
        const original = tooltip.textContent
        tooltip.textContent = 'Cleared'
        setTimeout(() => {
          tooltip.textContent = original || 'Clear cache'
        }, 900)
      }
    })
  }

  function stopGenerating() {
    if (!isGenerating) return false
    isGenerating = false
    setStopVisible(false)

    if (renderTimer) {
      clearTimeout(renderTimer)
      renderTimer = null
    }

    if (previousResponse) {
      renderAnswer(previousResponse, activeRequest?.startTime || performance.now(), true)
    } else {
      showPlaceholder('Stopped.', false)
    }
    setButtonsDisabled(false)
    setFollowupDisabled(false)
    setStatus('Stopped')

    if (port) {
      try {
        portDisconnectWasUserCancel = true
        port.disconnect()
      } catch {
        // ignore
      }
    }
    return true
  }

  if (gptxFooterStopBtn) {
    gptxFooterStopBtn.addEventListener('click', () => {
      stopGenerating()
    })
  }

  gptxFooterCopyBtn.addEventListener('click', async () => {
    const answerToCopy = String(gptxResponseBodyElem?.innerText || '').trim() || previousResponse
    if (!answerToCopy) return
    gptxFooterCopyBtn.innerHTML = `
      ${getApprovedCheckIconSvg('1.2em', '1.2em', '#198754')}
      <span class="gptx-tooltip-text" id="gptx-tooltip-copied-text">Copied</span>
      `
    setTimeout(() => {
      gptxFooterCopyBtn.innerHTML = `
        ${getCopyIconSvg('1.2em', '1.2em', footerBtnsIconSvgColor)}
        <span class="gptx-tooltip-text" id="gptx-tooltip-copy-text">Copy</span>
        `
    }, 700)
    copyText(answerToCopy)
  })

  if (gptxFooterCopyMdBtn) {
    gptxFooterCopyMdBtn.addEventListener('click', async () => {
      const answerToCopy = previousResponse
      if (!answerToCopy) return
      const tooltip = gptxFooterCopyMdBtn.querySelector('.gptx-tooltip-text')
      if (tooltip) {
        const original = tooltip.textContent
        tooltip.textContent = 'Copied'
        setTimeout(() => {
          tooltip.textContent = original || 'Copy Markdown'
        }, 700)
      }
      copyText(answerToCopy)
    })
  }

  gptxFooterNewTabBtn.addEventListener('click', () => {
    if (!activeRequest?.cacheKey) return
    Browser.runtime.sendMessage({ action: 'createNewTab', cacheKey: activeRequest.cacheKey })
  })

  if (gptxFooterReportBtn) {
    gptxFooterReportBtn.addEventListener('click', async () => {
      if (!activeRequest?.displayQuestion || !previousResponse) return
      const report = {
        id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : String(Date.now()),
        question: activeRequest.displayQuestion,
        answer: previousResponse,
        mode: activeRequest.preferences?.mode || preferences.mode,
        format: activeRequest.preferences?.format || preferences.format,
        pageUrl: location.href,
        createdAt: Date.now(),
      }
      await storeAnswerReport(report)
      const tooltip = gptxFooterReportBtn.querySelector('.gptx-tooltip-text')
      if (tooltip) {
        const original = tooltip.textContent
        tooltip.textContent = 'Saved'
        setTimeout(() => {
          tooltip.textContent = original || 'Report'
        }, 900)
      }
    })
  }

  gptxFollowupBtn.addEventListener('click', handleFollowUp)
  gptxFollowupInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleFollowUp()
    }
  })

  document.addEventListener('keydown', (event) => {
    const target = event.target
    const isTypingField = isInteractiveField(target)
    if (event.key === '/' && !isTypingField) {
      event.preventDefault()
      gptxFollowupInput.focus()
    }
    if (event.key === 'Escape') {
      if (document.activeElement === gptxFollowupInput) {
        gptxFollowupInput.blur()
        return
      }
      // Don't hijack Escape while the user is typing elsewhere; but allow it to stop a stream.
      if (!isTypingField && stopGenerating()) {
        event.preventDefault()
      }
    }
  })

  applyPreferencesToUI()
  attachChipListeners()
  setFollowupDisabled(true)
  setButtonsDisabled(true)
  setStopVisible(false)

  if (securityEnabled) {
    if (settings.hideAds) {
      hideGoogleAds()
    }
    const results = searchResultLinks
    let riskyCount = 0
    let sensitiveCount = 0
    let trackingCount = 0
    let httpCount = 0
    const normalizedAllowlist = allowlist.map(normalizeDomain)
    const normalizedBlocklist = blocklist.map(normalizeDomain)

    results.forEach((result) => {
      const assessment = assessDomainRisk(
        result.hostname,
        baseQuestion,
        normalizedAllowlist,
        normalizedBlocklist,
      )
      const level = getRiskLevel(assessment.score)
      const trackingParams = getTrackingParams(result.url)
      const isHttp = result.url.startsWith('http://')
      const sensitive = assessment.sensitive || isSensitiveUrl(result.url)
      const domainForLists = getRootDomain(result.hostname)

      if (level !== 'low') riskyCount += 1
      if (sensitive) sensitiveCount += 1
      if (trackingParams.length > 0) trackingCount += 1
      if (isHttp) httpCount += 1

      const riskInfo = {
        url: result.url,
        domain: normalizeDomain(domainForLists),
        reasons: assessment.reasons,
        level,
        sensitive,
        trackingParams,
        isHttp,
        blocklisted: assessment.blocklisted,
      }
      riskMap.set(result.anchor, riskInfo)

      if (settings.showBadges) {
        if (level !== 'low' && result.heading) {
          const badgeText = level === 'high' ? 'High risk' : 'Review'
          const badgeClass = level === 'high' ? 'gptx-risk-high' : 'gptx-risk-review'
          result.heading.appendChild(createBadge(badgeText, badgeClass))
        }
        if (settings.sensitiveAlerts && sensitive && result.heading) {
          result.heading.appendChild(createBadge('Sensitive', 'gptx-risk-sensitive'))
        }
        if (settings.stripTracking && trackingParams.length > 0 && result.heading) {
          result.heading.appendChild(createBadge('Tracking', 'gptx-risk-review'))
        }
        if (settings.upgradeHttps && isHttp && result.heading) {
          result.heading.appendChild(createBadge('HTTP', 'gptx-risk-high'))
        }
      }
    })

    const hasCleaning =
      (settings.stripTracking && trackingCount > 0) || (settings.upgradeHttps && httpCount > 0)

    if (riskyCount > 0) {
      setSecurityBanner(
        `${riskyCount} result${riskyCount > 1 ? 's' : ''} look risky. We’ll warn before you visit.`,
        'warn',
        true,
      )
    } else if (settings.sensitiveAlerts && sensitiveCount > 0) {
      setSecurityBanner(
        'Sensitive search detected. Double‑check URLs before signing in.',
        'info',
        true,
      )
    } else if (hasCleaning) {
      setSecurityBanner('We’ll clean tracking links and upgrade insecure URLs.', 'info', true)
    } else {
      setSecurityBanner('No obvious risks detected in top results.', 'info', true)
    }

    const modal = ensureModal()
    const modalTitle = modal.querySelector('.gptx-security-modal-title')
    const modalSubtitle = modal.querySelector('.gptx-security-modal-subtitle')
    const modalUrl = modal.querySelector('.gptx-security-modal-url')
    const modalReasons = modal.querySelector('.gptx-security-modal-reasons')
    const cancelBtn = modal.querySelector('#gptx-security-cancel')
    const reportBtn = modal.querySelector('#gptx-security-report')
    const allowBtn = modal.querySelector('#gptx-security-allow')
    const continueBtn = modal.querySelector('#gptx-security-continue')

    let pendingNavigation = null
    let pendingDomain = null
    let pendingInfo = null

    const closeModal = () => {
      modal.classList.remove('is-visible')
      pendingNavigation = null
      pendingDomain = null
      pendingInfo = null
    }

    cancelBtn.addEventListener('click', async () => {
      if (pendingInfo) {
        await storeSecurityEvent({
          type: 'action',
          action: 'cancel',
          url: pendingInfo.url,
          domain: pendingInfo.domain,
          level: pendingInfo.level,
          timestamp: Date.now(),
        })
      }
      closeModal()
    })
    modal.querySelector('.gptx-security-modal-backdrop').addEventListener('click', closeModal)

    allowBtn.addEventListener('click', async () => {
      if (pendingDomain) {
        const updatedAllowlist = Array.from(new Set([...(allowlist || []), pendingDomain]))
        securitySettings.allowlist = updatedAllowlist
        await saveSecurityAllowlist(updatedAllowlist)
      }
      if (pendingInfo) {
        await storeSecurityEvent({
          type: 'action',
          action: 'allow',
          url: pendingInfo.url,
          domain: pendingInfo.domain,
          level: pendingInfo.level,
          timestamp: Date.now(),
        })
      }
      if (pendingNavigation) {
        window.location.href = pendingNavigation
      }
      closeModal()
    })

    reportBtn.addEventListener('click', async () => {
      if (!pendingInfo) return
      const report = {
        url: pendingInfo.url,
        domain: pendingInfo.domain,
        reasons: pendingInfo.reasons,
        level: pendingInfo.level,
        timestamp: Date.now(),
      }
      await storeSecurityReport(report)
      copyText(JSON.stringify(report, null, 2))
      await storeSecurityEvent({
        type: 'action',
        action: 'report',
        url: pendingInfo.url,
        domain: pendingInfo.domain,
        level: pendingInfo.level,
        timestamp: Date.now(),
      })
      closeModal()
      setSecurityBanner('Report copied. Thanks for helping keep results safe.', 'info')
    })

    continueBtn.addEventListener('click', async () => {
      if (pendingNavigation) {
        if (pendingInfo) {
          await storeSecurityEvent({
            type: 'action',
            action: 'continue',
            url: pendingInfo.url,
            domain: pendingInfo.domain,
            level: pendingInfo.level,
            timestamp: Date.now(),
          })
        }
        window.location.href = pendingNavigation
      }
      closeModal()
    })

    results.forEach((result) => {
      result.anchor.addEventListener('click', async (event) => {
        const riskInfo = riskMap.get(result.anchor)
        if (!riskInfo) return
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
          return
        }
        const hardBlock =
          riskInfo.blocklisted || (settings.blockOnHighRisk && riskInfo.level === 'high')
        const shouldWarn = hardBlock || (settings.warnOnRisky && riskInfo.level !== 'low')
        const safetyResult = applyUrlSafety(riskInfo.url, settings)
        if (!shouldWarn && safetyResult.finalUrl === riskInfo.url) {
          return
        }
        event.preventDefault()
        pendingNavigation = safetyResult.finalUrl
        pendingDomain = riskInfo.domain
        pendingInfo = {
          ...riskInfo,
          url: safetyResult.finalUrl,
          removedParams: safetyResult.removedParams,
          upgraded: safetyResult.upgraded,
        }

        if (!shouldWarn) {
          window.location.href = pendingNavigation
          return
        }

        modalTitle.textContent = riskInfo.blocklisted
          ? 'Blocked by your security list'
          : 'Potential phishing risk'
        modalSubtitle.textContent =
          riskInfo.level === 'high' || riskInfo.blocklisted
            ? 'We recommend avoiding this site.'
            : 'Review the risks before continuing.'
        modalUrl.textContent = pendingNavigation
        continueBtn.disabled = hardBlock
        continueBtn.textContent = hardBlock ? 'Blocked' : 'Continue'
        await storeSecurityEvent({
          type: hardBlock ? 'blocked' : 'warned',
          action: hardBlock ? 'blocked' : 'warned',
          url: pendingNavigation,
          domain: pendingDomain,
          level: riskInfo.level,
          timestamp: Date.now(),
        })
        const extraReasons = []
        if (pendingInfo.removedParams?.length) {
          extraReasons.push(`Tracking params removed: ${pendingInfo.removedParams.join(', ')}`)
        }
        if (pendingInfo.upgraded) {
          extraReasons.push('Upgraded to HTTPS')
        }
        if (riskInfo.isHttp) {
          extraReasons.push('Insecure HTTP link')
        }
        if (riskInfo.sensitive && settings.sensitiveAlerts) {
          extraReasons.push('Sensitive query or URL')
        }
        const allReasons = [...riskInfo.reasons, ...extraReasons]
        modalReasons.innerHTML = ''
        allReasons.forEach((reason) => {
          const li = document.createElement('li')
          li.textContent = reason
          modalReasons.appendChild(li)
        })
        modal.classList.add('is-visible')
      })
    })
  } else {
    setSecurityBanner('Security alerts are paused.', 'info')
  }

  const initialPrompt = buildPrompt({ question: baseQuestion, preferences, sources: promptSources })
  const initialCacheKey = buildCacheKey(baseQuestion, preferences)
  await loadFromCacheOrRequest({
    prompt: initialPrompt,
    displayQuestion: baseQuestion,
    cacheKey: initialCacheKey,
  })
}
