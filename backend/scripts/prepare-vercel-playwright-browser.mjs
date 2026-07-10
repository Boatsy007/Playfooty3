import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const backendRoot = path.resolve(new URL('..', import.meta.url).pathname)
const browserRoot = path.join(backendRoot, 'node_modules', 'playwright-core', '.local-browsers')
const apiBrowserRoot = path.join(backendRoot, 'api', '.playwright')
const targetDir = path.join(apiBrowserRoot, 'chrome-headless-shell-linux64')
const targetExecutable = path.join(targetDir, 'chrome-headless-shell')

async function findHeadlessShellDir() {
  if (!existsSync(browserRoot)) {
    throw new Error(`Playwright browser root does not exist at ${browserRoot}. Run npm --prefix backend run playhq:install-browser first.`)
  }

  const revisions = (await readdir(browserRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && entry.name.startsWith('chromium_headless_shell-'))
    .map(entry => entry.name)
    .sort()
    .reverse()

  for (const revision of revisions) {
    const candidateDir = path.join(browserRoot, revision, 'chrome-headless-shell-linux64')
    const candidateExecutable = path.join(candidateDir, 'chrome-headless-shell')
    if (existsSync(candidateExecutable)) return candidateDir
  }

  throw new Error(`No Playwright Chromium headless shell executable found under ${browserRoot}. Run npm --prefix backend run playhq:install-browser first.`)
}

const sourceDir = await findHeadlessShellDir()
await rm(apiBrowserRoot, { recursive: true, force: true })
await mkdir(apiBrowserRoot, { recursive: true })
await cp(sourceDir, targetDir, { recursive: true, force: true, preserveTimestamps: true })
const info = await stat(targetExecutable)
console.log(`[playhq-browser] bundled Chromium headless shell from ${sourceDir}`)
console.log(`[playhq-browser] bundled Chromium headless shell at ${targetExecutable} (${info.size} bytes executable)`)
