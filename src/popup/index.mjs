import { getViewHistoryIcon } from '../constants/template-strings.mjs'
import Browser from 'webextension-polyfill'

main()

async function main() {
  // get extension enabled value from local storage to mark checkbox initially
  let isEnabledObj = await Browser.storage.local.get('gptxExtensionEnabled')
  let isEnabled
  if (Object.keys(isEnabledObj).length === 0) {
    // first time, enabled key is not set in local storage. So enabling extension by default
    await Browser.storage.local.set({
      gptxExtensionEnabled: true,
    })
    isEnabled = true
  } else {
    isEnabled = isEnabledObj.gptxExtensionEnabled
  }

  // setting UI and event listener for View History Button
  const gptxViewHistoryBtn = document.getElementById('gptx-view-history')
  gptxViewHistoryBtn.innerHTML = getViewHistoryIcon('1.6em', '1.6em', 'black')
  gptxViewHistoryBtn.addEventListener('click', () => {
    Browser.tabs.create({
      url: 'view-history.html',
    })
  })

  // setting previous extension enabled value and event listener for enable extension switch
  const gptxExtensionStatusCheck = document.getElementById('gptx-enable-extension-switch')
  gptxExtensionStatusCheck.checked = isEnabled
  const gptxExtensionStatusCheckLabel = document.getElementById('gptx-enable-extension-label')
  gptxExtensionStatusCheckLabel.innerHTML = isEnabled ? 'Pause GPTx' : 'Unpause GPTx'
  gptxExtensionStatusCheck.addEventListener('change', function () {
    if (this.checked) {
      // Enable the extension
      Browser.storage.local
        .set({
          gptxExtensionEnabled: true,
        })
        .then(() => {
          gptxExtensionStatusCheckLabel.innerHTML = 'Pause GPTx'
          console.log('gptx extension enabled')
        })
    } else {
      // Disable the extension
      Browser.storage.local
        .set({
          gptxExtensionEnabled: false,
        })
        .then(() => {
          gptxExtensionStatusCheckLabel.innerHTML = 'Unpause GPTx'
          console.log('gptx extension disabled')
        })
    }
  })
}
