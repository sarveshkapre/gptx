import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { fetchSSE } from './fetch-sse.mjs'
import ExpiryMap from 'expiry-map'

const KEY_ACCESS_TOKEN = 'accessToken'
const cache = new ExpiryMap(10 * 1000)

async function getAccessToken() {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }
  const resp = await fetch('https://chat.openai.com/api/auth/session')
    .then((r) => r.json())
    .catch(() => ({}))
  if (!resp.accessToken) {
    throw new Error('UNAUTHORIZED')
  }
  cache.set(KEY_ACCESS_TOKEN, resp.accessToken)
  return resp.accessToken
}

async function getChatGPTResult(port, question) {
  const accessToken = await getAccessToken()

  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    controller.abort()
  })

  await fetchSSE('https://chat.openai.com/backend-api/conversation', {
    method: 'POST',
    signal: controller.signal,
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
        port.postMessage({ answer: 'CHAT_GPTX_ANSWER_END' })
        return
      }
      const data = JSON.parse(message)
      const text = data.message?.content?.parts?.[0]
      if (text) {
        port.postMessage({ answer: text })
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
        url: 'new-tab.html',
      })
      questionToNewTab = msg.GPTX_CREATE_NEW_TAB
    } else {
      try {
        await getChatGPTResult(port, msg.question)
      } catch (err) {
        if (!(err instanceof DOMException && err.message === 'The user aborted a request.')) {
          console.error(err)
          port.postMessage({ error: err.message })
        }
        cache.delete(KEY_ACCESS_TOKEN)
      }
    }
  })
})

Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getQuestion') {
    sendResponse({ question: questionToNewTab })
  }
})
