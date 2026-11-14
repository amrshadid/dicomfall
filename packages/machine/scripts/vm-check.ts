// Boots the built image through the game's own VM session, in Node, and checks what a mission
// relies on: two AEs built from a definition and joined by a link, the fixtures on the lab's
// disk, the console in an AE, root's reads for checks, a link that loses packets while it stays
// up, and a saved Machine restored twice to the moment it was saved.
// Usage: pnpm vm:check   (after pnpm vm:image)
import fs, { readdirSync, readFileSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { syncBuiltinESMExports } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readMachineFile } from '#services/vm/vm-read.service'
import { createVmSession } from '#services/vm/vm-session.service'
import { TWO_AES, TWO_AES_LINK } from '#test/lab'
import type { StampedMachineEvent } from '#types/definitions/event'
import { FIXTURES_DIR } from '#types/definitions/network'
import { VM_GO_DICOM, type VmManifest, type VmPhase } from '#types/definitions/vm'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const vm = join(repo, 'apps/web/public/vm')
const fixtures = join(repo, 'packages/fixtures/out')
const POLL_MS = 250
const started = Date.now()
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const log = (text: string) => console.log(`[${((Date.now() - started) / 1000).toFixed(1)}s] ${text}`)
const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`
const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`
// biome-ignore lint/suspicious/noControlCharactersInRegex: matches the console's escape sequences
const TERMINAL_CODES = /\x1b\[[0-9;?]*[A-Za-z]/g

// v86 in Node reads its files from disk; the session fetches only manifest.json, so that read is served from disk too.
const fetchUrl = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = String(input)
  return url.startsWith('/') ? new Response(await readFile(url)) : fetchUrl(input, init)
}

// Every image file v86 opens, to tell what a first visit downloads: v86 reads with
// fs/promises' readFile, or open for a range, and imports the module only when it first loads.
const opened = new Set<string>()
const { readFile: diskRead, open: diskOpen } = fs.promises
fs.promises.readFile = ((path: Parameters<typeof diskRead>[0], ...rest: [never]) => {
  opened.add(String(path))
  return diskRead(path, ...rest)
}) as typeof diskRead
fs.promises.open = ((path: Parameters<typeof diskOpen>[0], ...rest: [never]) => {
  opened.add(String(path))
  return diskOpen(path, ...rest)
}) as typeof diskOpen
syncBuiltinESMExports()

const session = createVmSession()
let screen = ''
let phase: VmPhase = 'off'
let detail: string | null = null
let commandLines: string[] = []
const failures: string[] = []
const events: StampedMachineEvent[] = []
const timings: [string, string][] = []

function check(what: string, ok: boolean, shown = '') {
  log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !shown ? '' : `\n${shown}`}`)
  if (!ok) {
    failures.push(what)
  }
}

async function until(what: string, ok: () => boolean | Promise<boolean>, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs
  while (!(await ok())) {
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`)
    }
    await wait(POLL_MS)
  }
}

async function timed<T>(what: string, work: () => Promise<T>): Promise<T> {
  const from = Date.now()
  const result = await work()
  timings.push([what, seconds(Date.now() - from)])
  return result
}

const root = async (line: string) => (await session.control(line)).output.replaceAll('\r', '').trim()
const shown = () => screen.replace(TERMINAL_CODES, '').replaceAll('\r', '')
const uptime = async () => Number((await root('cut -d" " -f1 /proc/uptime')) || Number.NaN)
const equalBytes = (first: Uint8Array, second: Uint8Array) =>
  first.length === second.length && first.every((byte, at) => byte === second[at])

/** Types a line on the player's console and returns what it showed up to the next prompt. */
async function type(line: string, prompt: string): Promise<string> {
  // An index into the plain text, which is shorter than the screen's bytes.
  const from = shown().length
  session.input(`${line}\r`)
  await until(
    `"${line}" to return to ${prompt}`,
    () => shown().slice(from).trimEnd().endsWith(prompt.trimEnd()),
    60_000
  )
  return shown().slice(from)
}

/** The lab as a mission needs it after a restore: both namespaces, the link, the fixture. */
async function labIntact(fixture: Uint8Array): Promise<string> {
  const namespaces = await root('ip netns list')
  const ping = await root('ip netns exec workstation ping -c 2 -W 2 10.0.0.2 | tail -2')
  const read = await readMachineFile((line, ms) => session.control(line, ms), '/lab/ct-explicit-le.dcm')
  const problems = [
    ...(/workstation/.test(namespaces) && /archive/.test(namespaces) ? [] : [`namespaces: ${namespaces}`]),
    ...(/2 packets received/.test(ping) ? [] : [`ping: ${ping}`]),
    ...(read.ok && equalBytes(read.value, fixture) ? [] : ['the fixture read back differs']),
  ]
  return problems.join('\n')
}

/** The image's files and sizes, from what pnpm vm:image wrote. */
function imageSizes(version: string) {
  const image = join(vm, version)
  const flat = join(image, 'flat')
  const compressed = readdirSync(flat).reduce((sum, file) => sum + statSync(join(flat, file)).size, 0)
  const { size } = JSON.parse(readFileSync(join(image, 'fs.json'), 'utf8')) as { size: number }
  const boot = ['vmlinuz', 'initramfs.cpio.gz'].reduce((sum, file) => sum + statSync(join(image, file)).size, 0)
  return { raw: size, compressed, files: readdirSync(flat).length, boot }
}

function fetchedSoFar() {
  const files = [...opened].filter((path) => path.startsWith(vm))
  const flat = files.filter((path) => path.includes('/flat/'))
  const bytes = files.reduce((sum, path) => sum + statSync(path).size, 0)
  return { files: files.length, flat: flat.length, bytes }
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(vm, 'manifest.json'), 'utf8')) as VmManifest
  const sizes = imageSizes(manifest.version)
  log(
    `image ${manifest.version}: kernel ${manifest.kernelRelease}, go-dicom ${manifest.goDicomVersion ?? 'not installed'}; ${sizes.files} files, ${megabytes(sizes.raw)} raw, ${megabytes(sizes.compressed)} zstd in flat/, kernel and initramfs ${megabytes(sizes.boot)}`
  )
  const fixture = new Uint8Array(readFileSync(join(fixtures, 'ct-explicit-le.dcm')))

  const bootFrom = Date.now()
  await session.start(
    { baseUrl: `${vm}/`, wasmUrl: join(repo, 'packages/machine/node_modules/v86/build/v86.wasm'), fresh: true },
    (bytes) => {
      screen += Buffer.from(bytes).toString('latin1')
    },
    (status) => {
      phase = status.phase
      detail = status.detail
    },
    (update) => {
      events.length = Math.min(events.length, update.from)
      events.push(...update.events)
    },
    (update) => {
      commandLines.push(...(update.lines ?? []))
    }
  )
  await until('Linux to boot', () => phase === 'ready' || phase === 'failed')
  timings.push(['boot to the prompt, clean boot saved', seconds(Date.now() - bootFrom)])
  check('the Machine boots to its prompt', phase === 'ready', detail ?? '')
  const atBoot = fetchedSoFar()
  log(`booted; v86 opened ${atBoot.files} image files (${atBoot.flat} from flat/), ${megabytes(atBoot.bytes)} on disk`)

  const built = await timed('network up (two AEs, one link, one file)', () => session.setupNetwork(TWO_AES))
  check('the two AEs and their link are built from the definition', built.ok, built.ok ? '' : built.errors.join('\n'))
  if (!built.ok) {
    return
  }
  const addresses = await root('ip -n workstation -br addr show eth0; ip -n archive -br addr show eth0')
  check(
    'each AE has its address on its end of the link',
    /eth0@\S+\s+UP\s+10\.0\.0\.1\/24/.test(addresses) && /eth0@\S+\s+UP\s+10\.0\.0\.2\/24/.test(addresses),
    addresses
  )
  const ping = await timed('ping across the link (3 packets)', () =>
    root('ip netns exec workstation ping -c 3 -W 2 10.0.0.2 | tail -2')
  )
  check('workstation pings archive across the link', /3 packets received/.test(ping), ping)

  await timed('console moved into workstation', () => session.selectAe('workstation'))
  const listed = await type('ls -A /lab', 'workstation:~#')
  console.log(listed.trimEnd())
  check(
    'the console is in workstation, and /lab holds only the file the lab copied',
    listed.replaceAll('\r', '').split('\n').slice(1, -1).join('\n').trim() === 'ct-explicit-le.dcm',
    listed
  )
  const dumped = await type('hexdump -C /lab/ct-explicit-le.dcm | head', 'workstation:~#')
  console.log(dumped.trimEnd())
  check('hexdump shows DICM at offset 128', /00000080 {2}44 49 43 4d/.test(dumped), dumped)
  check(
    'the console reports both commands finished, with their lines',
    commandLines.join('\n') === 'workstation:~# ls -A /lab\nworkstation:~# hexdump -C /lab/ct-explicit-le.dcm | head',
    JSON.stringify(commandLines)
  )
  commandLines = []

  const read = await timed('root reads the fixture (9.6 kB as base64)', () =>
    readMachineFile((line, ms) => session.control(line, ms), `${FIXTURES_DIR}/ct-explicit-le.dcm`)
  )
  const stored = await root(`ls ${FIXTURES_DIR} ${FIXTURES_DIR}/series | wc -l`)
  check(`the image keeps every fixture in ${FIXTURES_DIR}`, Number(stored) > 3, stored)
  check(
    'root’s read gives the fixture’s bytes, equal to the file on the host',
    read.ok && equalBytes(read.value, fixture),
    read.ok ? `${read.value.length} bytes, ${fixture.length} on the host` : read.errors.join('\n')
  )
  const copied = await readMachineFile((line, ms) => session.control(line, ms), '/lab/ct-explicit-le.dcm')
  check('the lab’s file was copied from the fixture', copied.ok && equalBytes(copied.value, fixture))
  const missing = await readMachineFile((line, ms) => session.control(line, ms), '/lab/no-such.dcm')
  check('a missing file is a failed read, with why', !missing.ok && /not a regular file/.test(missing.errors.join()))

  const hasGoDicom = (await session.control(`[ -x ${VM_GO_DICOM} ]`)).status === 0
  if (hasGoDicom) {
    const version = await type('go-dicom --version', 'workstation:~#')
    console.log(version.trimEnd())
    check('go-dicom runs in workstation', /\d+\.\d+\.\d+/.test(version), version)
  } else {
    log(`go-dicom is not in this image (${VM_GO_DICOM}): the lock pins none yet`)
  }

  const captured = await timed('tcpdump sees a ping on archive’s end', () =>
    root(
      'ip netns exec archive tcpdump -c 2 -n -i eth0 icmp 2>&1 & sleep 2; ip netns exec workstation ping -c 2 10.0.0.2 >/dev/null; wait'
    )
  )
  check(
    'tcpdump on a link shows the packets crossing it',
    /IP 10\.0\.0\.1 > 10\.0\.0\.2: ICMP echo request/.test(captured) && /2 packets captured/.test(captured),
    captured
  )

  check('the link loses every packet', await session.setLinkLoss(TWO_AES_LINK, 100))
  const lossy = await root(
    'ip -n workstation -br link show eth0; ip netns exec workstation ping -c 2 -W 1 10.0.0.2 | tail -2'
  )
  check('a link losing packets keeps both ends up', /LOWER_UP/.test(lossy) && /100% packet loss/.test(lossy), lossy)
  check('the link stops losing packets', await session.setLinkLoss(TWO_AES_LINK, 0))
  await until('the fault events', () => events.length >= 2, 5_000).catch(() => undefined)
  check(
    'the fault and its clearing are events, in order',
    events.map((event) => event.type).join() === 'fault_injected,fault_cleared',
    JSON.stringify(events)
  )

  const savedEvents = events.length
  check('the lab is saved', await timed('save a slot', () => session.saveSlot()))
  const savedUptime = await uptime()
  await session.control('touch /lab/after-save && ip netns add after-save')
  await session.selectAe('archive')
  await wait(8_000)

  const restoredUptimes: number[] = []
  for (const round of [1, 2]) {
    const restored = await timed(`restore ${round}`, () => session.restoreSlot())
    check(`restore ${round} comes back to the saved Machine`, restored)
    restoredUptimes.push(await uptime())
    const problems = await labIntact(fixture)
    check(`after restore ${round} the namespaces, the link and the files are there`, problems === '', problems)
    const after = await root('ls /lab/after-save 2>&1; ip netns list')
    check(
      `restore ${round} undid everything after the save`,
      /No such file/.test(after) && !/^after-save/m.test(after),
      after
    )
    check(`the events went back to the saved moment with restore ${round}`, events.length === savedEvents)
    const where = await type('echo "in $DF_AE"', 'archive:~#')
    check(`the console stays in archive across restore ${round}`, /\nin archive\n/.test(where), where)
    await wait(8_000)
  }
  const drift = Math.abs((restoredUptimes[1] ?? 0) - (restoredUptimes[0] ?? 0))
  log(
    `guest uptime at the save ${savedUptime} s; after restore 1 ${restoredUptimes[0]} s; after restore 2 ${restoredUptimes[1]} s`
  )
  check(
    `each restore lands on the saved moment: the guest clock moved ${drift.toFixed(2)} s between them`,
    drift < 3 && (restoredUptimes[0] ?? Number.POSITIVE_INFINITY) - savedUptime < 3
  )

  const total = fetchedSoFar()
  log(
    `v86 opened ${total.files} image files in all (${total.flat} from flat/), ${megabytes(total.bytes)} on disk; at boot ${atBoot.files} (${megabytes(atBoot.bytes)})`
  )
  for (const [what, time] of timings) {
    log(`time: ${what}: ${time}`)
  }
}

try {
  await main()
} catch (error) {
  check(error instanceof Error ? error.message : String(error), false, shown().slice(-1500))
}
await session.stop()
log(failures.length === 0 ? 'all checks passed' : `${failures.length} failed: ${failures.join('; ')}`)
process.exit(failures.length === 0 ? 0 : 1)
