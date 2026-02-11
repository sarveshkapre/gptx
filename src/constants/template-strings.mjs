export function getRefreshIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="refresh-icon-svg" width=${width} height=${height} viewBox="0 0 16 16" fill="${color}" class="bi bi-arrow-clockwise" xmlns="http://www.w3.org/2000/svg">
    <path fill-rule="evenodd" d="M3.17 6.706a5 5 0 0 1 7.103-3.16.5.5 0 1 0 .454-.892A6 6 0 1 0 13.455 5.5a.5.5 0 0 0-.91.417 5 5 0 1 1-9.375.789z"/>
    <path fill-rule="evenodd" d="M8.147.146a.5.5 0 0 1 .707 0l2.5 2.5a.5.5 0 0 1 0 .708l-2.5 2.5a.5.5 0 1 1-.707-.708L10.293 3 8.147.854a.5.5 0 0 1 0-.708z"/>
  </svg>
`
}

export function getCopyIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="copy-icon-svg" width=${width} height=${height} fill="${color}" viewBox="0 0 25 25">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
  `
}

export function getMarkdownIconSvg(width = '1em', height = '1em', color = 'red') {
  // Simple "M" glyph for Markdown; used as a visual distinguisher from regular copy.
  return `
  <svg id="markdown-icon-svg" width=${width} height=${height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18V6h2.8l3.2 5.2L15.2 6H18v12h-2V9.6l-3.2 5.1h-1.6L8 9.6V18H6z" fill="${color}"/>
  </svg>
  `
}

export function getStopIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="stop-icon-svg" width=${width} height=${height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="${color}"/>
  </svg>
  `
}
export function getClearCacheIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="clear-cache-icon-svg" width=${width} height=${height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 7h8M10 11v6M14 11v6M5 7h14M7 7l1 12h8l1-12M9 7V5h6v2" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  `
}
export function getNewTabIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg id="new-tab-svg" width=${width} height=${height} fill="${color}" viewBox="0 0 44 44"  xmlns="http://www.w3.org/2000/svg">
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

export function getReportIconSvg(width = '1em', height = '1em', color = 'red') {
  return `
  <svg width=${width} height=${height} fill="${color}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 3h2v18H4V3zm4 1h10.5l-.9 3H21v10h-9.9l.9-3H8V4z" />
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
  <div id="gptx-card-header">
    <div class="gptx-header-row">
      <div class="gptx-brand">GPTx</div>
      <div class="gptx-status">
        <span id="gptx-loading-para">Ready</span>
        <span id="gptx-time-para"></span>
      </div>
    </div>
    <div class="gptx-controls">
      <div class="gptx-control-group">
        <span class="gptx-control-label">Mode</span>
        <div class="gptx-chip-group" role="group" aria-label="Answer mode">
          <button class="gptx-chip" data-gptx-mode="summary">Summary</button>
          <button class="gptx-chip" data-gptx-mode="balanced">Balanced</button>
          <button class="gptx-chip" data-gptx-mode="deep">Deep</button>
        </div>
      </div>
      <div class="gptx-control-group">
        <span class="gptx-control-label">Format</span>
        <div class="gptx-chip-group" role="group" aria-label="Answer format">
          <button class="gptx-chip" data-gptx-format="bullets">Bullets</button>
          <button class="gptx-chip" data-gptx-format="steps">Steps</button>
          <button class="gptx-chip" data-gptx-format="table">Table</button>
        </div>
      </div>
      <div class="gptx-control-group">
        <span class="gptx-control-label">Citations</span>
        <div class="gptx-chip-group" role="group" aria-label="Citations mode">
          <button class="gptx-chip" data-gptx-citations="off">Off</button>
          <button class="gptx-chip" data-gptx-citations="on">On</button>
        </div>
      </div>
    </div>
    <div id="gptx-security-banner" class="gptx-security-banner"></div>
  </div>
  <div id="gptx-card-body">
    <div id="gptx-question" class="gptx-question"></div>
    <div id="gptx-response-body" class="markdown-body" dir="auto"></div>
  </div>
  <div id="gptx-followup" class="gptx-followup">
    <div class="gptx-followup-label">Ask a follow-up</div>
    <div class="gptx-followup-row">
      <textarea id="gptx-followup-input" rows="1" placeholder="Refine the answer (press / to focus)"></textarea>
      <button class="btn gptx-followup-btn" id="gptx-followup-btn">Ask</button>
    </div>
    <div class="gptx-followup-hint">Tip: / to focus • Enter to ask • Shift+Enter for new line</div>
  </div>
  <div id="gptx-card-footer">
    <div class="btn gptx-footer-btns" id="gptx-footer-report-btn">
      ${getReportIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text">Report</span>
    </div>
    <div class="btn gptx-footer-btns" id="gptx-footer-new-tab-btn">
      ${getNewTabIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text">Open in new tab</span>
    </div>
    <div class="btn gptx-footer-btns" id="gptx-footer-copy-btn">
      ${getCopyIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text" id="gptx-tooltip-copy-text">Copy</span>
    </div>
    <div class="btn gptx-footer-btns is-markdown" id="gptx-footer-copy-md-btn">
      ${getMarkdownIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text" id="gptx-tooltip-copy-md-text">Copy Markdown</span>
    </div>
    <div class="btn gptx-footer-btns is-hidden" id="gptx-footer-stop-btn">
      ${getStopIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text">Stop</span>
    </div>
    <div class="btn gptx-footer-btns" id="gptx-footer-clear-cache-btn">
      ${getClearCacheIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text">Clear cache</span>
    </div>
    <div class="btn gptx-footer-btns" id="gptx-footer-refresh-btn">
      ${getRefreshIconSvg('1.2em', '1.2em', iconColor)}
      <span class="gptx-tooltip-text">Regenerate</span>
    </div>
  </div>
  `
}

export function getQADivContentTemplate(storageKey, question, answer, meta = '') {
  const safeStorageKey = escapeAttribute(storageKey)
  const safeQuestion = escapeHtml(question)
  const safeMeta = escapeHtml(meta)
  return `
  <div class="gptx-qa-checkbox">
    <input type="checkbox" class="gptx-qa-checkbox-input" data-key="${safeStorageKey}">
  </div>
  <button class="gptx-accordion-button" type="button">
    ${safeQuestion}
  </button>
  ${safeMeta ? `<div class="gptx-qa-meta">${safeMeta}</div>` : ''}
  <div class="gptx-accordion-body markdown-body">
    ${answer}
  </div>
  `
}

export function getNoHistoryTemplate() {
  return `
  <div class="gptx-empty-history">
    <div class="gptx-empty-title">No GPTx history yet</div>
    <div class="gptx-empty-subtitle">Search on Google to generate answers.</div>
  </div>
  `
}
import { escapeAttribute, escapeHtml } from '../utils/safe-html.mjs'
