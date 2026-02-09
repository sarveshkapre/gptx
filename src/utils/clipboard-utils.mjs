export async function copyText(text) {
  const value = String(text ?? '')
  if (!value) return false

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall through to the DOM-based copy path.
    }
  }

  // Fallback for contexts where Clipboard API isn't available.
  // Requires a DOM (content script / extension page).
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.left = '-1000px'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    textarea.remove()
    return Boolean(ok)
  } catch {
    return false
  }
}

