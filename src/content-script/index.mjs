import { getRefreshIconSvg, getCopyIconSvg, getNewTabIconSvg } from './templateStrings'
import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'
import clipboard from 'clipboardy'

async function run(question) {
  const markdown = new MarkdownIt()

  const parentNode = document.getElementById('cnt')
  const margin_left = window
    .getComputedStyle(document.getElementById('center_col'), null)
    .getPropertyValue('margin-left')
  const newNode = document.createElement('div')
  newNode.classList.add('gptxCard')

  let footerBtnsIconSvgColor
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // add border color for dark mode
    newNode.style.border = '0.2px solid #373b3e'
    footerBtnsIconSvgColor = '#dadce0'
  } else {
    // add border color for light mode
    newNode.style.border = '1px solid #dadce0'
    footerBtnsIconSvgColor = '#373b3e'
  }
  const resultCardContentTemplate = `
    <div id="gptxCardHeader">
      <span id="gptxLoadingPara">Loading results from OpenAI...</span>
      <span id="gptxTimePara"></span>
    </div>
    <div id="gptxCardBody">
      <div id="gptxResponseBody" class="markdown-body" dir="auto"></div>
    </div>
    <div id="gptxCardFooter">
      <div class="btn gptxFooterBtns" id="gptxFooterNewTabBtn">
        ${getNewTabIconSvg('1.2em', '1.2em', footerBtnsIconSvgColor)}
      </div>
      <div class="btn gptxFooterBtns" id="gptxFooterCopyBtn">
        ${getCopyIconSvg('1.2em', '1.2em', footerBtnsIconSvgColor)}
      </div>
      <div class="btn gptxFooterBtns" id="gptxFooterRefreshBtn">
        ${getRefreshIconSvg('1.2em', '1.2em', footerBtnsIconSvgColor)}
      </div>
    </div>
  `
  newNode.innerHTML = resultCardContentTemplate

  // Get a reference to the child node before which you want to insert the new node
  const referenceNode = document.getElementById('rcnt')
  const max_width = window.getComputedStyle(referenceNode, null).getPropertyValue('max-width')

  newNode.style['margin-left'] = margin_left
  newNode.style['max-width'] = max_width

  // Insert the new node before the reference node
  parentNode.insertBefore(newNode, referenceNode)

  const port = Browser.runtime.connect()
  const gptxCardHeaderElem = document.getElementById('gptxCardHeader')
  const gptxLoadingParaElem = document.getElementById('gptxLoadingPara')
  const gptxTimeParaElem = document.getElementById('gptxTimePara')
  const gptxResponseBodyElem = document.getElementById('gptxResponseBody')
  const gptxFooterRefreshBtn = document.getElementById('gptxFooterRefreshBtn')
  const gptxFooterCopyBtn = document.getElementById('gptxFooterCopyBtn')
  let startTime = performance.now()
  let endTime

  function updateResultDOM(text, startTime) {
    /**
     * Update DOM if result is returned or is already cached
     */
    gptxLoadingParaElem.innerHTML = 'OpenAI powered results'
    gptxTimeParaElem.style.display = 'inline'
    gptxResponseBodyElem.innerHTML = markdown.render(text)
    gptxResponseBodyElem.style['margin-bottom'] = '0px'
    // gptxResponseBodyElem.scrollIntoView(false) // this can be used for auto scroll
    endTime = performance.now()
    gptxTimeParaElem.innerHTML = '(' + ((endTime - startTime) / 1000).toFixed(2) + ' seconds)'
    gptxCardHeaderElem.style.float = 'right'
  }

  let previousResponse
  port.onMessage.addListener(function (msg) {
    if (msg.answer) {
      if (msg.answer === 'CHAT_GPTX_ANSWER_END') {
        gptxFooterRefreshBtn.classList.remove('gptxDisableBtn')
        gptxFooterCopyBtn.classList.remove('gptxDisableBtn')
        Browser.storage.local
          .set({
            [question]: previousResponse,
          })
          .then(() => {
            console.log('GPTX: question answer cached')
          })
      } else {
        previousResponse = msg.answer
        gptxFooterCopyBtn.classList.add('gptxDisableBtn')
        updateResultDOM(msg.answer, startTime)
      }
    } else if (msg.error === 'UNAUTHORIZED') {
      gptxLoadingParaElem.style.display = 'none'
      gptxResponseBodyElem.style['margin-top'] = '0px'
      gptxResponseBodyElem.innerHTML =
        '<p>Please login at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a> first</p>'
    } else {
      gptxLoadingParaElem.style.display = 'none'
      gptxResponseBodyElem.style['margin-top'] = '0px'
      gptxResponseBodyElem.innerHTML = '<p>Failed to load response from ChatGPT</p>'
    }
    gptxResponseBodyElem.style['margin-bottom'] = '0px'
    gptxCardHeaderElem.style.float = 'right'
  })

  let cachedQuestion = await Browser.storage.local.get(question)
  if (Object.keys(cachedQuestion).length > 0) {
    console.log('GPTX: cached result used')
    updateResultDOM(cachedQuestion[question], startTime)
  } else {
    gptxFooterRefreshBtn.classList.add('gptxDisableBtn')
    gptxFooterCopyBtn.classList.add('gptxDisableBtn')
    port.postMessage({ question })
  }

  // registering for footer buttons events
  gptxFooterRefreshBtn.addEventListener('click', () => {
    console.log('gptx refresh result')
    startTime = performance.now()
    gptxFooterRefreshBtn.classList.add('gptxDisableBtn')
    gptxFooterCopyBtn.classList.add('gptxDisableBtn')
    port.postMessage({ question })
  })
  gptxFooterCopyBtn.addEventListener('click', async () => {
    cachedQuestion = await Browser.storage.local.get(question)
    clipboard.write(cachedQuestion[question]).then(() => {
      console.log('gptx result copied')
    })
  })
}

const searchInput = document.getElementsByName('q')[0] // this will return search box (.input.gLFyf) element
if (searchInput && searchInput.value) {
  // only run on first page
  const startParam = new URL(location.href).searchParams.get('start') || '0'
  if (startParam === '0') {
    run(searchInput.value)
  }
}
