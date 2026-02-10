import { v4 as uuidv4 } from 'uuid'
import Browser from 'webextension-polyfill'
import { fetchSSE } from './fetch-sse.mjs'
import ExpiryMap from 'expiry-map'

const KEY_ACCESS_TOKEN = 'accessToken'
const KEY_OPENAI_SETTINGS = 'openaiSettings'
const SESSION_ENDPOINTS = [
  'https://chatgpt.com/api/auth/session',
  'https://chat.openai.com/api/auth/session',
]
const CONVERSATION_ENDPOINTS = [
  'https://chatgpt.com/backend-api/conversation',
  'https://chat.openai.com/backend-api/conversation',
]
const cache = new ExpiryMap(10 * 1000)

async function getOpenAISettings() {
  if (cache.get(KEY_OPENAI_SETTINGS)) return cache.get(KEY_OPENAI_SETTINGS)
  const stored = await Browser.storage.local.get(['gptxOpenAIApiKey', 'gptxOpenAIModel'])
  const settings = {
    apiKey: stored.gptxOpenAIApiKey ? String(stored.gptxOpenAIApiKey).trim() : null,
    model: stored.gptxOpenAIModel ? String(stored.gptxOpenAIModel).trim() : 'gpt-4.1',
  }
  cache.set(KEY_OPENAI_SETTINGS, settings)
  return settings
}

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

function parseHttpStatusFromErrorMessage(message) {
  if (typeof message !== 'string') return null
  if (!message.startsWith('HTTP_')) return null
  const code = Number(message.slice('HTTP_'.length))
  return Number.isFinite(code) ? code : null
}

async function getOpenAIResult(port, prompt) {
  const { apiKey, model } = await getOpenAISettings()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING')
  }

  const controller = new AbortController()
  port.onDisconnect.addListener(() => {
    controller.abort()
  })

  let outputText = ''
  let completed = false

  try {
    await fetchSSE('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4.1',
        input: prompt,
        stream: true,
        // Prefer privacy-by-default for an extension: don't store responses server-side.
        store: false,
      }),
      onMessage(message) {
        if (completed) return
        let data
        try {
          data = JSON.parse(message)
        } catch {
          return
        }

        if (data.type === 'response.output_text.delta' && typeof data.delta === 'string') {
          outputText += data.delta
          port.postMessage({ answer: outputText })
          return
        }

        if (data.type === 'response.output_text.done' && typeof data.text === 'string') {
          outputText = data.text
          port.postMessage({ answer: outputText })
          return
        }

        if (data.type === 'response.completed') {
          completed = true
          port.postMessage({ answer: 'CHAT_GPTX_ANSWER_END' })
        }

        if (data.type === 'response.failed' || data.type === 'error') {
          completed = true
          const messageText =
            data?.error?.message || data?.response?.error?.message || 'OpenAI API error'
          port.postMessage({ error: `OPENAI_ERROR:${messageText}` })
        }
      },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    const status = parseHttpStatusFromErrorMessage(error?.message)
    if (status === 401 || status === 403) throw new Error('OPENAI_UNAUTHORIZED')
    if (status === 429) throw new Error('OPENAI_RATE_LIMIT')
    throw new Error('OPENAI_ERROR')
  }
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

async function getBestAvailableResult(port, prompt) {
  const { apiKey } = await getOpenAISettings()
  if (apiKey) {
    return getOpenAIResult(port, prompt)
  }
  return getChatGPTResult(port, prompt)
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
        await getBestAvailableResult(port, msg.question)
      } catch (err) {
        if (isAbortError(err)) return
        console.error(err)
        port.postMessage({ error: err.message })
        cache.delete(KEY_ACCESS_TOKEN)
      }
    }
  })
})

Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'createNewTab' && message.cacheKey) {
    Browser.tabs.create({
      url: 'new-tab.html',
    })
    questionToNewTab = message.cacheKey
    return
  }
  if (message.action === 'getQuestion') {
    sendResponse({ cacheKey: questionToNewTab })
  }
})
