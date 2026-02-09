import fs from 'node:fs/promises'
import path from 'node:path'

function collectManifestRefs(manifest) {
  const refs = new Set()

  const addRef = (ref) => {
    if (!ref || typeof ref !== 'string') return
    refs.add(ref)
  }

  addRef(manifest?.action?.default_popup)
  addRef(manifest?.background?.service_worker)

  for (const icon of Object.values(manifest?.icons || {})) {
    addRef(icon)
  }

  for (const cs of manifest?.content_scripts || []) {
    for (const js of cs.js || []) addRef(js)
    for (const css of cs.css || []) addRef(css)
  }

  // Not currently used by GPTx, but cheap to validate if added later.
  for (const war of manifest?.web_accessible_resources || []) {
    for (const resource of war?.resources || []) addRef(resource)
  }

  return refs
}

function isSafeManifestPath(ref) {
  // Chrome extension manifest paths should be package-relative.
  if (ref.startsWith('http://') || ref.startsWith('https://')) return false
  if (ref.startsWith('/') || ref.startsWith('\\')) return false
  if (ref.includes('..')) return false
  return true
}

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  const buildDir = process.argv[2] || 'build/chromium'
  const manifestPath = path.join(buildDir, 'manifest.json')
  const manifestRaw = await fs.readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(manifestRaw)

  const refs = collectManifestRefs(manifest)
  const invalid = []
  const missing = []

  for (const ref of refs) {
    if (!isSafeManifestPath(ref)) {
      invalid.push(ref)
      continue
    }

    const fullPath = path.join(buildDir, ref)
    if (!(await fileExists(fullPath))) {
      missing.push(ref)
    }
  }

  if (invalid.length || missing.length) {
    if (invalid.length) {
      console.error('Invalid manifest paths (must be extension-relative):')
      for (const ref of invalid) console.error(`- ${ref}`)
    }
    if (missing.length) {
      console.error('Missing files referenced by manifest:')
      for (const ref of missing) console.error(`- ${ref}`)
    }
    process.exit(1)
  }

  console.log(`OK: validated ${refs.size} manifest references under ${buildDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

