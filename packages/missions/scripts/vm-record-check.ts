// Checks the mission recorder end to end on the real Machine: a copy of the test content with
// recorded blocks added is recorded, its bodies compared with the fixture's own bytes, then checked
// with --check several times, which must pass, again after a body is changed, which must fail, and
// once more with a block that prints nothing, which must fail and stay as it was. Both missions open
// with a recorded block, the first command after their lab is built, where a prompt left from the
// setup once ended a recording before its output came. Never touches packages/missions/content/.
// Usage: node packages/missions/scripts/vm-record-check.ts   (after pnpm vm:image; boots the Machine six times)
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRecordedStory } from '#utils/record/recorded-block.util'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../../..')
const recorder = join(here, 'record.ts')
const fixture = new Uint8Array(readFileSync(join(repo, 'packages/fixtures/out/ct-explicit-le.dcm')))
const MISSION = 'the-transfer-syntax'
const STORY = '1-the-first-file/01-the-transfer-syntax/story.md'
const SECOND_MISSION = 'explicit-and-implicit'
const SECOND_STORY = '1-the-first-file/02-explicit-and-implicit/story.md'
/** Each round of --check builds both labs again and records their first blocks afresh. */
const CHECK_ROUNDS = 3
const FENCE = '```'
const PLACEHOLDER = '(recorded on the Machine)'
const failures: string[] = []

function check(what: string, ok: boolean, shown = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok || !shown ? '' : `\n${shown}`}`)
  if (!ok) {
    failures.push(what)
  }
}

/** One line of `hexdump -C`, written from the bytes on the host, to compare the Machine's with. */
function hexdumpLine(offset: number): string {
  const bytes = [...fixture.subarray(offset, offset + 16)]
  const hex = (from: number) =>
    bytes
      .slice(from, from + 8)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ')
  const ascii = bytes.map((byte) => (byte >= 0x20 && byte < 0x7f ? String.fromCharCode(byte) : '.')).join('')
  return `${offset.toString(16).padStart(8, '0')}  ${hex(0)}  ${hex(8)}  |${ascii}|`
}

// The scene asks for two commands: the first is its own block's, the second changes the lab before
// the listing. One block's line is longer than the console is wide, and one needs go-dicom.
const LONG =
  'ls -d /lab/ct.dcm /lab/copy.dcm /usr/share/dicomfall/fixtures/ct-explicit-le.dcm /usr/share/dicomfall/fixtures/ct-implicit-le.dcm'
const ADDED = `> **The Preamble:** Type \`hexdump -C /lab/ct.dcm | head -n 3\`.

---

${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 3
${PLACEHOLDER}
${FENCE}

> **The Preamble:** Now type \`cp /lab/ct.dcm /lab/copy.dcm\`.

---

${FENCE}recorded@workstation ls /lab
${PLACEHOLDER}
${FENCE}

${FENCE}recorded ${LONG}
${PLACEHOLDER}
${FENCE}

${FENCE}recorded! touch /lab/marker
${PLACEHOLDER}
${FENCE}

${FENCE}recorded go-dicom show /lab/ct.dcm
${PLACEHOLDER}
${FENCE}
`

// The command whose first recording once came back empty, as the second mission's first.
const FIRST_IN_SECOND = `${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 10
${PLACEHOLDER}
${FENCE}
`

const SILENT = `${FENCE}recorded true
${PLACEHOLDER}
${FENCE}
`

function run(content: string, extra: string[]): { status: number; out: string } {
  const result = spawnSync(process.execPath, [recorder, ...extra], {
    env: { ...process.env, DICOMFALL_CONTENT_DIR: content },
    encoding: 'utf8',
    timeout: 900_000,
  })
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`
  console.log(
    out
      .trimEnd()
      .split('\n')
      .map((line) => `  | ${line}`)
      .join('\n')
  )
  return { status: result.status ?? 1, out }
}

const content = mkdtempSync(join(tmpdir(), 'dicomfall-record-'))
try {
  cpSync(join(here, '../src/test/fixture-content'), content, { recursive: true })
  const storyPath = join(content, STORY)
  const original = readFileSync(storyPath, 'utf8')
  writeFileSync(storyPath, original.replace('\n## Debrief', `\n${ADDED}\n## Debrief`))
  const secondPath = join(content, SECOND_STORY)
  const secondOriginal = readFileSync(secondPath, 'utf8')
  writeFileSync(secondPath, secondOriginal.replace('\n## Scene\n', `\n## Scene\n\n${FIRST_IN_SECOND}`))

  console.log(`recording ${content}`)
  const recorded = run(content, [])
  check('the recorder exits 0', recorded.status === 0)
  const story = readFileSync(storyPath, 'utf8')
  const [hexdump, listing, long, marker, goDicom] = readRecordedStory(story).blocks
  const wantedHexdump = [hexdumpLine(0), '*', hexdumpLine(0x80)].join('\n')
  check(
    'the hexdump block holds the Machine’s output, equal to the fixture’s bytes',
    hexdump?.body === wantedHexdump,
    `${hexdump?.body}\n--- expected\n${wantedHexdump}`
  )
  check(
    'the player’s cp ran before the listing, in the AE the block names',
    listing?.ae === 'workstation' && /\bcopy\.dcm\b/.test(listing.body) && /\bct\.dcm\b/.test(listing.body),
    listing?.body
  )
  check(
    'a line wider than the console is recorded without its echo',
    long !== undefined &&
      !long.body.includes('ls -d') &&
      [
        '/lab/ct.dcm',
        '/lab/copy.dcm',
        '/usr/share/dicomfall/fixtures/ct-explicit-le.dcm',
        '/usr/share/dicomfall/fixtures/ct-implicit-le.dcm',
      ].every((path) => long.body.includes(path)),
    long?.body
  )
  check(
    'a recorded! block of a command that prints nothing is written empty',
    marker?.expectsEmpty === true &&
      marker.body === '' &&
      story.includes(`${FENCE}recorded! touch /lab/marker\n${FENCE}`),
    marker?.body
  )
  const [first] = readRecordedStory(readFileSync(secondPath, 'utf8')).blocks
  const wantedFirst = [hexdumpLine(0), '*', ...[8, 9, 10, 11, 12, 13, 14, 15].map((row) => hexdumpLine(row * 16))].join(
    '\n'
  )
  check(
    'the first command after a lab is built is recorded whole, in the other mission too',
    first?.body === wantedFirst,
    `${first?.body}\n--- expected\n${wantedFirst}`
  )
  check(
    'each info string is kept, so the story can be recorded again',
    story.includes(`${FENCE}recorded hexdump -C /lab/ct.dcm | head -n 3\n`) &&
      story.includes(`${FENCE}recorded@workstation ls /lab\n`)
  )
  check('the rest of the story is unchanged', story.startsWith(original.slice(0, original.indexOf('\n## Debrief'))))
  const hasGoDicom = !/go-dicom not in this image/.test(recorded.out)
  if (hasGoDicom) {
    check('the go-dicom block is recorded', goDicom !== undefined && goDicom.body !== PLACEHOLDER, goDicom?.body)
  } else {
    check(
      'the go-dicom block is left as it was and reported as skipped, with why',
      goDicom?.body === PLACEHOLDER && /go-dicom show \/lab\/ct\.dcm: skipped \(it runs go-dicom/.test(recorded.out),
      goDicom?.body
    )
  }
  const logPath = join(repo, 'node_modules/.cache/dicomfall-record', `${MISSION}.log`)
  check(
    'the run log is written',
    existsSync(logPath) && readFileSync(logPath, 'utf8').includes('cp /lab/ct.dcm /lab/copy.dcm')
  )

  const secondStory = readFileSync(secondPath, 'utf8')
  for (let round = 1; round <= CHECK_ROUNDS; round++) {
    console.log(`checking the recorded stories, round ${round} of ${CHECK_ROUNDS}`)
    const same = run(content, ['--check'])
    check(
      `--check round ${round}: both missions match what was recorded, first blocks included, and nothing is written`,
      same.status === 0 &&
        /hexdump -C \/lab\/ct\.dcm \| head -n 10: same as the Machine/.test(same.out) &&
        readFileSync(storyPath, 'utf8') === story &&
        readFileSync(secondPath, 'utf8') === secondStory
    )
  }

  console.log('checking a story whose output was typed by hand')
  writeFileSync(storyPath, story.replace('\n*\n', '\n**\n'))
  const typed = run(content, ['--check', MISSION])
  check(
    '--check fails on a body that differs from the Machine, and names the line',
    typed.status === 1 && /differs at its line 2/.test(typed.out)
  )

  console.log('recording a block that prints nothing without saying so')
  writeFileSync(secondPath, secondStory.replace('\n## Debrief', `\n${SILENT}\n## Debrief`))
  const silent = run(content, [SECOND_MISSION])
  const [, silentBlock] = readRecordedStory(readFileSync(secondPath, 'utf8')).blocks
  check(
    'an empty recording is tried again, then fails, and the block keeps what it had',
    silent.status === 1 &&
      /true: failed \(it printed nothing; write the block as ```recorded!/.test(silent.out) &&
      silentBlock?.body === PLACEHOLDER
  )
} catch (error) {
  check(error instanceof Error ? error.message : String(error), false)
}
if (failures.length === 0) {
  rmSync(content, { recursive: true, force: true })
} else {
  console.log(`the content is kept at ${content}`)
}
console.log(failures.length === 0 ? 'all checks passed' : `${failures.length} failed: ${failures.join('; ')}`)
process.exit(failures.length === 0 ? 0 : 1)
