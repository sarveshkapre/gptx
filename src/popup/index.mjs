import Browser from 'webextension-polyfill'

const extensionId = Browser.runtime.id
console.log(extensionId)
const gptxExtensionStatusCheck = document.getElementById('gptxExtensionStatusCheck')
const testElem = document.getElementById('test')
gptxExtensionStatusCheck.addEventListener('change', function () {
  if (this.checked) {
    // Enable the extension
    Browser.storage.local
      .set({
        gptxExtensionEnabled: true,
      })
      .then(() => {
        testElem.innerHTML = 'enabled'
      })
  } else {
    // Disable the extension
    Browser.storage.local
      .set({
        gptxExtensionEnabled: false,
      })
      .then(() => {
        testElem.innerHTML = 'disabled'
      })
  }
})
