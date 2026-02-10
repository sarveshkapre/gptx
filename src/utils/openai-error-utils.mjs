function safeLower(s) {
  return typeof s === 'string' ? s.toLowerCase() : ''
}

export function parseHttpErrorFromMessage(message) {
  if (typeof message !== 'string') return { status: null, bodyText: null }
  if (!message.startsWith('HTTP_')) return { status: null, bodyText: null }

  const rest = message.slice('HTTP_'.length)
  const match = rest.match(/^(\d{3})(?::([\s\S]*))?$/)
  if (!match) return { status: null, bodyText: null }

  const status = Number(match[1])
  if (!Number.isFinite(status)) return { status: null, bodyText: null }

  const bodyText = match[2] ? String(match[2]) : null
  return { status, bodyText }
}

export function parseHttpStatusFromErrorMessage(message) {
  // Back-compat helper for older call sites.
  return parseHttpErrorFromMessage(message).status
}

export function extractOpenAIErrorDetails(bodyText) {
  if (typeof bodyText !== 'string' || !bodyText.trim()) return null
  const trimmed = bodyText.trim()

  // OpenAI typically returns JSON like: { error: { message, type, code, ... } }
  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed)
      const err = json?.error || json?.response?.error || json?.data?.error
      if (err && (err.message || err.type || err.code)) {
        return {
          message: typeof err.message === 'string' ? err.message : null,
          type: typeof err.type === 'string' ? err.type : null,
          code: typeof err.code === 'string' ? err.code : null,
        }
      }
    } catch {
      // ignore
    }
  }

  return null
}

export function classifyOpenAIError({ status, bodyText, messageText }) {
  const details = extractOpenAIErrorDetails(bodyText)
  const combined =
    safeLower(details?.message) + '\n' + safeLower(details?.type) + '\n' + safeLower(details?.code) + '\n' + safeLower(messageText)

  if (status === 401 || status === 403) return 'OPENAI_UNAUTHORIZED'
  if (status === 429) return 'OPENAI_RATE_LIMIT'
  if (status && status >= 500) return 'OPENAI_SERVER_ERROR'

  // Common OpenAI error modes.
  if (combined.includes('model_not_found') || combined.includes('does not exist') || combined.includes('invalid model')) {
    return 'OPENAI_INVALID_MODEL'
  }

  if (
    combined.includes('insufficient_quota') ||
    combined.includes('billing') ||
    combined.includes('hard limit') ||
    combined.includes('exceeded your current quota')
  ) {
    return 'OPENAI_INSUFFICIENT_QUOTA'
  }

  if (status === 400) return 'OPENAI_BAD_REQUEST'
  return 'OPENAI_ERROR'
}

