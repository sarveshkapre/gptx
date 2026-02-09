export const DEFAULT_SECURITY_ANALYSIS_CONFIG = {
  suspiciousTlds: ['zip', 'mov', 'xyz', 'top', 'gq', 'cam', 'work', 'support', 'click', 'rest'],
  brands: [
    'google',
    'apple',
    'microsoft',
    'amazon',
    'paypal',
    'netflix',
    'github',
    'linkedin',
    'facebook',
    'instagram',
    'twitter',
    'x',
    'openai',
    'coinbase',
    'binance',
    'chase',
    'bankofamerica',
    'wellsfargo',
    'citibank',
  ],
  sensitiveKeywords: [
    'login',
    'signin',
    'sign in',
    'password',
    'verify',
    'bank',
    'wallet',
    'crypto',
    'payment',
    'checkout',
  ],
  multiPartTlds: ['co.uk', 'org.uk', 'ac.uk', 'co.jp', 'com.au', 'net.au'],
}

export const TRACKING_PARAM_PREFIXES = ['utm_', 'pk_', 'ga_', 'fb_', 'ig_', 'mc_', 'vero_', 'yclid']
export const TRACKING_PARAMS = [
  'gclid',
  'fbclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'dclid',
  'gbraid',
  'wbraid',
  'ref',
  'ref_src',
  'spm',
  'srsltid',
  'si',
  'cid',
]

export function normalizeDomain(domain = '') {
  return domain.trim().replace(/\.$/, '').replace(/^www\./, '').toLowerCase()
}

function isValidHostname(hostname) {
  if (!hostname) return false
  if (hostname === 'localhost') return true
  // IPv4 (basic)
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return true
  if (hostname.length > 253) return false
  if (hostname.includes('..')) return false
  // Labels: 1-63 chars, alnum + hyphen, not starting/ending with hyphen.
  const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
  const hostRe = new RegExp(`^(?:${label})(?:\\.(?:${label}))*$`)
  return hostRe.test(hostname)
}

export function normalizeDomainEntry(input) {
  if (typeof input !== 'string') return null
  let value = input.trim()
  if (!value) return null
  if (value.startsWith('#')) return null

  // Accept domains or full URLs. Strip scheme, userinfo, path, query, and fragment.
  value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
  value = value.replace(/^\/\//, '')
  value = value.split(/[/?#]/)[0] || ''
  value = value.split('@').pop() || ''

  // Strip port (IPv6 not supported in this UI).
  value = value.replace(/:\d+$/, '')

  // Handle common wildcard / dot-prefix patterns.
  value = value.replace(/^\*\./, '').replace(/^\./, '')

  const normalized = normalizeDomain(value)
  if (!normalized) return null
  if (!isValidHostname(normalized)) return null
  return normalized
}

export function normalizeDomainList(entries = []) {
  const domains = []
  const invalid = []
  const seen = new Set()
  for (const entry of Array.isArray(entries) ? entries : []) {
    const normalized = normalizeDomainEntry(entry)
    if (!normalized) {
      if (typeof entry === 'string' && entry.trim()) invalid.push(entry.trim())
      continue
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    domains.push(normalized)
  }
  return { domains, invalid }
}

export function getRootDomain(hostname, config = DEFAULT_SECURITY_ANALYSIS_CONFIG) {
  const normalized = normalizeDomain(hostname)
  const parts = normalized.split('.')
  if (parts.length <= 2) return normalized
  const lastTwo = parts.slice(-2).join('.')
  const lastThree = parts.slice(-3).join('.')
  if (config.multiPartTlds.includes(lastTwo)) {
    return parts.slice(-3).join('.')
  }
  if (config.multiPartTlds.includes(lastThree)) {
    return parts.slice(-4).join('.')
  }
  return lastTwo
}

export function getSecondLevelDomain(hostname, config = DEFAULT_SECURITY_ANALYSIS_CONFIG) {
  const root = getRootDomain(hostname, config)
  return root.split('.').slice(0, -1).join('.') || root
}

export function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[a.length][b.length]
}

export function getTrackingParams(
  url,
  { trackingParams = TRACKING_PARAMS, trackingPrefixes = TRACKING_PARAM_PREFIXES } = {},
) {
  try {
    const parsed = new URL(url)
    const matches = []
    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase()
      if (
        trackingParams.includes(lowerKey) ||
        trackingPrefixes.some((prefix) => lowerKey.startsWith(prefix))
      ) {
        matches.push(key)
      }
    })
    return matches
  } catch {
    return []
  }
}

export function stripTrackingParams(
  url,
  { trackingParams = TRACKING_PARAMS, trackingPrefixes = TRACKING_PARAM_PREFIXES } = {},
) {
  try {
    const parsed = new URL(url)
    const removed = []
    Array.from(parsed.searchParams.keys()).forEach((key) => {
      const lowerKey = key.toLowerCase()
      if (
        trackingParams.includes(lowerKey) ||
        trackingPrefixes.some((prefix) => lowerKey.startsWith(prefix))
      ) {
        parsed.searchParams.delete(key)
        removed.push(key)
      }
    })
    return { url: parsed.toString(), removed }
  } catch {
    return { url, removed: [] }
  }
}

export function upgradeToHttps(url) {
  if (!url.startsWith('http://')) return { url, upgraded: false }
  return { url: url.replace(/^http:\/\//, 'https://'), upgraded: true }
}

export function isSensitiveUrl(
  url,
  sensitiveKeywords = DEFAULT_SECURITY_ANALYSIS_CONFIG.sensitiveKeywords,
) {
  const lower = url.toLowerCase()
  return sensitiveKeywords.some((keyword) => lower.includes(keyword))
}

export function applyUrlSafety(url, settings, options = {}) {
  let finalUrl = url
  let removedParams = []
  let upgraded = false
  if (settings.stripTracking) {
    const stripped = stripTrackingParams(finalUrl, options)
    finalUrl = stripped.url
    removedParams = stripped.removed
  }
  if (settings.upgradeHttps) {
    const upgradedResult = upgradeToHttps(finalUrl)
    finalUrl = upgradedResult.url
    upgraded = upgradedResult.upgraded
  }
  return { finalUrl, removedParams, upgraded }
}

export function assessDomainRisk(
  hostname,
  query,
  allowlist,
  blocklist,
  config = DEFAULT_SECURITY_ANALYSIS_CONFIG,
) {
  const normalized = normalizeDomain(hostname)
  const rootDomain = getRootDomain(normalized, config)
  if (allowlist.includes(normalized) || allowlist.includes(rootDomain)) {
    return { score: 0, reasons: [], sensitive: false, blocklisted: false, allowlisted: true }
  }
  if (blocklist.includes(normalized) || blocklist.includes(rootDomain)) {
    return {
      score: 10,
      reasons: ['Blocked by your security list'],
      sensitive: true,
      blocklisted: true,
      allowlisted: false,
    }
  }
  const sld = getSecondLevelDomain(normalized, config)
  let score = 0
  const reasons = []
  const tld = normalized.split('.').slice(-1)[0]
  if (normalized.includes('xn--')) {
    score += 3
    reasons.push('Uses punycode (possible lookalike)')
  }
  if (config.suspiciousTlds.includes(tld)) {
    score += 2
    reasons.push(`Unusual TLD (.${tld})`)
  }
  if (sld.includes('-') || /\d/.test(sld)) {
    score += 1
    reasons.push('Contains hyphens or digits')
  }
  config.brands.forEach((brand) => {
    if (sld === brand) return
    if (sld.includes(brand)) {
      score += 2
      reasons.push(`Includes brand name (${brand})`)
      return
    }
    if (levenshtein(sld, brand) <= 1) {
      score += 3
      reasons.push(`Looks like ${brand}`)
    }
  })
  const queryTokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 4)
  queryTokens.forEach((token) => {
    if (token === sld) return
    if (levenshtein(sld, token) <= 1) {
      score += 2
      reasons.push(`Looks similar to "${token}"`)
    }
  })
  const sensitive =
    config.sensitiveKeywords.some((keyword) => query.toLowerCase().includes(keyword)) ||
    config.sensitiveKeywords.some((keyword) => sld.includes(keyword))
  return { score, reasons, sensitive, blocklisted: false, allowlisted: false }
}

export function getRiskLevel(score) {
  if (score >= 5) return 'high'
  if (score >= 3) return 'review'
  return 'low'
}
