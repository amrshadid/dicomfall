// Captures go-dicom's own reading of the fixtures, `go-dicom show <file> --json`, on the built
// image, and writes each as a test fixture under src/test/show-json/: the parser's tests and the
// byte-range cross-checks read only output copied from a real run, never typed.
// Usage: pnpm --filter @dicomfall/machine vm:show-json   (after pnpm vm:image)
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createVmSession } from '#services/vm/vm-session.service'
import { readMachineShow } from '#services/vm/vm-show.service'
import type { NetworkDefinition } from '#types/definitions/network'
import { VM_GO_DICOM, type VmManifest, type VmPhase } from '#types/definitions/vm'
import { parseShowJson, showJsonLine } from '#utils/files/show-json.util'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const vm = join(repo, 'apps/web/public/vm')
const out = join(here, '../src/test/show-json')
const POLL_MS = 250

/** A lab as the missions build it: the fixtures copied to the `/lab/` paths their checks name. */
const LAB: NetworkDefinition = {
  aes: [{ name: 'workstation', title: 'WORKSTATION' }],
  links: [],
  files: [
    { fixture: 'ct-explicit-le.dcm', to: '/lab/ct-explicit-le.dcm' },
    { fixture: 'ct-implicit-le.dcm', to: '/lab/ct-implicit-le.dcm' },
    { fixture: 'series/', to: '/lab/series/' },
  ],
}

/** The files the tests read, and the name of each capture. */
const CAPTURES = [
  { path: '/lab/ct-explicit-le.dcm', name: 'ct-explicit-le', constant: 'CT_EXPLICIT_LE_SHOW_JSON' },
  { path: '/lab/ct-implicit-le.dcm', name: 'ct-implicit-le', constant: 'CT_IMPLICIT_LE_SHOW_JSON' },
  { path: '/lab/series/f01.dcm', name: 'series-f01', constant: 'SERIES_F01_SHOW_JSON' },
] as const

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main(): Promise<number> {
  const manifest = JSON.parse(readFileSync(join(vm, 'manifest.json'), 'utf8')) as VmManifest
  const session = createVmSession()
  let phase = 'off' as VmPhase
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    () => {},
    (status) => {
      phase = status.phase
    }
  )
  while (phase !== 'ready' && phase !== 'failed') {
    await wait(POLL_MS)
  }
  try {
    if (phase !== 'ready') {
      console.error('the Machine did not boot')
      return 1
    }
    const built = await session.setupNetwork(LAB)
    if (!built.ok) {
      console.error(built.errors.join('\n'))
      return 1
    }
    const version = (await session.control(`${VM_GO_DICOM} --version`)).output.trim()
    console.log(`image ${manifest.version}, ${version}`)
    for (const capture of CAPTURES) {
      const line = showJsonLine(capture.path)
      // stderr apart: a warning on it would make the JSON unreadable.
      const reply = await session.control(`${line} 2>/dev/null`)
      if (reply.status !== 0) {
        console.error(`${line} exited with ${reply.status}: ${reply.output}`)
        return 1
      }
      const output = reply.output.replaceAll('\r', '')
      const reading = parseShowJson(output)
      if (!reading.ok) {
        console.error(`${line}: ${reading.errors.join('\n')}`)
        return 1
      }
      const file = join(out, `${capture.name}.ts`)
      writeFileSync(
        file,
        [
          `// Copied from a real run on the Machine (image ${manifest.version}), by scripts/vm-show-json.ts:`,
          `//   ${line}`,
          `// ${version}. Never edit by hand: run the script again.`,
          `export const ${capture.constant} = ${JSON.stringify(output)}`,
          '',
        ].join('\n')
      )
      console.log(`${capture.path}: ${output.length} characters -> ${file}`)
      // The service the game reads through gives the same tree, in the AE's namespace too.
      for (const ae of [null, 'workstation']) {
        const served = await readMachineShow((text, ms) => session.control(text, ms), capture.path, ae)
        if (!served.ok || JSON.stringify(served.value) !== JSON.stringify(reading.value)) {
          console.error(
            `readMachineShow(${capture.path}, ${ae}) differs: ${served.ok ? 'another tree' : served.errors}`
          )
          return 1
        }
      }
    }
    const refused = await readMachineShow((text, ms) => session.control(text, ms), '/etc/hostname')
    console.log(`a file that is not DICOM: ${refused.ok ? 'read?!' : refused.errors.join('; ')}`)
    if (refused.ok || (await session.control('true')).status !== 0) {
      console.error("a refused file must fail, and leave root's channel answering")
      return 1
    }
    // In the repository's own format, so a fresh capture differs from the committed one only where go-dicom's output does.
    execFileSync('pnpm', ['exec', 'biome', 'format', '--write', out], { cwd: repo, stdio: 'inherit' })
    return 0
  } finally {
    await session.stop()
  }
}

process.exit(await main())
