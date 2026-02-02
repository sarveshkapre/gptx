/**
 * Open ChatGPT results in new tab
 */
import Browser from 'webextension-polyfill'
import clipboard from 'clipboardy'
import MarkdownIt from 'markdown-it'
import { getCopyIconSvg, getApprovedCheckIconSvg } from '../constants/template-strings.mjs'

// const gptxCopyIcon = document.getElementById('gptx-copy-icon')
// gptxCopyIcon.innerHTML = getCopyIconSvg('1.2em', '1.2em', 'white')

const gptxCopyBtn = document.getElementById('gptx-copy-qa')
gptxCopyBtn.innerHTML = `
  <div class="gptx-settings-icon" id="gptx-copy-icon">
  ${getCopyIconSvg('1.2em', '1.2em', 'white')}
  </div>
  <span>Copy</span>
`
gptxCopyBtn.addEventListener('click', () => {
  gptxCopyBtn.innerHTML = `
    <div class="gptx-settings-icon" id="gptx-copy-icon">
      ${getApprovedCheckIconSvg('1.2em', '1.2em', 'green')}
    </div>
    <span>Copied</span>
  `
  gptxCopyBtn.style.color = 'green'
  setTimeout(function () {
    gptxCopyBtn.innerHTML = `
      <div class="gptx-settings-icon" id="gptx-copy-icon">
        ${getCopyIconSvg('1.2em', '1.2em', 'white')}
      </div>
      <span>Copy</span>
    `
    gptxCopyBtn.style.color = ''
  }, 700)

  const gptxNTQuestion = document.getElementById('gptx-nt-question')
  const gptxNTResponseBody = document.getElementById('gptx-nt-response-body')
  const entireThread = `${gptxNTQuestion.innerText}\n\n${gptxNTResponseBody.innerText}\n`
  clipboard.write(entireThread).then(() => {
    console.log('gptx: chatgpt entire thread copied')
  })
})

let question = null
const markdown = new MarkdownIt()
const metaElem = document.getElementById('gptx-nt-meta')

// send getQuestion request to background.js
Browser.runtime.sendMessage({ action: 'getQuestion' }).then((response) => {
  if (!response?.cacheKey) {
    updateDOM('No cached answer found', 'Please regenerate this answer from Google search.')
    metaElem.textContent = ''
    return
  }
  question = response.cacheKey
  getQuestionsAnswer()
})

// get result stored in local storage and update the DOM
async function getQuestionsAnswer() {
  const answer = await Browser.storage.local.get(question)
  const entry = normalizeEntry(question, answer[question])
  if (!entry) {
    updateDOM('No cached answer found', 'Please regenerate this answer from Google search.')
    metaElem.textContent = ''
    return
  }
  updateDOM(entry.question, entry.answer)
  metaElem.textContent = formatMeta(entry)
}

function updateDOM(question, answer) {
  const gptxNTResponseBody = document.getElementById('gptx-nt-response-body')
  const gptxNTQuestion = document.getElementById('gptx-nt-question')
  gptxNTQuestion.innerHTML = question
  gptxNTResponseBody.innerHTML = markdown.render(answer)
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

function formatMeta(entry) {
  const parts = []
  if (entry.mode && entry.mode !== 'legacy') {
    parts.push(capitalize(entry.mode))
  }
  if (entry.format && entry.format !== 'legacy') {
    parts.push(capitalize(entry.format))
  }
  if (entry.createdAt) {
    parts.push(new Date(entry.createdAt).toLocaleString())
  }
  return parts.join(' · ')
}

function capitalize(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}
