import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'

let question = null
const markdown = new MarkdownIt()

Browser.runtime.sendMessage({ action: 'getQuestion' }).then((response) => {
  question = response.question
  getQuestionsAnswer()
})

async function getQuestionsAnswer() {
  const answer = await Browser.storage.local.get(question)
  updateDOM(question, answer[question])
}

function updateDOM(question, answer) {
  const gptxNTResponseBody = document.getElementById('gptxNTResponseBody')
  const gptxNTQuestion = document.getElementById('gptxNTQuestion')
  gptxNTQuestion.innerHTML = question
  gptxNTResponseBody.innerHTML = markdown.render(answer)
}
