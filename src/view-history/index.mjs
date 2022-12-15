/**
 * View / Delete browsing history for ChatGPT results
 */
import { getQADivContentTemplate, getNoHistoryTemplate } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'

async function main() {
  // get all stored results from local storage and update DOM
  const cachedData = await Browser.storage.local.get(null)
  updateDOM(cachedData)

  // clear all ChatGPT browsing data
  const gptxClearAllDataElem = document.getElementById('gptx-clear-all-data')
  gptxClearAllDataElem.addEventListener('click', async () => {
    await Browser.storage.local.clear()
    console.log('gptx local storage cleared')
    showSnackBar('Cleared ChatGPT history')
    const cachedData = await Browser.storage.local.get(null)
    updateDOM(cachedData)
  })

  // Get all checkboxes
  const checkboxes = document.querySelectorAll('.gptx-qa-checkbox-input')
  let selectedQuestions = []
  let divsToDelete = []
  // Loop over the checkboxes and add an event listener
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', async (event) => {
      const question = checkboxes[i].getAttribute('data-key')
      const deleteDivs = document.querySelectorAll(`div[data-key="${question}"]`)
      if (event.target.checked) {
        // for each selected checkbox add corresponding questions and div element in list
        selectedQuestions.push(question)
        divsToDelete.push(deleteDivs[0])
      } else {
        // for each unselected checkbox remove corresponding questions and div element in list
        selectedQuestions = selectedQuestions.filter((ques) => ques !== question)
        divsToDelete = divsToDelete.filter((divs) => divs !== deleteDivs[0])
      }
    })
  }

  // delete selected questions on btn click
  const gptxClearSelection = document.getElementById('gptx-clear-selection')
  gptxClearSelection.addEventListener('click', async () => {
    Browser.storage.local.remove(selectedQuestions).then(async () => {
      const parent = document.getElementById('gptx-history-qa-accordian')
      selectedQuestions = []
      divsToDelete.forEach((div) => {
        parent.removeChild(div)
      })
      divsToDelete = []

      showSnackBar('Selected items deleted')

      const cachedData = await Browser.storage.local.get(null)
      if (Object.keys(cachedData).length < 2) {
        parent.innerHTML = getNoHistoryTemplate()
      }
    })
  })

  // add event listener for accordion collapse/expand
  const accordions = document.getElementsByClassName('gptx-accordion-button')
  for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener('click', function () {
      this.classList.toggle('active')

      // Toggle between hiding and showing the accordion body
      const panel = this.nextElementSibling
      if (panel.style.display === 'block') {
        panel.style.display = 'none'
      } else {
        panel.style.display = 'block'
      }
    })
  }

  // Display Q & A in DOM
  function updateDOM(cachedData) {
    console.log('gptx cached data length: ', Object.keys(cachedData).length)
    const parent = document.getElementById('gptx-history-qa-accordian')
    const markdown = new MarkdownIt()
    if (Object.keys(cachedData).length > 1) {
      Object.keys(cachedData).forEach((key) => {
        if (key !== 'gptxExtensionEnabled') {
          // append Q & A to div
          console.log(cachedData[key])
          const qaDivTemplate = getQADivContentTemplate(key, markdown.render(cachedData[key]))
          const qaDivElem = document.createElement('div')
          qaDivElem.setAttribute('data-key', key)
          qaDivElem.classList.add('gptx-accordion-item')
          qaDivElem.innerHTML = qaDivTemplate
          parent.appendChild(qaDivElem)
        }
      })
    } else {
      // no items in local storage
      parent.innerHTML = getNoHistoryTemplate()
    }
  }

  // show toast on delete history
  function showSnackBar(msg) {
    const gptxSnackBar = document.getElementById('gptx-snackbar')
    gptxSnackBar.className = 'show'
    gptxSnackBar.innerHTML = msg
    // After 3 seconds, remove the show class from div
    setTimeout(function () {
      gptxSnackBar.className = gptxSnackBar.className.replace('show', '')
    }, 3000)
  }
}

main()
