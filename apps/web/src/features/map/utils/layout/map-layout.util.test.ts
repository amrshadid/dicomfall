import { FIRST_MISSION, journeyFixture, longerJourneyFixture, SECOND_MISSION } from '@features/map/utils/fixtures'
import { journeyChapters, plannedKeyOf } from '@features/map/utils/journey'
import { describe, expect, it } from 'vitest'
import { EDGE, TOP } from './map-layout.constants'
import { layoutMap } from './map-layout.util'
import { END_WORDS } from './map-text.constants'

const WIDTH = 774
const today = () => journeyChapters(journeyFixture(), FIRST_MISSION)
const missions = (scene: ReturnType<typeof layoutMap>) => scene.stops.filter((stop) => !stop.stop.planned)

describe('layoutMap', () => {
  it('stacks the six stages and the Bridge from the top down without gaps, the network they end at under the last', () => {
    const scene = layoutMap(today(), WIDTH)
    expect(scene.chapters).toHaveLength(7)
    expect(scene.chapters[0]?.top).toBe(TOP)
    scene.chapters.forEach((chapter, index) => {
      expect(chapter.bottom).toBeGreaterThan(chapter.top)
      if (index > 0) {
        expect(chapter.top).toBe(scene.chapters[index - 1]?.bottom)
      }
    })
    expect(scene.terminus?.top).toBe(scene.chapters[6]?.bottom)
    expect(scene.height).toBeGreaterThan(scene.terminus?.bottom ?? Number.POSITIVE_INFINITY)
  })

  it('prints each stage header: its number, name, progress, what it covers and its standard parts in mono', () => {
    const chapter = layoutMap(today(), WIDTH).chapters[0]
    const words = chapter?.texts.map((item) => item.text) ?? []
    expect(words[0]).toBe('STAGE 1 OF 6')
    expect(words).toContain('The First File')
    expect(words).toContain('0 of 1 passed')
    expect(words.join(' ')).toContain('What a DICOM file holds')
    expect(chapter?.texts.find((item) => item.style === 'mono')?.text).toBe('Standard parts: PS3.10, PS3.5')
    expect(chapter?.name).toBe('Stage 1: The First File')
  })

  it('heads the Bridge by where it stands and its label, never a stage number', () => {
    const bridge = layoutMap(today(), WIDTH).chapters[3]
    expect(bridge?.texts.map((item) => item.text).slice(0, 2)).toEqual(['BETWEEN STAGES 3 AND 4', 'Bridge'])
    expect(bridge?.name).toBe('Bridge')
    expect(bridge?.prefix).toBe('B')
  })

  it("prints each region's heading under its stage: name, progress, what it covers with its guide, its source", () => {
    const scene = layoutMap(journeyChapters(longerJourneyFixture(true), SECOND_MISSION), WIDTH)
    const stage = scene.chapters[0]
    const region = stage?.regions[0]
    expect(stage?.regions).toHaveLength(1)
    expect(region?.key).toBe('the-first-file/open-the-file')
    expect(region?.texts.map((item) => [item.style, item.text])).toEqual([
      ['region', 'Open the file'],
      ['tone-progress', 'in progress · 1 of 2'],
      ['meta', 'what a DICOM file holds, read with go-dicom and as bytes · guide: The Preamble'],
      ['mono', 'cli/show.go, cli/info.go, PS3.10 §7'],
    ])
    // The band runs from under the stage's header to below its last row of stops.
    expect(region?.top).toBeGreaterThanOrEqual((stage?.panel.y ?? 0) + (stage?.panel.height ?? 0))
    for (const stop of missions(scene)) {
      expect(stop.y).toBeGreaterThan(region?.top ?? 0)
      expect(stop.y).toBeLessThan(region?.bottom ?? 0)
    }
    // A planned stage has no regions.
    expect(scene.chapters[1]?.regions).toEqual([])
    // The overview keeps a region's name and progress only.
    const overview = layoutMap(journeyChapters(longerJourneyFixture(true), SECOND_MISSION), WIDTH, 'overview')
    expect(overview.chapters[0]?.regions[0]?.texts.map((item) => item.text)).toEqual([
      'Open the file',
      'in progress · 1 of 2',
    ])
  })

  it('draws a stage with no missions as one planned stop on the road that says so in words', () => {
    const scene = layoutMap(today(), WIDTH)
    const planned = scene.stops.filter((stop) => stop.stop.planned)
    expect(planned.map((stop) => stop.stop.number)).toEqual(['2', '3', 'B', '4', '5', '6'])
    for (const stop of planned) {
      const chapter = scene.chapters.find((candidate) => candidate.id === stop.chapterId)
      expect(stop.key).toBe(plannedKeyOf(stop.chapterId))
      expect(chapter?.tone).toBe('planned')
      expect(stop.texts.map((item) => item.text)).toEqual([`${stop.stop.number} · planned`, 'Missions to come'])
      expect(stop.texts.every((item) => item.dim)).toBe(true)
      expect(stop.y).toBeGreaterThan((chapter?.panel.y ?? 0) + (chapter?.panel.height ?? 0))
      expect(stop.y).toBeLessThan(chapter?.bottom ?? 0)
      expect(chapter?.texts.some((item) => item.text === 'planned' && item.style === 'tone-planned')).toBe(true)
    }
  })

  it('walks every stop in play order, inside its own stage', () => {
    const chapters = journeyChapters(longerJourneyFixture(true), SECOND_MISSION)
    const scene = layoutMap(chapters, WIDTH)
    expect(scene.stops.map((stop) => stop.stop.number)).toEqual(['1.1', '1.2', '2', '3', 'B', '4', '5', '6'])
    const stage = scene.chapters[0]
    for (const stop of missions(scene)) {
      expect(stop.chapterId).toBe('the-first-file')
      expect(stop.y).toBeGreaterThan(stage?.top ?? 0)
      expect(stop.y).toBeLessThan(stage?.bottom ?? 0)
      expect(stop.texts[0]?.text).toBe(stop.stop.number)
    }
  })

  it('switches back at each stage: the next row runs the other way', () => {
    // Stage 1 is the first row, so it runs left to right; the next one runs back.
    const scene = layoutMap(journeyChapters(longerJourneyFixture(true), SECOND_MISSION), WIDTH)
    const [first, second] = missions(scene)
    expect(first?.x).toBeLessThan(second?.x ?? 0)
    const nextRow = scene.stops[2]
    expect(nextRow?.x).toBeGreaterThan(first?.x ?? 0)
  })

  it('splits a stage into balanced rows when it is too long for the width', () => {
    const source = journeyFixture()
    const many = source.map((entry) =>
      entry.chapter.stage === 1
        ? {
            ...entry,
            missions: Array.from({ length: 9 }, (_, index) => ({
              mission: { ...FIRST_MISSION, id: `mission-${index}`, title: `Mission ${index}` },
              status: 'available' as const,
              attempts: 0,
              hintsUsed: 0,
            })),
          }
        : entry
    )
    const scene = layoutMap(journeyChapters(many, null), 500)
    expect(new Set(missions(scene).map((stop) => stop.y)).size).toBe(3)
  })

  it('starts the road at the edge of the first row and ends it at the last stop, the network under it', () => {
    const scene = layoutMap(today(), WIDTH)
    const first = scene.stops[0]
    const last = scene.stops[scene.stops.length - 1]
    expect(scene.start).toEqual({ x: EDGE, y: first?.y })
    expect(`${scene.road.reached} ${scene.road.ahead}`.startsWith(`M${EDGE} ${first?.y} `)).toBe(true)
    expect(scene.road.ahead.endsWith(`L${last?.x} ${last?.y}`)).toBe(true)
    expect(scene.terminus?.texts.map((item) => item.text)).toContain(END_WORDS.terminusName)
    expect(scene.terminus?.boxes).toHaveLength(4)
    expect(scene.terminus?.busY).toBeGreaterThan(last?.y ?? Number.POSITIVE_INFINITY)
  })

  it('inks the road from its start into the farthest stop in reach, and dashes it from there on', () => {
    const scene = layoutMap(today(), WIDTH)
    const here = scene.stops.find((stop) => stop.stop.here)
    const next = scene.stops[1]
    expect(scene.road.reached.startsWith(`M${EDGE} `)).toBe(true)
    expect(scene.road.reached.endsWith(`L${here?.x} ${here?.y}`)).toBe(true)
    expect(scene.road.ahead.startsWith(`M${here?.x} ${here?.y} `)).toBe(true)
    expect(scene.road.ahead).toContain(`L${next?.x} ${next?.y}`)
    expect(scene.road.reached).not.toContain(`L${next?.x} ${next?.y}`)
    const locked = layoutMap(journeyChapters(journeyFixture('locked'), null), WIDTH)
    expect(locked.road.reached).toBe('')
  })

  it('stands "you" on the mission Continue goes to, and nowhere without one', () => {
    const scene = layoutMap(today(), WIDTH)
    const stop = missions(scene)[0]
    expect(scene.here).toEqual({ key: FIRST_MISSION.id, x: stop?.x, y: stop?.y })
    expect(layoutMap(journeyChapters(journeyFixture('completed'), null), WIDTH).here).toBeNull()
  })

  it('cuts the overview headers to name and progress, the same stops and ends', () => {
    const chapters = today()
    const map = layoutMap(chapters, 460)
    const overview = layoutMap(chapters, 460, 'overview')
    expect(overview.height).toBeLessThan(map.height)
    expect(overview.here?.key).toBe(map.here?.key)
    expect(overview.chapters).toHaveLength(7)
    expect(overview.stops.map((stop) => stop.key)).toEqual(map.stops.map((stop) => stop.key))
    expect(overview.chapters[0]?.texts.map((item) => item.text)).toEqual([
      'STAGE 1 OF 6',
      'The First File',
      '0 of 1 passed',
    ])
  })

  it('lays nothing out before the content is loaded', () => {
    const scene = layoutMap([], WIDTH)
    expect(scene).toMatchObject({ chapters: [], stops: [], start: null, terminus: null, here: null })
  })
})
