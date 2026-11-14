import type { GuidePace, GuidePredict } from '@features/guide/types'
import { describe, expect, it, vi } from 'vitest'
import { MISSION_HINTS } from '@/test/fixtures/guide.fixture'
import { STORY, STORY_BUILD, STORY_SCENE, STORY_SEE } from '@/test/fixtures/story.fixture'
import {
  beatsOf,
  blocksFor,
  chipsOf,
  hintGuideOf,
  hintsOf,
  pacedGuideOf,
  predictWaitsIn,
  speakerOf,
} from './guide-story.util'

describe('hintGuideOf', () => {
  it("is the first guide to speak in Build it, else See it's or the Scene's", () => {
    const line = (speaker: string | null) => ({ kind: 'line' as const, speaker, text: 'x' })
    expect(hintGuideOf(new Map([['build-it', [line(null), line('VR')]]]))).toBe('VR')
    expect(hintGuideOf(new Map([['scene', [line('The Instance UID')]]]))).toBe('The Instance UID')
    expect(hintGuideOf(undefined)).toBeNull()
  })
})

const pace = (overrides: Partial<GuidePace> = {}): GuidePace => ({
  shown: 1,
  picks: {},
  advance: vi.fn(),
  pick: vi.fn(),
  ...overrides,
})

const predictsOf = (beats: ReturnType<typeof pacedGuideOf>['beats']): GuidePredict[] =>
  beats.flatMap((beat) => beat.filter((part): part is GuidePredict => part.kind === 'predict'))

describe('speakerOf', () => {
  it('names the six guides with the real part of the standard they are', () => {
    expect(speakerOf('The Preamble')).toMatchObject({
      portrait: 'preamble',
      term: 'the 128 bytes at the start of a Part 10 file',
    })
    expect(speakerOf('VR')).toMatchObject({ portrait: 'vr' })
    expect(speakerOf('The Instance UID')).toMatchObject({ portrait: 'instance-uid' })
    expect(speakerOf('The SCP')).toMatchObject({ term: 'the receiving side of a DIMSE service', portrait: 'scp' })
    expect(speakerOf('The Archive')).toMatchObject({ portrait: 'archive' })
    expect(speakerOf('The Conformance Statement')).toMatchObject({ portrait: 'conformance-statement' })
  })

  it('lets narration and unknown names speak without a portrait', () => {
    expect(speakerOf(null)).toMatchObject({ id: 'narrator', portrait: null })
    expect(speakerOf('A Stranger')).toEqual({ id: 'A Stranger', name: 'A Stranger', term: '', portrait: null })
  })
})

describe('blocksFor', () => {
  it("shows a step's own section, else the one before it", () => {
    expect(blocksFor('see', STORY)).toEqual(STORY.get('see-it'))
    expect(blocksFor('watch', STORY)).toEqual(STORY.get('debrief'))
  })

  it('ends the debrief with the real world, after a pause and under its own heading', () => {
    const blocks = blocksFor('debrief', STORY)
    expect(blocks.map((block) => block.kind)).toEqual(['line', 'pause', 'heading', 'line'])
    expect(blocks[2]).toEqual({ kind: 'heading', text: 'In the real world' })
  })

  it('has nothing for a mission without a story', () => {
    expect(blocksFor('scene', undefined)).toEqual([])
  })
})

describe('beatsOf', () => {
  it('cuts the story at each pause and after each question', () => {
    const beats = beatsOf(STORY_SEE)
    expect(beats.map((beat) => beat.map((part) => part.kind))).toEqual([
      ['lines'],
      ['code', 'lines', 'predict'],
      ['lines'],
    ])
  })

  it('keeps a pause that ends the step as an empty last beat', () => {
    const blocks = [...STORY_BUILD, { kind: 'pause' } as const]
    const beats = beatsOf(blocks)
    expect(beats.at(-1)).toEqual([])
    expect(beats).toHaveLength(beatsOf(STORY_BUILD).length + 1)
    expect(beatsOf([{ kind: 'pause' }])).toEqual([])
  })

  it('marks a question followed by a pause as held for the command', () => {
    const [, second] = beatsOf(STORY_SEE)
    expect(second?.find((part) => part.kind === 'predict')).toMatchObject({ held: true, id: 0 })
    const [first] = beatsOf(STORY_BUILD)
    expect(first?.find((part) => part.kind === 'predict')).toMatchObject({ held: false })
  })
})

describe('pacedGuideOf', () => {
  const beats = beatsOf(STORY_SEE)

  it('shows the story up to the first pause, with Continue for the rest', () => {
    const guide = pacedGuideOf(beats, pace(), false)
    expect(guide.beats).toHaveLength(1)
    expect(guide.onContinue).not.toBeNull()
    expect(guide.finished).toBe(false)
  })

  it('stops at an open question, whatever the player runs meanwhile', () => {
    const guide = pacedGuideOf(beats, pace({ shown: 9 }), false)
    expect(guide.beats).toHaveLength(2)
    expect(guide.onContinue).toBeNull()
    expect(predictsOf(guide.beats)[0]?.onPick).not.toBeNull()
  })

  it('keeps a held answer unmarked until a command brings the next beat', () => {
    const picked = pace({ shown: 2, picks: { 0: 1 } })
    const waiting = predictsOf(pacedGuideOf(beats, picked, false).beats)[0]
    expect(waiting).toMatchObject({ picked: 1, revealed: false, onPick: null })
    const after = predictsOf(pacedGuideOf(beats, { ...picked, shown: 3 }, false).beats)[0]
    expect(after).toMatchObject({ picked: 1, revealed: true })
  })

  it('records a held pick without moving on; "just show me" moves on at once', () => {
    const pick = vi.fn()
    const [question] = predictsOf(pacedGuideOf(beats, pace({ shown: 2, pick }), false).beats)
    question?.onPick?.(0)
    expect(pick).toHaveBeenLastCalledWith(0, 0, 2)
    question?.onPick?.(null)
    expect(pick).toHaveBeenLastCalledWith(0, null, 3)
  })

  it('reveals an unheld answer as soon as it is picked', () => {
    const build = beatsOf(STORY_BUILD)
    const [question] = predictsOf(pacedGuideOf(build, pace({ picks: { 0: 0 } }), false).beats)
    expect(question).toMatchObject({ revealed: true, picked: 0 })
  })

  it('moves on for a finished command only when it is the one the beat asked for', () => {
    const advance = vi.fn()
    const guide = pacedGuideOf(beats, pace({ advance }), false)
    guide.onCommands(['workstation:~# pwd'])
    expect(advance).not.toHaveBeenCalled()
    guide.onCommands(['workstation:~# pwd', 'workstation:~# ls /lab'])
    expect(advance).toHaveBeenCalledWith(1)
  })

  it('moves on for any finished command while the Machine does not say what was typed', () => {
    const advance = vi.fn()
    pacedGuideOf(beats, pace({ advance }), false).onCommands()
    expect(advance).toHaveBeenCalledWith(1)
  })

  it('moves on for no command while a question waits, nor on a step looked back at', () => {
    const advance = vi.fn()
    pacedGuideOf(beats, pace({ shown: 2, advance }), false).onCommands()
    pacedGuideOf(beats, pace({ advance }), true).onCommands()
    expect(advance).not.toHaveBeenCalled()
  })

  it('keeps Continue on every pause, so a player is never held by a command', () => {
    const advance = vi.fn()
    const guide = pacedGuideOf(beats, pace({ advance }), false)
    guide.onContinue?.()
    expect(advance).toHaveBeenCalledWith()
    expect(pacedGuideOf(beats, pace({ shown: 3, picks: { 0: 1 } }), false).onContinue).toBeNull()
  })

  it('shows a held answer at the end of a step once the command after it runs', () => {
    const ending = beatsOf([...STORY_SEE.slice(0, 5), { kind: 'pause' }])
    const picked = pace({ shown: 2, picks: { 0: 1 } })
    expect(predictsOf(pacedGuideOf(ending, picked, false).beats)[0]?.revealed).toBe(false)
    expect(predictsOf(pacedGuideOf(ending, { ...picked, shown: 3 }, false).beats)[0]?.revealed).toBe(true)
  })

  it('shows a step looked back at whole, its questions answered', () => {
    const guide = pacedGuideOf(beats, pace(), true)
    expect(guide.beats).toHaveLength(3)
    expect(guide.finished).toBe(true)
    expect(predictsOf(guide.beats)[0]).toMatchObject({ revealed: true, onPick: null })
  })
})

describe('pacedGuideOf, actions beside the console', () => {
  const line = (text: string) => ({ kind: 'line' as const, speaker: 'The Preamble', text })
  const PAUSE = { kind: 'pause' as const }
  const beats = beatsOf([
    line('Open the File inspector and select the first row of group 0002, `0002,0000`.'),
    PAUSE,
    line('Predict the offset, and give it beside the objective.'),
    PAUSE,
    line('Now type `ls /lab`.'),
    PAUSE,
    line('Done.'),
  ])

  it('shows the next beat on a selection only where the beat asks for one', () => {
    const asked = pace()
    pacedGuideOf(beats, asked, false).onAction('selection')
    expect(asked.advance).toHaveBeenCalledOnce()
    const answering = pace({ shown: 2 })
    pacedGuideOf(beats, answering, false).onAction('selection')
    expect(answering.advance).not.toHaveBeenCalled()
  })

  it('shows the next beat when an objective is met, unless the beat waits for a command', () => {
    const answering = pace({ shown: 2 })
    pacedGuideOf(beats, answering, false).onAction('met')
    expect(answering.advance).toHaveBeenCalledOnce()
    const commanding = pace({ shown: 3 })
    pacedGuideOf(beats, commanding, false).onAction('met')
    expect(commanding.advance).not.toHaveBeenCalled()
  })

  it('does nothing on the last beat or while looking back', () => {
    const last = pace({ shown: 4 })
    pacedGuideOf(beats, last, false).onAction('met')
    const looking = pace()
    pacedGuideOf(beats, looking, true).onAction('selection')
    expect(last.advance).not.toHaveBeenCalled()
    expect(looking.advance).not.toHaveBeenCalled()
  })
})

describe('predictWaitsIn', () => {
  it('holds the way on until every question of the step is answered, "just show me" included', () => {
    const beats = beatsOf(STORY_SEE)
    expect(predictWaitsIn(beats, {})).toBe(true)
    expect(predictWaitsIn(beats, { 0: null })).toBe(false)
    expect(predictWaitsIn(beatsOf(STORY_SCENE), {})).toBe(false)
  })
})

describe('chipsOf', () => {
  it('runs a chip at the console on a click', () => {
    const run = vi.fn()
    const [chip] = chipsOf([{ command: 'ls /lab', explain: 'The files of the lab.' }], run)
    chip?.onRun?.()
    expect(run).toHaveBeenCalledWith('ls /lab')
  })

  it('only names the command while the console cannot take it', () => {
    expect(chipsOf([{ command: 'go-dicom', explain: 'The DICOM toolkit.' }], null)[0]?.onRun).toBeNull()
  })
})

describe('hintsOf', () => {
  it('names each revealed hint by its tier, in order, as text only', () => {
    expect(hintsOf(MISSION_HINTS, 0)).toEqual([])
    expect(hintsOf(MISSION_HINTS, 3).map((hint) => hint.tier)).toEqual(['a nudge', 'the concept', 'the spot'])
    expect(hintsOf(MISSION_HINTS, 3)[2]).toEqual({ tier: 'the spot', text: MISSION_HINTS[2].text })
  })
})
