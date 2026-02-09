import archiver from 'archiver'
import esbuild from 'esbuild'
import fs, { promises as fsPromises } from 'fs'

const outdir = 'build'
const BOOTSTRAP_SOURCEMAP_RE = /\/\*#\s*sourceMappingURL=bootstrap\.min\.css\.map\s*\*\//g

async function deleteOldDir() {
  await fsPromises.rm(outdir, { recursive: true, force: true })
}

async function runEsbuild() {
  await esbuild.build({
    entryPoints: [
      'src/new-tab/index.mjs',
      'src/popup/index.mjs',
      'src/content-script/index.mjs',
      'src/background/index.mjs',
      'src/chatgpt-script/index.mjs',
      'src/view-history/index.mjs',
      'src/security-center/index.mjs',
    ],
    bundle: true,
    outdir: outdir,
  })
}

async function zipFolder(dir) {
  const output = fs.createWriteStream(`${dir}.zip`)
  const archive = archiver('zip', {
    zlib: { level: 9 },
  })
  archive.pipe(output)
  archive.directory(dir, false)
  await archive.finalize()
}

async function copyFiles(entryPoints, targetDir) {
  await fsPromises.mkdir(targetDir)
  await Promise.all(
    entryPoints.map(async (entryPoint) => {
      await fsPromises.copyFile(entryPoint.src, `${targetDir}/${entryPoint.dst}`)
    }),
  )
}

async function writeBootstrapCssWithoutSourceMap(targetDir) {
  const css = await fsPromises.readFile('src/css/bootstrap.min.css', 'utf8')
  const stripped = css.replace(BOOTSTRAP_SOURCEMAP_RE, '').trimEnd() + '\n'
  await fsPromises.writeFile(`${targetDir}/bootstrap.min.css`, stripped, 'utf8')
}

async function build() {
  await deleteOldDir()
  await runEsbuild()

  const commonFiles = [
    { src: 'build/content-script/index.js', dst: 'content-script.js' },
    { src: 'build/background/index.js', dst: 'background.js' },
    { src: 'build/new-tab/index.js', dst: 'new-tab.js' },
    { src: 'build/chatgpt-script/index.js', dst: 'chatgpt-script.js' },
    { src: 'build/view-history/index.js', dst: 'view-history.js' },
    { src: 'build/popup/index.js', dst: 'popup.js' },
    { src: 'build/security-center/index.js', dst: 'security-center.js' },
    { src: 'src/popup/index.html', dst: 'popup.html' },
    { src: 'src/new-tab/index.html', dst: 'new-tab.html' },
    { src: 'src/view-history/index.html', dst: 'view-history.html' },
    { src: 'src/security-center/index.html', dst: 'security-center.html' },
    { src: 'src/css/github-markdown.css', dst: 'github-markdown.css' },
    { src: 'src/css/bootstrap.min.css', dst: 'bootstrap.min.css' },
    { src: 'src/css/result-card.css', dst: 'result-card.css' },
    { src: 'src/css/popup.css', dst: 'popup.css' },
    { src: 'src/css/new-tab.css', dst: 'new-tab.css' },
    { src: 'src/css/view-history.css', dst: 'view-history.css' },
    { src: 'src/css/security-center.css', dst: 'security-center.css' },
    { src: 'src/img/icon19.png', dst: 'icon19.png' },
    { src: 'src/img/icon16.png', dst: 'icon16.png' },
    { src: 'src/img/icon48.png', dst: 'icon48.png' },
    { src: 'src/img/icon128.png', dst: 'icon128.png' },
  ]

  // chromium
  await copyFiles(
    [...commonFiles, { src: 'src/manifest.json', dst: 'manifest.json' }],
    `./${outdir}/chromium`,
  )
  await writeBootstrapCssWithoutSourceMap(`./${outdir}/chromium`)

  await zipFolder(`./${outdir}/chromium`)

  // firefox
  await copyFiles(
    [...commonFiles, { src: 'src/manifest.v2.json', dst: 'manifest.json' }],
    `./${outdir}/firefox`,
  )
  await writeBootstrapCssWithoutSourceMap(`./${outdir}/firefox`)

  await zipFolder(`./${outdir}/firefox`)
}

build()
