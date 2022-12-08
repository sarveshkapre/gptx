import MarkdownIt from 'markdown-it'
import Browser from 'webextension-polyfill'

async function run(question) {
  const markdown = new MarkdownIt()

  const parentNode = document.getElementById('cnt')
  const margin_left = window
    .getComputedStyle(document.getElementById('center_col'), null)
    .getPropertyValue('margin-left')

  const resultCardContentTemplate = `
    <div id="gptxCardHeader">
      <span id="gptxLoadingPara">Loading results from OpenAI...</span>
      <span id="gptxTimePara"></span>
    </div>
    <div id="gptxCardBody">
      <div id="gptxResponseBody" class="markdown-body" dir="auto"></div>
    </div>
  `
  const newNode = document.createElement('div')
  newNode.classList.add('gptxCard')

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    // add border color for dark mode
    newNode.style.border = '0.2px solid #373b3e'
  } else {
    // add border color for light mode
    newNode.style.border = '1px solid #dadce0'
  }

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
  const time1 = performance.now()
  let time2
  port.onMessage.addListener(function (msg) {
    if (msg.answer) {
      gptxLoadingParaElem.innerHTML = 'OpenAI powered results'
      gptxTimeParaElem.style.display = 'inline'
      gptxResponseBodyElem.innerHTML = markdown.render(msg.answer)
      gptxResponseBodyElem.style['margin-bottom'] = '0px'
      // gptxResponseBodyElem.scrollIntoView(false) // this can be used for auto scroll
      time2 = performance.now()
      gptxTimeParaElem.innerHTML = '(' + ((time2 - time1) / 1000).toFixed(2) + ' seconds)'
      gptxCardHeaderElem.style.float = 'right'
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
  port.postMessage({ question })
}

const searchInput = document.getElementsByName('q')[0] // this will return search box (.input.gLFyf) element
if (searchInput && searchInput.value) {
  // only run on first page
  const startParam = new URL(location.href).searchParams.get('start') || '0'
  if (startParam === '0') {
    run(searchInput.value)
  }
}
