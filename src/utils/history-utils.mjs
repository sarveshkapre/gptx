export const DEFAULT_HISTORY_IGNORE_KEYS = new Set([
  'gptxExtensionEnabled',
  'gptxPreferences',
  'gptxSecurityEnabled',
  'gptxSecurityAllowlist',
  'gptxSecurityBlocklist',
  'gptxSecuritySettings',
  'gptxSecurityReports',
  'gptxSecurityEvents',
])

export function buildCacheKey(question, preferences) {
  return `gptx:${question}::${preferences.mode}::${preferences.format}`
}

export function normalizeEntry(key, value) {
  if (!value) return null
  if (typeof value === 'string') {
    return {
      question: key,
      answer: value,
      mode: 'legacy',
      format: 'legacy',
      createdAt: null,
    }
  }
  if (typeof value === 'object' && value.answer) {
    return {
      question: value.question || key,
      answer: value.answer,
      mode: value.mode,
      format: value.format,
      createdAt: value.createdAt,
    }
  }
  return null
}

export function capitalize(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function formatEntryMeta(entry) {
  const parts = []
  if (entry.mode && entry.mode !== 'legacy') {
    parts.push(capitalize(entry.mode))
  }
  if (entry.format && entry.format !== 'legacy') {
    parts.push(capitalize(entry.format))
  }
  if (entry.createdAt) {
    parts.push(new Date(entry.createdAt).toLocaleString())
  }
  return parts.join(' · ')
}

export function getRenderableEntries(cachedData, keysToIgnore = DEFAULT_HISTORY_IGNORE_KEYS) {
  return Object.entries(cachedData)
    .filter(([key]) => !keysToIgnore.has(key))
    .map(([storageKey, value]) => {
      const entry = normalizeEntry(storageKey, value)
      if (!entry) return null
      return {
        storageKey,
        ...entry,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function getHistoryKeys(cachedData, keysToIgnore = DEFAULT_HISTORY_IGNORE_KEYS) {
  return getRenderableEntries(cachedData, keysToIgnore).map((entry) => entry.storageKey)
}
