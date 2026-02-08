/**
 * View / Delete browsing history for ChatGPT results
 */
import { getQADivContentTemplate, getNoHistoryTemplate } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'
import {
  formatEntryMeta,
  getHistoryKeys,
  getRenderableEntries,
} from '../utils/history-utils.mjs'
const markdown = new MarkdownIt()

main()

async function main() {
  const cachedData = await Browser.storage.local.get(null)
  renderDOM(cachedData)

  const gptxClearAllDataElem = document.getElementById('gptx-clear-all-data')
  gptxClearAllDataElem.addEventListener('click', async () => {
    const allData = await Browser.storage.local.get(null)
    const historyKeys = getHistoryKeys(allData)
    if (historyKeys.length === 0) return
    await Browser.storage.local.remove(historyKeys)
    showSnackBar('Cleared GPTx history')
    const updatedData = await Browser.storage.local.get(null)
    renderDOM(updatedData)
  })

  const gptxClearSelection = document.getElementById('gptx-clear-selection')
  gptxClearSelection.addEventListener('click', async () => {
    const selectedKeys = getSelectedKeys()
    if (selectedKeys.length === 0) return
    await Browser.storage.local.remove(selectedKeys)
    selectedKeys.forEach((key) => {
      const divToDelete = findRowByKey(key)
      if (divToDelete) {
        divToDelete.remove()
      }
    })
    showSnackBar('Selected items deleted')
    const updatedData = await Browser.storage.local.get(null)
    if (getRenderableEntries(updatedData).length === 0) {
      document.getElementById('gptx-nt-qa-accordian').innerHTML = getNoHistoryTemplate()
    }
  })
}

function renderDOM(cachedData) {
  const parent = document.getElementById('gptx-nt-qa-accordian')
  const entries = getRenderableEntries(cachedData)
  parent.innerHTML = ''

  if (entries.length === 0) {
    parent.innerHTML = getNoHistoryTemplate()
    return
  }

  entries.forEach((entry) => {
    const qaDivTemplate = getQADivContentTemplate(
      entry.storageKey,
      entry.question,
      markdown.render(entry.answer),
      formatEntryMeta(entry),
    )
    const qaDivElem = document.createElement('div')
    qaDivElem.setAttribute('data-key', entry.storageKey)
    qaDivElem.classList.add('gptx-accordion-item')
    qaDivElem.innerHTML = qaDivTemplate
    parent.appendChild(qaDivElem)
  })

  attachCheckboxHandlers()
  attachAccordionHandlers()
}

function attachCheckboxHandlers() {
  const checkboxes = document.querySelectorAll('.gptx-qa-checkbox-input')
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const key = checkbox.getAttribute('data-key')
      const row = findRowByKey(key)
      if (row) {
        row.classList.toggle('is-selected', checkbox.checked)
      }
    })
  })
}

function attachAccordionHandlers() {
  const accordions = document.getElementsByClassName('gptx-accordion-button')
  for (let i = 0; i < accordions.length; i++) {
    accordions[i].addEventListener('click', function () {
      this.classList.toggle('active')
      const panel = this.parentElement.querySelector('.gptx-accordion-body')
      if (!panel) return
      panel.style.display = panel.style.display === 'block' ? 'none' : 'block'
    })
  }
}

function getSelectedKeys() {
  const selected = []
  document.querySelectorAll('.gptx-qa-checkbox-input').forEach((checkbox) => {
    if (checkbox.checked) {
      selected.push(checkbox.getAttribute('data-key'))
    }
  })
  return selected
}

function findRowByKey(key) {
  const escapedKey =
    typeof CSS !== 'undefined' && CSS.escape
      ? CSS.escape(key)
      : key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return document.querySelector(`div[data-key="${escapedKey}"]`)
}

function showSnackBar(msg) {
  const gptxSnackBar = document.getElementById('gptx-snackbar')
  gptxSnackBar.className = 'show'
  gptxSnackBar.innerHTML = msg
  setTimeout(function () {
    gptxSnackBar.className = gptxSnackBar.className.replace('show', '')
  }, 3000)
}
