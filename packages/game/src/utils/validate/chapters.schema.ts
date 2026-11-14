import type { StringRule, Validated } from '@dicomfall/core/types'
import { Issues, ObjectReader, reportDuplicates } from '@dicomfall/core/utils'
import { type ChapterDefinition, KEBAB_ID, type RegionDefinition } from '#types/definitions/mission'

const CHAPTER_KEYS = ['id', 'label', 'title', 'summary', 'story', 'guide', 'standsFor', 'outcomes', 'regions'] as const

// The initial stands in for a stage number in a mission's number (B.1), so it is a letter.
const LABEL: StringRule = { pattern: /^[A-Za-z][^\n\0]*$/, expected: 'one line starting with a letter, like Bridge' }

/** What the label's missions are numbered by: `B` for `Bridge`. */
const initialOf = (label: string): string => label.charAt(0).toUpperCase()

/** Stages count only the chapters with no label, so a Bridge leaves the numbers after it as they are. */
function numbered(chapters: readonly Omit<ChapterDefinition, 'stage' | 'heading' | 'numberPrefix'>[]) {
  let stage = 0
  return chapters.map((chapter): ChapterDefinition => {
    if (chapter.label !== undefined) {
      return { ...chapter, heading: chapter.label, numberPrefix: initialOf(chapter.label) }
    }
    stage += 1
    return { ...chapter, stage, heading: `Stage ${stage}`, numberPrefix: `${stage}` }
  })
}

const REGION_KEYS = ['id', 'name', 'caption', 'guide', 'source', 'missions'] as const

function readRegion(region: ObjectReader): RegionDefinition {
  region.rejectUnknownKeys(REGION_KEYS)
  const read = {
    id: region.string('id', KEBAB_ID),
    name: region.string('name'),
    caption: region.string('caption'),
    guide: region.string('guide'),
    source: region.string('source'),
    missions: region.stringList('missions', KEBAB_ID),
  }
  if (region.has('missions') && read.missions.length === 0) {
    region.issues.add(region.pathOf('missions'), 'expected at least one mission')
  }
  reportDuplicates(read.missions, region.pathOf('missions'), region.issues)
  return read
}

/**
 * Checks a parsed `chapters.yaml`: the curriculum's stages in order, whether or not a stage has
 * missions yet. A chapter's stage number is its place in the list among the chapters with no
 * `label`; a labelled chapter is called by its label, and its missions numbered by the label's
 * initial. Whether each region's missions exist and are the chapter's own, in play order, is
 * checked with the rest of the content.
 */
export function validateChapters(raw: unknown): Validated<readonly ChapterDefinition[]> {
  const issues = new Issues()
  const reader = new ObjectReader(raw, '', issues)
  reader.rejectUnknownKeys(['chapters'])
  const chapters = numbered(
    reader.list('chapters', (value, path) => {
      const chapter = new ObjectReader(value, path, issues)
      chapter.rejectUnknownKeys(CHAPTER_KEYS)
      const text = (key: string) => chapter.optional(key, (name) => chapter.string(name))
      const id = chapter.string('id', KEBAB_ID)
      const label = chapter.optional('label', (key) => chapter.string(key, LABEL))
      const read = {
        id,
        ...(label !== undefined && { label }),
        title: chapter.string('title'),
        summary: chapter.string('summary'),
      }
      const story = text('story')
      const guide = text('guide')
      const standsFor = text('standsFor')
      return {
        ...read,
        ...(story !== undefined && { story }),
        ...(guide !== undefined && { guide }),
        ...(standsFor !== undefined && { standsFor }),
        outcomes: chapter.has('outcomes') ? chapter.stringList('outcomes') : [],
        regions: chapter.has('regions')
          ? chapter.list('regions', (region, at) => readRegion(new ObjectReader(region, at, issues)))
          : [],
      }
    })
  )
  if (reader.has('chapters') && Array.isArray(reader.value('chapters')) && chapters.length === 0) {
    issues.add('chapters', 'expected at least one chapter')
  }
  reportDuplicates(
    chapters.map((chapter) => chapter.id),
    'chapters',
    issues
  )
  chapters.forEach((chapter, at) => {
    const earlier = chapters
      .slice(0, at)
      .find((other) => other.label !== undefined && other.numberPrefix === chapter.numberPrefix)
    if (chapter.label !== undefined && earlier?.label !== undefined) {
      issues.add(
        `chapters[${at}].label`,
        `"${chapter.label}" starts with "${chapter.numberPrefix}", as "${earlier.label}" does: their missions would share numbers`
      )
    }
  })
  return issues.result(chapters)
}
