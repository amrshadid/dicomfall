import type { JourneyChapter, MapScene, OverviewWindow } from '@features/map/types'
import { journeyStops } from '@features/map/utils/journey'
import { OVERVIEW_HERE_AT } from './map-layout.constants'

/** Centred on "you" (the sheet's top when nowhere) and kept inside the drawing; `view` in px. */
export function overviewWindow(scene: MapScene, view: number): OverviewWindow {
  if (view >= scene.height) {
    return { top: 0, height: scene.height, fadeTop: false, fadeBottom: false }
  }
  const wanted = scene.here ? scene.here.y - view * OVERVIEW_HERE_AT : 0
  const top = Math.round(Math.min(Math.max(0, wanted), scene.height - view))
  return { top, height: view, fadeTop: top > 0, fadeBottom: top + view < scene.height }
}

/** "You are at 1.1 What the File Says, in Stage 1, The First File; next: 1.2 … Open the Archive Map." */
export function overviewDescription(chapters: readonly JourneyChapter[]): string {
  const stops = journeyStops(chapters)
  const at = stops.findIndex((stop) => stop.here)
  const here = stops[at]
  if (!here) {
    return stops.length === 0
      ? 'The Archive Map: the stages of the journey are planned and no mission is built yet. Open the Archive Map.'
      : 'Every mission built so far is done. Open the Archive Map to replay one.'
  }
  const chapter = chapters.find((candidate) => candidate.id === here.chapterId)
  const next = stops[at + 1]
  return [
    `You are at ${here.number} ${here.title}, in `,
    chapter ? chapter.title.replace(': ', ', ') : here.heading,
    next ? `; next: ${next.number} ${next.title}.` : '.',
    ' Open the Archive Map.',
  ].join('')
}
