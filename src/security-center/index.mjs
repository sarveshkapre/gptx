import Browser from 'webextension-polyfill'

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
  reports: document.getElementById('gptx-sec-reports'),
  copyReports: document.getElementById('gptx-sec-copy-reports'),
  clearReports: document.getElementById('gptx-sec-clear-reports'),
  events: document.getElementById('gptx-sec-events'),
  copyEvents: document.getElementById('gptx-sec-copy-events'),
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
  const allowlist = stored.gptxSecurityAllowlist || []
  const blocklist = stored.gptxSecurityBlocklist || []

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
    await Browser.storage.local.set({
      gptxSecurityEnabled: elements.enabled.checked,
      gptxSecuritySettings: newSettings,
      gptxSecurityAllowlist: parseList(elements.allowlist.value),
      gptxSecurityBlocklist: parseList(elements.blocklist.value),
    })
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
  })

  elements.clearReports.addEventListener('click', async () => {
    await Browser.storage.local.set({ gptxSecurityReports: [] })
    renderReports([])
  })

  elements.copyEvents.addEventListener('click', async () => {
    const latest = await Browser.storage.local.get('gptxSecurityEvents')
    await navigator.clipboard.writeText(
      JSON.stringify(latest.gptxSecurityEvents || [], null, 2),
    )
  })

  elements.clearEvents.addEventListener('click', async () => {
    await Browser.storage.local.set({ gptxSecurityEvents: [] })
    renderEvents([])
  })
}

function parseList(text) {
  return text
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean)
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
    div.innerHTML = `
      <div class="gptx-sec-report-title">${report.domain || report.url}</div>
      <div class="gptx-sec-report-meta">${report.level || 'review'} · ${time}</div>
      <div>${report.url}</div>
      <div>${(report.reasons || []).join(' · ')}</div>
    `
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
    div.innerHTML = `
      <div class="gptx-sec-report-title">${event.action || event.type}</div>
      <div class="gptx-sec-report-meta">${event.level || 'review'} · ${time}</div>
      <div>${event.url || ''}</div>
      <div>${event.domain || ''}</div>
    `
    elements.events.appendChild(div)
  })
}
