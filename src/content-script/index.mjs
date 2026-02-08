import {
  getResultCardTemplate,
  getApprovedCheckIconSvg,
  getCopyIconSvg,
} from '../constants/template-strings.mjs'
import { buildCacheKey, normalizeEntry } from '../utils/history-utils.mjs'
import {
  applyUrlSafety,
  assessDomainRisk,
  getRiskLevel,
  getTrackingParams,
  isSensitiveUrl,
  normalizeDomain,
} from '../utils/security-utils.mjs'
import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'
import clipboard from 'clipboardy'

const DEFAULT_PREFERENCES = {
  mode: 'summary',
  format: 'bullets',
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

async function loadSecuritySettings() {
  const stored = await Browser.storage.local.get([
    'gptxSecurityEnabled',
    'gptxSecurityAllowlist',
    'gptxSecurityBlocklist',
    'gptxSecuritySettings',
  ])
  const enabled =
    stored.gptxSecurityEnabled === undefined ? DEFAULT_SECURITY.enabled : stored.gptxSecurityEnabled
  const allowlist = stored.gptxSecurityAllowlist || DEFAULT_SECURITY.allowlist
  const blocklist = stored.gptxSecurityBlocklist || DEFAULT_SECURITY.blocklist
  const settings = {
    ...DEFAULT_SECURITY_SETTINGS,
    ...(stored.gptxSecuritySettings || {}),
  }
  if (stored.gptxSecurityEnabled === undefined) {
    await Browser.storage.local.set({ gptxSecurityEnabled: enabled })
  }
  if (!stored.gptxSecurityAllowlist) {
    await Browser.storage.local.set({ gptxSecurityAllowlist: allowlist })
  }
  if (!stored.gptxSecurityBlocklist) {
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

function buildPrompt({ question, preferences, followUp, priorAnswer }) {
  const modeInstruction = MODE_CONFIG[preferences.mode]?.instruction || ''
  const formatInstruction = FORMAT_CONFIG[preferences.format]?.instruction || ''
  if (followUp) {
    return `
You are a helpful research assistant.
${modeInstruction}
${formatInstruction}

Original question: ${question}
Previous answer: ${priorAnswer || 'N/A'}
Follow-up: ${followUp}
    `.trim()
  }
  return `
You are a helpful research assistant.
${modeInstruction}
${formatInstruction}

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

  const port = Browser.runtime.connect()

  const gptxLoadingParaElem = document.getElementById('gptx-loading-para')
  const gptxTimeParaElem = document.getElementById('gptx-time-para')
  const gptxResponseBodyElem = document.getElementById('gptx-response-body')
  const gptxQuestionElem = document.getElementById('gptx-question')
  const gptxSecurityBannerElem = document.getElementById('gptx-security-banner')
  const gptxFooterRefreshBtn = document.getElementById('gptx-footer-refresh-btn')
  const gptxFooterCopyBtn = document.getElementById('gptx-footer-copy-btn')
  const gptxFooterNewTabBtn = document.getElementById('gptx-footer-new-tab-btn')
  const gptxFollowupInput = document.getElementById('gptx-followup-input')
  const gptxFollowupBtn = document.getElementById('gptx-followup-btn')
  const securityCenterUrl = Browser.runtime.getURL('security-center.html')

  let preferences = await loadPreferences()
  let securitySettings = await loadSecuritySettings()
  const { enabled: securityEnabled, allowlist, blocklist, settings } = securitySettings
  let activeRequest = null
  let previousResponse = ''
  const riskMap = new WeakMap()

  const markdown = new MarkdownIt()

  function setStatus(text) {
    gptxLoadingParaElem.textContent = text
  }

  function setQuestion(text) {
    gptxQuestionElem.textContent = text
  }

  function setButtonsDisabled(disabled) {
    if (disabled) {
      gptxFooterRefreshBtn.classList.add('gptx-disable-btn')
      gptxFooterCopyBtn.classList.add('gptx-disable-btn')
      gptxFooterNewTabBtn.classList.add('gptx-disable-btn')
    } else {
      gptxFooterRefreshBtn.classList.remove('gptx-disable-btn')
      gptxFooterCopyBtn.classList.remove('gptx-disable-btn')
      gptxFooterNewTabBtn.classList.remove('gptx-disable-btn')
    }
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
  }

  async function requestAnswer({ prompt, displayQuestion, cacheKey }) {
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
    port.postMessage({ question: prompt })
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
      await Browser.storage.local.set({
        [cacheKey]: {
          question: displayQuestion,
          answer: legacyEntry.answer,
          mode: preferences.mode,
          format: preferences.format,
          createdAt: legacyEntry.createdAt || Date.now(),
        },
      })
      return
    }
    await requestAnswer({ prompt, displayQuestion, cacheKey })
  }

  function updateResultDOM(text, startTime) {
    gptxTimeParaElem.style.display = 'inline'
    gptxResponseBodyElem.innerHTML = markdown.render(text)
    const endTime = performance.now()
    gptxTimeParaElem.textContent = `(${((endTime - startTime) / 1000).toFixed(2)}s)`
  }

  function attachChipListeners() {
    document.querySelectorAll('[data-gptx-mode]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (preferences.mode === button.dataset.gptxMode) return
        preferences.mode = button.dataset.gptxMode
        await savePreferences(preferences)
        applyPreferencesToUI()
        const prompt = buildPrompt({ question: baseQuestion, preferences })
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
        const prompt = buildPrompt({ question: baseQuestion, preferences })
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
    })
    const cacheKey = buildCacheKey(displayQuestion, preferences)
    await requestAnswer({ prompt, displayQuestion, cacheKey })
    gptxFollowupInput.value = ''
  }

  port.onMessage.addListener(async (msg) => {
    if (msg.answer) {
      if (msg.answer === 'CHAT_GPTX_ANSWER_END') {
        setButtonsDisabled(false)
        setFollowupDisabled(false)
        setStatus('GPTx answer')
        if (activeRequest?.cacheKey) {
          await Browser.storage.local.set({
            [activeRequest.cacheKey]: {
              question: activeRequest.displayQuestion,
              answer: previousResponse,
              mode: activeRequest.preferences.mode,
              format: activeRequest.preferences.format,
              createdAt: Date.now(),
            },
          })
        }
      } else {
        previousResponse = msg.answer
        updateResultDOM(msg.answer, activeRequest?.startTime || performance.now())
      }
    } else if (msg.error === 'UNAUTHORIZED') {
      setButtonsDisabled(false)
      setFollowupDisabled(false)
      setStatus('Login required')
      gptxResponseBodyElem.innerHTML =
        '<div class="gptx-response-placeholder is-error">Please log in at <a href="https://chatgpt.com" target="_blank">chatgpt.com</a> first.</div>'
    } else {
      setButtonsDisabled(false)
      setFollowupDisabled(false)
      setStatus('Unable to load')
      showPlaceholder('Failed to load response from ChatGPT.', true)
    }
  })

  gptxFooterRefreshBtn.addEventListener('click', async () => {
    if (!activeRequest) return
    await requestAnswer({
      prompt: activeRequest.prompt,
      displayQuestion: activeRequest.displayQuestion,
      cacheKey: activeRequest.cacheKey,
    })
  })

  gptxFooterCopyBtn.addEventListener('click', async () => {
    const answerToCopy = previousResponse
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
    clipboard.write(answerToCopy).then(() => {
      console.log('gptx result copied')
    })
  })

  gptxFooterNewTabBtn.addEventListener('click', () => {
    if (!activeRequest?.cacheKey) return
    port.postMessage({ GPTX_CREATE_NEW_TAB: activeRequest.cacheKey })
  })

  gptxFollowupBtn.addEventListener('click', handleFollowUp)
  gptxFollowupInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleFollowUp()
    }
  })

  document.addEventListener('keydown', (event) => {
    const target = event.target
    const isTypingField =
      target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
    if (event.key === '/' && !isTypingField) {
      event.preventDefault()
      gptxFollowupInput.focus()
    }
    if (event.key === 'Escape' && document.activeElement === gptxFollowupInput) {
      gptxFollowupInput.blur()
    }
  })

  applyPreferencesToUI()
  attachChipListeners()
  setFollowupDisabled(true)
  setButtonsDisabled(true)

  if (securityEnabled) {
    if (settings.hideAds) {
      hideGoogleAds()
    }
    const results = getSearchResultLinks()
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

      if (level !== 'low') riskyCount += 1
      if (sensitive) sensitiveCount += 1
      if (trackingParams.length > 0) trackingCount += 1
      if (isHttp) httpCount += 1

      const riskInfo = {
        url: result.url,
        domain: normalizeDomain(result.hostname),
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
      clipboard.write(JSON.stringify(report, null, 2))
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

  const initialPrompt = buildPrompt({ question: baseQuestion, preferences })
  const initialCacheKey = buildCacheKey(baseQuestion, preferences)
  await loadFromCacheOrRequest({
    prompt: initialPrompt,
    displayQuestion: baseQuestion,
    cacheKey: initialCacheKey,
  })
}
