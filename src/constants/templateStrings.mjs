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
