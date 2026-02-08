import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { fetchSSE } from './fetch-sse.mjs'
import ExpiryMap from 'expiry-map'

const KEY_ACCESS_TOKEN = 'accessToken'
const SESSION_ENDPOINTS = [
  'https://chatgpt.com/api/auth/session',
  'https://chat.openai.com/api/auth/session',
]
const CONVERSATION_ENDPOINTS = [
  'https://chatgpt.com/backend-api/conversation',
  'https://chat.openai.com/backend-api/conversation',
]
const cache = new ExpiryMap(10 * 1000)

async function getAccessToken() {
  if (cache.get(KEY_ACCESS_TOKEN)) {
    return cache.get(KEY_ACCESS_TOKEN)
  }
  for (const endpoint of SESSION_ENDPOINTS) {
    const resp = await fetch(endpoint, { credentials: 'include' })
      .then((r) => r.json())
      .catch(() => ({}))
    if (resp.accessToken) {
      cache.set(KEY_ACCESS_TOKEN, resp.accessToken)
      return resp.accessToken
    }
  }
  throw new Error('UNAUTHORIZED')
}

async function getChatGPTResult(port, question) {
  const accessToken = await getAccessToken()
  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    controller.abort()
  })

  let lastError = null
  for (const endpoint of CONVERSATION_ENDPOINTS) {
    try {
      await fetchSSE(endpoint, {
        method: 'POST',
        signal: controller.signal,
        credentials: 'include',
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
          if (message === '[DONE]') {
            port.postMessage({ answer: 'CHAT_GPTX_ANSWER_END' })
            return
          }
          let data
          try {
            data = JSON.parse(message)
          } catch {
            return
          }
          const text = data.message?.content?.parts?.[0]
          if (text) {
            port.postMessage({ answer: text })
          }
        },
      })
      return
    } catch (error) {
      if (isAbortError(error)) {
        throw error
      }
      lastError = error
    }
  }

  if (lastError?.message === 'HTTP_401' || lastError?.message === 'HTTP_403') {
    throw new Error('UNAUTHORIZED')
  }
  throw lastError || new Error('UNAUTHORIZED')
}

function isAbortError(error) {
  return error instanceof DOMException && error.name === 'AbortError'
}

let questionToNewTab
Browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (msg) => {
    if (msg.GPTX_CREATE_NEW_TAB) {
      Browser.tabs.create({
        url: 'new-tab.html',
      })
      questionToNewTab = msg.GPTX_CREATE_NEW_TAB
    } else {
      try {
        await getChatGPTResult(port, msg.question)
      } catch (err) {
        if (!isAbortError(err)) {
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
    sendResponse({ cacheKey: questionToNewTab })
  }
})
