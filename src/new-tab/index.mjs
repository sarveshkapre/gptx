/**
 * Open ChatGPT results in new tab
 */
import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'

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
