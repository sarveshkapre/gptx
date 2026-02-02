import {
  getResultCardTemplate,
  getApprovedCheckIconSvg,
  getCopyIconSvg,
} from '../constants/template-strings.mjs'
import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'
import clipboard from 'clipboardy'

const DEFAULT_PREFERENCES = {
  mode: 'summary',
  format: 'bullets',
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

function buildCacheKey(question, preferences) {
  return `gptx:${question}::${preferences.mode}::${preferences.format}`
}

function normalizeEntry(key, value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      question: key,
      answer: value,
      mode: 'legacy',
      format: 'legacy',
      createdAt: null,
    }
  }
  if (typeof value === 'object' && value.answer) {
    return {
      question: value.question || key,
      answer: value.answer,
      mode: value.mode,
      format: value.format,
      createdAt: value.createdAt,
    }
  }
  return null
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
  const gptxFooterRefreshBtn = document.getElementById('gptx-footer-refresh-btn')
  const gptxFooterCopyBtn = document.getElementById('gptx-footer-copy-btn')
  const gptxFooterNewTabBtn = document.getElementById('gptx-footer-new-tab-btn')
  const gptxFollowupInput = document.getElementById('gptx-followup-input')
  const gptxFollowupBtn = document.getElementById('gptx-followup-btn')

  let preferences = await loadPreferences()
  let activeRequest = null
  let previousResponse = ''

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
    } else {
      await requestAnswer({ prompt, displayQuestion, cacheKey })
    }
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
        '<div class="gptx-response-placeholder is-error">Please login at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a> first.</div>'
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

  const initialPrompt = buildPrompt({ question: baseQuestion, preferences })
  const initialCacheKey = buildCacheKey(baseQuestion, preferences)
  await loadFromCacheOrRequest({
    prompt: initialPrompt,
    displayQuestion: baseQuestion,
    cacheKey: initialCacheKey,
  })
}
