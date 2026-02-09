import Browser from 'webextension-polyfill'
import { normalizeDomainList } from '../utils/security-utils.mjs'

const DEFAULT_SECURITY_SETTINGS = {
  warnOnRisky: true,
  blockOnHighRisk: false,
  stripTracking: true,
  upgradeHttps: true,
  hideAds: true,
  showBadges: true,
  sensitiveAlerts: true,
}

const elements = {
  enabled: document.getElementById('gptx-sec-enabled'),
  warn: document.getElementById('gptx-sec-warn'),
  block: document.getElementById('gptx-sec-block'),
  strip: document.getElementById('gptx-sec-strip'),
  https: document.getElementById('gptx-sec-https'),
  ads: document.getElementById('gptx-sec-ads'),
  sensitive: document.getElementById('gptx-sec-sensitive'),
  badges: document.getElementById('gptx-sec-badges'),
  allowlist: document.getElementById('gptx-sec-allowlist'),
  blocklist: document.getElementById('gptx-sec-blocklist'),
  save: document.getElementById('gptx-sec-save'),
  status: document.getElementById('gptx-sec-status'),
  reports: document.getElementById('gptx-sec-reports'),
  copyReports: document.getElementById('gptx-sec-copy-reports'),
  downloadReports: document.getElementById('gptx-sec-download-reports'),
  clearReports: document.getElementById('gptx-sec-clear-reports'),
  events: document.getElementById('gptx-sec-events'),
  copyEvents: document.getElementById('gptx-sec-copy-events'),
  downloadEvents: document.getElementById('gptx-sec-download-events'),
  clearEvents: document.getElementById('gptx-sec-clear-events'),
}

main()

async function main() {
  const stored = await Browser.storage.local.get([
    'gptxSecurityEnabled',
    'gptxSecuritySettings',
    'gptxSecurityAllowlist',
    'gptxSecurityBlocklist',
    'gptxSecurityReports',
    'gptxSecurityEvents',
  ])
  const enabled =
    stored.gptxSecurityEnabled === undefined ? true : stored.gptxSecurityEnabled
  const settings = {
    ...DEFAULT_SECURITY_SETTINGS,
    ...(stored.gptxSecuritySettings || {}),
  }
  const allowlistRaw = stored.gptxSecurityAllowlist || []
  const blocklistRaw = stored.gptxSecurityBlocklist || []
  const allowResult = normalizeDomainList(allowlistRaw)
  const blockResult = normalizeDomainList(blocklistRaw)
  const allowlist = allowResult.domains
  const blocklist = blockResult.domains

  elements.enabled.checked = enabled
  elements.warn.checked = settings.warnOnRisky
  elements.block.checked = settings.blockOnHighRisk
  elements.strip.checked = settings.stripTracking
  elements.https.checked = settings.upgradeHttps
  elements.ads.checked = settings.hideAds
  elements.sensitive.checked = settings.sensitiveAlerts
  elements.badges.checked = settings.showBadges
  elements.allowlist.value = allowlist.join('\n')
  elements.blocklist.value = blocklist.join('\n')
  if (JSON.stringify(allowlistRaw) !== JSON.stringify(allowlist)) {
    await Browser.storage.local.set({ gptxSecurityAllowlist: allowlist })
  }
  if (JSON.stringify(blocklistRaw) !== JSON.stringify(blocklist)) {
    await Browser.storage.local.set({ gptxSecurityBlocklist: blocklist })
  }
  if (allowResult.invalid.length || blockResult.invalid.length) {
    setStatus(
      `Removed invalid entries from lists: ${allowResult.invalid.length + blockResult.invalid.length}.`,
    )
  }

  elements.save.addEventListener('click', async () => {
    const newSettings = {
      warnOnRisky: elements.warn.checked,
      blockOnHighRisk: elements.block.checked,
      stripTracking: elements.strip.checked,
      upgradeHttps: elements.https.checked,
      hideAds: elements.ads.checked,
      sensitiveAlerts: elements.sensitive.checked,
      showBadges: elements.badges.checked,
    }

    const allowResult = normalizeDomainList(parseList(elements.allowlist.value))
    const blockResult = normalizeDomainList(parseList(elements.blocklist.value))

    await Browser.storage.local.set({
      gptxSecurityEnabled: elements.enabled.checked,
      gptxSecuritySettings: newSettings,
      gptxSecurityAllowlist: allowResult.domains,
      gptxSecurityBlocklist: blockResult.domains,
    })

    elements.allowlist.value = allowResult.domains.join('\n')
    elements.blocklist.value = blockResult.domains.join('\n')
    const allowInvalid = allowResult.invalid.length
    const blockInvalid = blockResult.invalid.length
    const suffix =
      allowInvalid || blockInvalid
        ? ` Removed invalid entries: ${allowInvalid + blockInvalid}.`
        : ''
    setStatus(
      `Saved. Allowlist: ${allowResult.domains.length}. Blocklist: ${blockResult.domains.length}.${suffix}`,
    )
  })

  const reports = stored.gptxSecurityReports || []
  renderReports(reports)
  const events = stored.gptxSecurityEvents || []
  renderEvents(events)

  elements.copyReports.addEventListener('click', async () => {
    const latest = await Browser.storage.local.get('gptxSecurityReports')
    await navigator.clipboard.writeText(
      JSON.stringify(latest.gptxSecurityReports || [], null, 2),
    )
    setStatus('Reports copied.')
  })

  elements.downloadReports.addEventListener('click', async () => {
    const latest = await Browser.storage.local.get('gptxSecurityReports')
    const reports = latest.gptxSecurityReports || []
    downloadJson(`gptx-security-reports-${getTodayStamp()}.json`, reports)
    setStatus(`Downloaded ${reports.length} report${reports.length === 1 ? '' : 's'}.`)
  })

  elements.clearReports.addEventListener('click', async () => {
    await Browser.storage.local.set({ gptxSecurityReports: [] })
    renderReports([])
    setStatus('Reports cleared.')
  })

  elements.copyEvents.addEventListener('click', async () => {
    const latest = await Browser.storage.local.get('gptxSecurityEvents')
    await navigator.clipboard.writeText(
      JSON.stringify(latest.gptxSecurityEvents || [], null, 2),
    )
    setStatus('Alerts copied.')
  })

  elements.downloadEvents.addEventListener('click', async () => {
    const latest = await Browser.storage.local.get('gptxSecurityEvents')
    const events = latest.gptxSecurityEvents || []
    downloadJson(`gptx-security-alerts-${getTodayStamp()}.json`, events)
    setStatus(`Downloaded ${events.length} alert${events.length === 1 ? '' : 's'}.`)
  })

  elements.clearEvents.addEventListener('click', async () => {
    await Browser.storage.local.set({ gptxSecurityEvents: [] })
    renderEvents([])
    setStatus('Alerts cleared.')
  })
}

function parseList(text) {
  return text
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean)
}

function setStatus(text) {
  if (!elements.status) return
  elements.status.textContent = text
}

function getTodayStamp() {
  const d = new Date()
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function renderReports(reports) {
  elements.reports.innerHTML = ''
  if (!reports.length) {
    elements.reports.innerHTML = '<div class="gptx-empty-history">No reports yet.</div>'
    return
  }
  reports.forEach((report) => {
    const div = document.createElement('div')
    div.className = 'gptx-sec-report'
    const time = report.timestamp ? new Date(report.timestamp).toLocaleString() : 'Unknown time'
    div.appendChild(createTextDiv('gptx-sec-report-title', report.domain || report.url || 'Unknown'))
    div.appendChild(createTextDiv('gptx-sec-report-meta', `${report.level || 'review'} · ${time}`))
    div.appendChild(createTextDiv('', report.url || ''))
    div.appendChild(createTextDiv('', (report.reasons || []).join(' · ')))
    elements.reports.appendChild(div)
  })
}

function renderEvents(events) {
  elements.events.innerHTML = ''
  if (!events.length) {
    elements.events.innerHTML = '<div class="gptx-empty-history">No alerts yet.</div>'
    return
  }
  events.forEach((event) => {
    const div = document.createElement('div')
    div.className = 'gptx-sec-event'
    const time = event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown time'
    div.appendChild(createTextDiv('gptx-sec-report-title', event.action || event.type || 'Unknown'))
    div.appendChild(createTextDiv('gptx-sec-report-meta', `${event.level || 'review'} · ${time}`))
    div.appendChild(createTextDiv('', event.url || ''))
    div.appendChild(createTextDiv('', event.domain || ''))
    elements.events.appendChild(div)
  })
}

function createTextDiv(className, text) {
  const row = document.createElement('div')
  if (className) {
    row.className = className
  }
  row.textContent = text
  return row
}
