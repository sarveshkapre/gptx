import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { fetchSSE } from './fetch-sse.mjs'

const GPTX_ACCESS_TOKEN_STORAGE_NAME = 'gptxAccessToken'

async function getAccessToken() {
  const cachedToken = await Browser.storage.local.get(GPTX_ACCESS_TOKEN_STORAGE_NAME)
  if (Object.keys(cachedToken).length > 0) {
    console.log('GPTX: cached token used')
    return cachedToken[GPTX_ACCESS_TOKEN_STORAGE_NAME]
  }
  const resp = await fetch('https://chat.openai.com/api/auth/session')
    .then((r) => r.json())
    .catch(() => ({}))
  if (!resp.accessToken) {
    throw new Error('UNAUTHORIZED')
  }
  Browser.storage.local
    .set({
      [GPTX_ACCESS_TOKEN_STORAGE_NAME]: resp.accessToken,
    })
    .then(() => {
      console.log('GPTX: fetched token saved')
    })
  return resp.accessToken
}

async function getAnswer(question, callback) {
  const accessToken = await getAccessToken()
  await fetchSSE('https://chat.openai.com/backend-api/conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'next',
      messages: [
        {
          id: uuidv4(),
          role: 'user',
          content: {
            content_type: 'text',
            parts: [question],
          },
        },
      ],
      model: 'text-davinci-002-render',
      parent_message_id: uuidv4(),
    }),
    onMessage(message) {
      console.debug('GPTX: sse message', message)
      if (message === '[DONE]') {
        callback('CHAT_GPTX_ANSWER_END')
        return
      }
      const data = JSON.parse(message)
      const text = data.message?.content?.parts?.[0]
      if (text) {
        callback(text)
      }
    },
  })
}

let questionToNewTab
Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    console.log('GPTX: received msg', msg)
    if (msg.GPTX_CREATE_NEW_TAB) {
      Browser.tabs.create({
        url: 'newTab.html',
      })
      questionToNewTab = msg.GPTX_CREATE_NEW_TAB
    } else {
      try {
        await getAnswer(msg.question, (answer) => {
          port.postMessage({ answer })
        })
      } catch (err) {
        console.error(err)
        port.postMessage({ error: err.message })
        Browser.storage.local.remove(GPTX_ACCESS_TOKEN_STORAGE_NAME).then(() => {
          console.log('GPTX: cached token removed')
        })
      }
    }
  })
})

Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getQuestion') {
    sendResponse({ question: questionToNewTab })
  }
})
