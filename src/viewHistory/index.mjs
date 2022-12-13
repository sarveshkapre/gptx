import { getQADivContentTemplate, getNoHistoryTemplate } from '../constants/templateStrings.mjs'
import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'

async function main() {
  const cachedData = await Browser.storage.local.get(null)
  updateDOM(cachedData)

  const gptxClearAllDataElem = document.getElementById('gptxClearAllData')
  gptxClearAllDataElem.addEventListener('click', async () => {
    await Browser.storage.local.clear()
    console.log('gptx local storage cleared')
    const cachedData = await Browser.storage.local.get(null)
    updateDOM(cachedData)
  })

  function updateDOM(cachedData) {
    console.log('gptx cached data length: ', Object.keys(cachedData).length)
    const parent = document.getElementById('gptxHistoryQAColumn')
    const markdown = new MarkdownIt()
    if (Object.keys(cachedData).length > 1) {
      Object.keys(cachedData).forEach((key) => {
        if (key !== 'gptxExtensionEnabled') {
          // append question to div
          const questionDivTemplate = getQADivContentTemplate('Q', key)
          const questionDivElem = document.createElement('div')
          questionDivElem.classList.add('gptxQuestionDiv')
          questionDivElem.innerHTML = questionDivTemplate
          parent.appendChild(questionDivElem)

          // append answer to div
          const answerDivTemplate = getQADivContentTemplate('A', markdown.render(cachedData[key]))
          const answerDivElem = document.createElement('div')
          answerDivElem.classList.add('gptxAnswerDiv')
          answerDivElem.innerHTML = answerDivTemplate
          parent.appendChild(answerDivElem)
        }
      })
    } else {
      // no items in local storage
      parent.innerHTML = getNoHistoryTemplate()
    }
  }
}

main()
