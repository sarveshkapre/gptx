import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCacheKey,
  getHistoryKeys,
  getRenderableEntries,
  normalizeEntry,
} from '../src/utils/history-utils.mjs'
import { escapeAttribute, escapeHtml } from '../src/utils/safe-html.mjs'
import {
  applyUrlSafety,
  assessDomainRisk,
  getRiskLevel,
  getTrackingParams,
  stripTrackingParams,
} from '../src/utils/security-utils.mjs'

test('buildCacheKey uses question, mode, and format', () => {
  const key = buildCacheKey('best running shoes', { mode: 'summary', format: 'bullets' })
  assert.equal(key, 'gptx:best running shoes::summary::bullets')
})

test('normalizeEntry handles legacy and modern history entries', () => {
  const legacy = normalizeEntry('query key', 'legacy answer')
  assert.equal(legacy.question, 'query key')
  assert.equal(legacy.mode, 'legacy')

  const modern = normalizeEntry('query key', {
    question: 'custom question',
    answer: 'modern answer',
    mode: 'deep',
    format: 'table',
    createdAt: 1700000000000,
  })
  assert.equal(modern.question, 'custom question')
  assert.equal(modern.mode, 'deep')
  assert.equal(modern.format, 'table')
})

test('getRenderableEntries/getHistoryKeys ignore settings keys and sort newest first', () => {
  const data = {
    gptxExtensionEnabled: true,
    'gptx:a::summary::bullets': {
      question: 'a',
      answer: 'A',
      mode: 'summary',
      format: 'bullets',
      createdAt: 1,
    },
    'gptx:b::summary::bullets': {
      question: 'b',
      answer: 'B',
      mode: 'summary',
      format: 'bullets',
      createdAt: 2,
    },
  }

  const entries = getRenderableEntries(data)
  assert.equal(entries.length, 2)
  assert.equal(entries[0].question, 'b')
  assert.deepEqual(getHistoryKeys(data), ['gptx:b::summary::bullets', 'gptx:a::summary::bullets'])
})

test('escape helpers encode HTML-special characters for text and attributes', () => {
  const input = `"><img src=x onerror=alert('xss')>`
  const escapedHtml = escapeHtml(input)
  const escapedAttr = escapeAttribute(input)

  assert.ok(!escapedHtml.includes('<img'))
  assert.ok(!escapedAttr.includes('<img'))
  assert.ok(escapedAttr.includes('&quot;'))
})

test('tracking param detection and stripping work with mixed params', () => {
  const url = 'http://example.com/page?utm_source=google&foo=bar&gclid=abc'
  const tracking = getTrackingParams(url)
  assert.deepEqual(tracking.sort(), ['gclid', 'utm_source'])

  const stripped = stripTrackingParams(url)
  assert.equal(stripped.removed.length, 2)
  assert.ok(stripped.url.includes('foo=bar'))
  assert.ok(!stripped.url.includes('utm_source'))
})

test('applyUrlSafety upgrades HTTP and strips tracking params', () => {
  const result = applyUrlSafety('http://example.com/?fbclid=1&ok=1', {
    stripTracking: true,
    upgradeHttps: true,
  })

  assert.equal(result.finalUrl.startsWith('https://'), true)
  assert.deepEqual(result.removedParams, ['fbclid'])
  assert.equal(result.upgraded, true)
})

test('assessDomainRisk respects blocklist and risk thresholds', () => {
  const blocked = assessDomainRisk('bad-site.xyz', 'login bank account', [], ['bad-site.xyz'])
  assert.equal(blocked.blocklisted, true)
  assert.equal(getRiskLevel(blocked.score), 'high')

  const suspicious = assessDomainRisk('paypa1-login.xyz', 'paypal login', [], [])
  assert.equal(['review', 'high'].includes(getRiskLevel(suspicious.score)), true)
  assert.equal(suspicious.reasons.length > 0, true)
})
