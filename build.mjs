import archiver from 'archiver'
import esbuild from 'esbuild'
import fs, { promises as fsPromises } from 'fs'

const outdir = 'build'

async function deleteOldDir() {
  await fsPromises.rm(outdir, { recursive: true, force: true })
}

async function runEsbuild() {
  await esbuild.build({
    entryPoints: [
      'src/newTab/index.mjs',
      'src/content-script/index.mjs',
      'src/background/index.mjs',
      'src/chatgpt-script/index.mjs',
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

async function build() {
  await deleteOldDir()
  await runEsbuild()

  const commonFiles = [
    { src: 'build/content-script/index.js', dst: 'content-script.js' },
    { src: 'build/background/index.js', dst: 'background.js' },
    { src: 'build/newTab/index.js', dst: 'newTab.js' },
    { src: 'build/chatgpt-script/index.js', dst: 'chatgpt-script.js' },
    { src: 'src/popup/popup.html', dst: 'popup.html' },
    { src: 'src/newTab/index.html', dst: 'newTab.html' },
    { src: 'src/css/github-markdown.css', dst: 'github-markdown.css' },
    { src: 'src/css/styles.css', dst: 'styles.css' },
    { src: 'src/css/bootstrap.min.css', dst: 'bootstrap.min.css' },
    { src: 'src/css/result_card.css', dst: 'result_card.css' },
    { src: 'src/css/newTab.css', dst: 'newTab.css' },
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

  await zipFolder(`./${outdir}/chromium`)

  // firefox
  await copyFiles(
    [...commonFiles, { src: 'src/manifest.v2.json', dst: 'manifest.json' }],
    `./${outdir}/firefox`,
  )

  await zipFolder(`./${outdir}/firefox`)
}

build()
