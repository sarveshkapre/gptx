/**
 * View / Delete browsing history for ChatGPT results
 */
import { getQADivContentTemplate, getNoHistoryTemplate } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'
import MarkdownIt from 'markdown-it'

const STORAGE_KEYS_TO_IGNORE = new Set([
  'gptxExtensionEnabled',
  'gptxPreferences',
  'gptxSecurityEnabled',
  'gptxSecurityAllowlist',
  'gptxSecurityBlocklist',
  'gptxSecuritySettings',
  'gptxSecurityReports',
  'gptxSecurityEvents',
])
const markdown = new MarkdownIt()

main()

async function main() {
  const cachedData = await Browser.storage.local.get(null)
  renderDOM(cachedData)

  const gptxClearAllDataElem = document.getElementById('gptx-clear-all-data')
  gptxClearAllDataElem.addEventListener('click', async () => {
    await Browser.storage.local.clear()
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
      const divToDelete = document.querySelector(`div[data-key="${key}"]`)
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
      formatMeta(entry),
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
      const row = document.querySelector(`div[data-key="${key}"]`)
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

function getRenderableEntries(cachedData) {
  return Object.entries(cachedData)
    .filter(([key]) => !STORAGE_KEYS_TO_IGNORE.has(key))
    .map(([key, value]) => normalizeEntry(key, value))
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function normalizeEntry(storageKey, value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      storageKey,
      question: storageKey,
      answer: value,
      mode: 'legacy',
      format: 'legacy',
      createdAt: null,
    }
  }
  if (typeof value === 'object' && value.answer) {
    return {
      storageKey,
      question: value.question || storageKey,
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

function showSnackBar(msg) {
  const gptxSnackBar = document.getElementById('gptx-snackbar')
  gptxSnackBar.className = 'show'
  gptxSnackBar.innerHTML = msg
  setTimeout(function () {
    gptxSnackBar.className = gptxSnackBar.className.replace('show', '')
  }, 3000)
}
