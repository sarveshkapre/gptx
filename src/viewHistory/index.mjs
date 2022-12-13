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
    showSnackBar('Cleared ChatGPT history')
    const cachedData = await Browser.storage.local.get(null)
    updateDOM(cachedData)
  })

  // Select all checkboxes
  const checkboxes = document.querySelectorAll('.gptxQACheckboxInput')
  let selectedQuestions = []
  let divsToDelete = []
  // Loop over the checkboxes and add an event listener
  for (let i = 0; i < checkboxes.length; i++) {
    checkboxes[i].addEventListener('change', async (event) => {
      const question = checkboxes[i].getAttribute('data-key')
      const deleteDivs = document.querySelectorAll(`div[data-key="${question}"]`)
      if (event.target.checked) {
        selectedQuestions.push(question)
        divsToDelete.push(deleteDivs[0])
      } else {
        selectedQuestions = selectedQuestions.filter((ques) => ques !== question)
        divsToDelete = divsToDelete.filter((divs) => divs !== deleteDivs[0])
      }
    })
  }

  // delete selected questions on btn click
  const gptxClearSelection = document.getElementById('gptxClearSelection')
  gptxClearSelection.addEventListener('click', async () => {
    Browser.storage.local.remove(selectedQuestions).then(async () => {
      const parent = document.getElementById('gptxHistoryQAAccordian')
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
  const accordions = document.getElementsByClassName('gptxAccordionButton')
  for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener('click', function () {
      /* Toggle between adding and removing the "active" class,
    to highlight the button that controls the panel */
      this.classList.toggle('active')

      /* Toggle between hiding and showing the active panel */
      const panel = this.nextElementSibling
      if (panel.style.display === 'block') {
        panel.style.display = 'none'
      } else {
        panel.style.display = 'block'
      }
    })
  }

  function updateDOM(cachedData) {
    console.log('gptx cached data length: ', Object.keys(cachedData).length)
    const parent = document.getElementById('gptxHistoryQAAccordian')
    const markdown = new MarkdownIt()
    if (Object.keys(cachedData).length > 1) {
      Object.keys(cachedData).forEach((key) => {
        if (key !== 'gptxExtensionEnabled') {
          // append Q & A to div
          const qaDivTemplate = getQADivContentTemplate(key, markdown.render(cachedData[key]))
          const qaDivElem = document.createElement('div')
          qaDivElem.setAttribute('data-key', key)
          qaDivElem.classList.add('gptxAccordionItem')
          qaDivElem.innerHTML = qaDivTemplate
          parent.appendChild(qaDivElem)
        }
      })
    } else {
      // no items in local storage
      parent.innerHTML = getNoHistoryTemplate()
    }
  }

  function showSnackBar(msg) {
    const gptxSnackBar = document.getElementById('gptxSnackbar')
    // Add the "show" class to DIV
    gptxSnackBar.className = 'show'
    gptxSnackBar.innerHTML = msg
    // After 3 seconds, remove the show class from DIV
    setTimeout(function () {
      gptxSnackBar.className = gptxSnackBar.className.replace('show', '')
    }, 3000)
  }
}

main()
