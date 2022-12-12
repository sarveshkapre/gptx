import { getResultCardTemplate } from '../constants/templateStrings.mjs'
// import { storageCache } from './localStorage.mjs'
import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'
import clipboard from 'clipboardy'

const searchInput = document.getElementsByName('q')[0] // this will return search box (.input.gLFyf) element
if (searchInput && searchInput.value) {
  // only run on first page
  const startParam = new URL(location.href).searchParams.get('start') || '0'
  if (startParam === '0') {
    run(searchInput.value)
  }
}

async function run(question) {
  let isEnabledObj = await Browser.storage.local.get('gptxExtensionEnabled')
  console.log('gptx extension enabled: ', isEnabledObj.gptxExtensionEnabled)
  // chatgpt api will be fired if extension is enabled
  if (isEnabledObj.gptxExtensionEnabled) {
    const parentNode = document.getElementById('cnt') // get parent node to insert result card
    const margin_left = window
      .getComputedStyle(document.getElementById('center_col'), null)
      .getPropertyValue('margin-left')
    const newNode = document.createElement('div') // created element to insert chatgpt results content
    newNode.classList.add('gptxCard')

    // set colors to footer icons based on dark/light mode
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
    newNode.innerHTML = getResultCardTemplate(footerBtnsIconSvgColor) // added template to new node created

    // Get a reference to the sibling node before which you want to insert the new node
    const referenceNode = document.getElementById('rcnt')
    const max_width = window.getComputedStyle(referenceNode, null).getPropertyValue('max-width')

    newNode.style['margin-left'] = margin_left
    newNode.style['max-width'] = max_width

    // Insert the new node before the reference node
    parentNode.insertBefore(newNode, referenceNode)

    const port = Browser.runtime.connect() // defined port to send questions to background worker

    const gptxCardHeaderElem = document.getElementById('gptxCardHeader')
    const gptxLoadingParaElem = document.getElementById('gptxLoadingPara')
    const gptxResponseBodyElem = document.getElementById('gptxResponseBody')
    const gptxFooterRefreshBtn = document.getElementById('gptxFooterRefreshBtn')
    const gptxFooterCopyBtn = document.getElementById('gptxFooterCopyBtn')
    const gptxFooterNewTabBtn = document.getElementById('gptxFooterNewTabBtn')

    let startTime = performance.now()
    let previousResponse

    // listen to chatgpt result sent by background worker
    port.onMessage.addListener(function (msg) {
      if (msg.answer) {
        // add {question: answer} to local storage at end of answer
        if (msg.answer === 'CHAT_GPTX_ANSWER_END') {
          gptxFooterRefreshBtn.classList.remove('gptxDisableBtn')
          gptxFooterCopyBtn.classList.remove('gptxDisableBtn')
          gptxFooterNewTabBtn.classList.remove('gptxDisableBtn')
          // storageCache.setCache(question, previousResponse, 60 * 60)
          // console.log('GPTX: question answer cached')
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
          gptxFooterNewTabBtn.classList.add('gptxDisableBtn')
          updateResultDOM(msg.answer, startTime)
        }
      } else if (msg.error === 'UNAUTHORIZED') {
        gptxFooterRefreshBtn.classList.remove('gptxDisableBtn')
        gptxLoadingParaElem.style.display = 'none'
        gptxResponseBodyElem.style['margin-top'] = '0px'
        gptxResponseBodyElem.innerHTML =
          '<p>Please login at <a href="https://chat.openai.com" target="_blank">chat.openai.com</a> first</p>'
      } else {
        gptxFooterRefreshBtn.classList.remove('gptxDisableBtn')
        gptxLoadingParaElem.style.display = 'none'
        gptxResponseBodyElem.style['margin-top'] = '0px'
        gptxResponseBodyElem.innerHTML = '<p>Failed to load response from ChatGPT</p>'
      }
      gptxResponseBodyElem.style['margin-bottom'] = '0px'
      gptxCardHeaderElem.style.float = 'right'
    })

    /**
     * if question is cached
     *  - return result stored in local storage
     * else - send question to background worker
     */
    let cachedQuestion = await Browser.storage.local.get(question)
    // let cachedQuestion = storageCache.getCache(question)
    if (Object.keys(cachedQuestion).length > 0) {
      console.log('GPTX: cached result used')
      updateResultDOM(cachedQuestion[question], startTime)
    } else {
      gptxFooterRefreshBtn.classList.add('gptxDisableBtn')
      gptxFooterCopyBtn.classList.add('gptxDisableBtn')
      gptxFooterNewTabBtn.classList.add('gptxDisableBtn')
      port.postMessage({ question })
    }

    // registering for footer buttons events
    gptxFooterRefreshBtn.addEventListener('click', () => {
      console.log('gptx refresh result')
      startTime = performance.now()
      gptxFooterRefreshBtn.classList.add('gptxDisableBtn')
      gptxFooterCopyBtn.classList.add('gptxDisableBtn')
      gptxFooterNewTabBtn.classList.add('gptxDisableBtn')
      port.postMessage({ question })
    })
    gptxFooterCopyBtn.addEventListener('click', async () => {
      cachedQuestion = await Browser.storage.local.get(question)
      // cachedQuestion = storageCache.getCache(question)
      clipboard.write(cachedQuestion[question]).then(() => {
        console.log('gptx result copied')
      })
    })
    gptxFooterNewTabBtn.addEventListener('click', () => {
      port.postMessage({ GPTX_CREATE_NEW_TAB: question })
    })
  }
  function updateResultDOM(text, startTime) {
    // Updates DOM if result is returned or is already cached
    const gptxCardHeaderElem = document.getElementById('gptxCardHeader')
    const gptxLoadingParaElem = document.getElementById('gptxLoadingPara')
    const gptxTimeParaElem = document.getElementById('gptxTimePara')
    const gptxResponseBodyElem = document.getElementById('gptxResponseBody')
    const markdown = new MarkdownIt()
    let endTime
    gptxLoadingParaElem.innerHTML = 'ChatGPT powered results'
    gptxTimeParaElem.style.display = 'inline'
    gptxResponseBodyElem.innerHTML = markdown.render(text)
    gptxResponseBodyElem.style['margin-bottom'] = '0px'
    // gptxResponseBodyElem.scrollIntoView(false) // this can be used for auto scroll
    endTime = performance.now()
    gptxTimeParaElem.innerHTML = '(' + ((endTime - startTime) / 1000).toFixed(2) + ' seconds)'
    gptxCardHeaderElem.style.float = 'right'
  }
}
