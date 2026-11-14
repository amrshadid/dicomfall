import { describe, expect, it } from 'vitest'
import { EXAMPLE_MISSION, passedVerdict } from '#test/index'
import type { Progress } from '#types/definitions/progress'
import { SAVE_FORMAT, SAVE_VERSION } from '#types/definitions/saves'
import { emptyProgress } from '#utils/progress/index'
import { exportSave, importSave, parseJson, readSaveFile, toSaveFile } from '#utils/saves/save-file.util'

const MISSION_ID = EXAMPLE_MISSION.id

const PROGRESS: Progress = {
  missions: [{ missionId: MISSION_ID, firstStartedAt: 10, completedAt: 20, attempts: 2, hintsRevealed: 2 }],
  completionOrder: [MISSION_ID],
  lastActive: MISSION_ID,
}

describe('parseJson', () => {
  it('parses JSON, and hands back text that is not JSON so validation can say what is wrong', () => {
    expect(parseJson('{"version":2}')).toEqual({ version: 2 })
    expect(parseJson('{"version":')).toBe('{"version":')
  })
})

describe('save files', () => {
  it('round-trips progress through JSON, as storage keeps it', () => {
    const stored = JSON.parse(JSON.stringify(toSaveFile(PROGRESS, 99)))
    expect(readSaveFile(stored)).toEqual({
      ok: true,
      value: { progress: PROGRESS, savedAt: 99, migratedFrom: null },
    })
  })

  it('round-trips an open debrief with its verdict, one objective of each check kind in it', () => {
    const debrief: Progress['debrief'] = { missionId: MISSION_ID, verdict: passedVerdict(EXAMPLE_MISSION) }
    const progress: Progress = { ...PROGRESS, debrief }
    const stored = JSON.parse(JSON.stringify(toSaveFile(progress, 99)))
    expect(readSaveFile(stored)).toEqual({ ok: true, value: { progress, savedAt: 99, migratedFrom: null } })
    const none: Progress = { ...PROGRESS, debrief: { missionId: MISSION_ID, verdict: null } }
    expect(readSaveFile(JSON.parse(JSON.stringify(toSaveFile(none, 99))))).toMatchObject({
      ok: true,
      value: { progress: none },
    })
  })

  it('loads a save with no debrief open, and refuses a broken one', () => {
    const stored = JSON.parse(JSON.stringify(toSaveFile(PROGRESS, 99)))
    expect(readSaveFile(stored)).toMatchObject({ ok: true, value: { progress: PROGRESS } })
    expect('debrief' in PROGRESS).toBe(false)
    const broken = {
      ...stored,
      progress: {
        ...stored.progress,
        debrief: {
          missionId: MISSION_ID,
          verdict: {
            passed: 'yes',
            objectives: [{ objectiveId: 'x', result: { kind: 'reachable', passed: true, failure: null } }],
          },
        },
      },
    }
    const loaded = readSaveFile(broken)
    expect(!loaded.ok && loaded.errors).toEqual([
      'progress.debrief.verdict.passed: expected true or false, got text',
      'progress.debrief.verdict.objectives[0].result.kind: expected one of selected, answer, offset, grouped, file, absent, association, rejected-context, status, received, subops, echo, got "reachable"',
    ])
  })

  it('treats an empty slot as a new game', () => {
    const loaded = readSaveFile(undefined)
    expect(loaded).toEqual({
      ok: true,
      value: { progress: emptyProgress(), savedAt: null, migratedFrom: null },
    })
  })

  it('exports and imports a JSON string', () => {
    const imported = importSave(exportSave(PROGRESS, 7))
    expect(imported.ok && imported.value.progress).toEqual(PROGRESS)
    expect(importSave('{not json')).toEqual({ ok: false, errors: ['the file is not valid JSON'] })
    expect(importSave('{"hello": 1}')).toEqual({ ok: false, errors: ['not a DICOMFall save'] })
  })

  it('starts at version 1 with nothing to migrate', () => {
    expect(SAVE_VERSION).toBe(1)
    expect(toSaveFile(PROGRESS, 1)).toMatchObject({ format: 'dicomfall-save', version: 1 })
  })

  it('runs migrations one version at a time', () => {
    const oldSave = { format: SAVE_FORMAT, version: 1, savedAt: 3, state: PROGRESS }
    const schema = {
      version: 2,
      migrations: [
        {
          from: 1,
          migrate: ({ state, ...rest }: Readonly<Record<string, unknown>>) => ({
            ...rest,
            progress: state,
          }),
        },
      ],
    }
    expect(readSaveFile(oldSave, schema)).toEqual({
      ok: true,
      value: { progress: PROGRESS, savedAt: 3, migratedFrom: 1 },
    })
    expect(readSaveFile(oldSave, { version: 3, migrations: schema.migrations })).toEqual({
      ok: false,
      errors: ['no migration from save version 2'],
    })
  })

  it('refuses saves from a newer game', () => {
    const future = { ...toSaveFile(PROGRESS, 1), version: SAVE_VERSION + 1 }
    expect(readSaveFile(future)).toEqual({
      ok: false,
      errors: [`the save is from a newer version of the game (save ${SAVE_VERSION + 1}, game ${SAVE_VERSION})`],
    })
  })

  it('reports every corrupt field with its path', () => {
    const [mission] = PROGRESS.missions
    const corrupt = {
      ...toSaveFile(PROGRESS, 1),
      progress: {
        ...PROGRESS,
        lastActive: 7,
        missions: [{ ...mission, hintsRevealed: 'two', attempts: -1 }],
      },
    }
    const loaded = readSaveFile(JSON.parse(JSON.stringify(corrupt)))
    expect(!loaded.ok && loaded.errors).toEqual(
      expect.arrayContaining([
        'progress.missions[0].hintsRevealed: expected a whole number, got text',
        'progress.missions[0].attempts: expected a number from 0 to 9007199254740991, got -1',
        'progress.lastActive: expected non-empty text, got a number',
      ])
    )
  })
})
