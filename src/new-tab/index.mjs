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

// send getQuestion request to background.js
Browser.runtime.sendMessage({ action: 'getQuestion' }).then((response) => {
  question = response.question
  getQuestionsAnswer()
})

// get result stored in local storage and update the DOM
async function getQuestionsAnswer() {
  const answer = await Browser.storage.local.get(question)
  updateDOM(question, answer[question])
}

function updateDOM(question, answer) {
  const gptxNTResponseBody = document.getElementById('gptx-nt-response-body')
  const gptxNTQuestion = document.getElementById('gptx-nt-question')
  gptxNTQuestion.innerHTML = question
  gptxNTResponseBody.innerHTML = markdown.render(answer)
}
