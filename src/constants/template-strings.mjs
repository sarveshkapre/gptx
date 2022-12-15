export function getRefreshIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
<svg id="refreshIconSvg" width=${width} height=${height} viewBox="0 0 16 16" fill="${color}" class="bi bi-arrow-clockwise" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" d="M3.17 6.706a5 5 0 0 1 7.103-3.16.5.5 0 1 0 .454-.892A6 6 0 1 0 13.455 5.5a.5.5 0 0 0-.91.417 5 5 0 1 1-9.375.789z"/>
  <path fill-rule="evenodd" d="M8.147.146a.5.5 0 0 1 .707 0l2.5 2.5a.5.5 0 0 1 0 .708l-2.5 2.5a.5.5 0 1 1-.707-.708L10.293 3 8.147.854a.5.5 0 0 1 0-.708z"/>
</svg>
`
}

export function getCopyIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="copyIconSvg" width=${width} height=${height} fill="${color}" viewBox="0 0 25 25">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
  `
}
export function getNewTabIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="newTabSvg" width=${width} height=${height} fill="${color}" viewBox="0 0 44 44"  xmlns="http://www.w3.org/2000/svg">
    <path d="M9 42q-1.2 0-2.1-.9Q6 40.2 6 39V9q0-1.2.9-2.1Q7.8 6 9 6h13.95v3H9v30h30V25.05h3V39q0 1.2-.9 2.1-.9.9-2.1.9Zm10.1-10.95L17 28.9 36.9 9H25.95V6H42v16.05h-3v-10.9Z"/>
  </svg>
  `
}
export function getApprovedCheckIconSvg(width = '1em', height = '1em', color = 'green') {
  return `
  <svg width=${width} height=${height} fill="${color}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.839,10.403C19.944,10.919,20,11.453,20,12c0,4.411-3.589,8-8,8s-8-3.589-8-8s3.589-8,8-8c1.633,0,3.152,0.494,4.42,1.338l1.431-1.431C16.203,2.713,14.185,2,12,2C6.486,2,2,6.486,2,12s4.486,10,10,10s10-4.486,10-10c0-1.126-0.196-2.206-0.541-3.217L19.839,10.403z" />
    <path stroke="${color}" d="M22 4L11 15 7 11" />
  </svg>
  `
}

export function getViewHistoryIcon(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="view-history-svg" width=${width} height=${height} fill="${color}" viewBox="0 0 22 22">
  <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
  </svg>
  `
}

export function getResultCardTemplate(iconColor) {
  return `
  <div id="gptxCardHeader">
  <span id="gptxLoadingPara">Loading results from ChatGPT...</span>
  <span id="gptxTimePara"></span>
</div>
<div id="gptxCardBody">
  <div id="gptxResponseBody" class="markdown-body" dir="auto"></div>
</div>
<div id="gptxCardFooter">
  <div class="btn gptxFooterBtns" id="gptxFooterNewTabBtn">
    ${getNewTabIconSvg('1.2em', '1.2em', iconColor)}
  </div>
  <div class="btn gptxFooterBtns" id="gptxFooterCopyBtn">
    ${getCopyIconSvg('1.2em', '1.2em', iconColor)}
  </div>
  <div class="btn gptxFooterBtns" id="gptxFooterRefreshBtn">
    ${getRefreshIconSvg('1.2em', '1.2em', iconColor)}
  </div>
</div>
  `
}

export function getQADivContentTemplate(question, answer) {
  return `
  <div class="gptx-qa-checkbox">
    <input type="checkbox" class="gptx-qa-checkbox-input" data-key="${question}">
  </div>
  <button class="gptx-accordion-button" type="button">
    ${question}
  </button>
  <div class="gptx-accordion-body">
    ${answer}
  </div>
  `
}

export function getNoHistoryTemplate() {
  return `
  <div class="gptx-empty-history">
    Your ChatGPT history is currently empty.
  </div>
  `
}
