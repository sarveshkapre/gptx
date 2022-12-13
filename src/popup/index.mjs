import { getViewHistoryIcon } from '../constants/templateStrings.mjs'
import Browser from 'webextension-polyfill'

main()

async function main() {
  let isEnabledObj = await Browser.storage.local.get('gptxExtensionEnabled')
  let isEnabled
  if (Object.keys(isEnabledObj).length === 0) {
    await Browser.storage.local.set({
      gptxExtensionEnabled: true,
    })
    isEnabled = true
  } else {
    isEnabled = isEnabledObj.gptxExtensionEnabled
  }

  const gptxViewHistoryBtn = document.getElementById('gptxViewHistory')
  gptxViewHistoryBtn.innerHTML = getViewHistoryIcon('1.6em', '1.6em', 'black')

  const gptxExtensionStatusCheck = document.getElementById('gptxEnableExtensionSwitch')
  gptxExtensionStatusCheck.checked = isEnabled
  const gptxExtensionStatusCheckLabel = document.getElementById('gptxEnableExtensionLabel')
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
  gptxViewHistoryBtn.addEventListener('click', () => {
    Browser.tabs.create({
      url: 'viewHistory.html',
    })
  })
}
