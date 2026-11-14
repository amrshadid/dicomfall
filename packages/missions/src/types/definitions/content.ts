import type { GameContent, MissionId } from '@dicomfall/game/types'
import type { Story } from '#types/definitions/story'

export const CHAPTERS_FILE = 'chapters.yaml'
export const CONCEPTS_FILE = 'concepts.yaml'
export const FIELD_GUIDE_FILE = 'field-guide.yaml'
export const SKILLS_FILE = 'skills.yaml'
export const MISSION_FILE = 'mission.yaml'
export const STORY_FILE = 'story.md'

/** Every content file's text, keyed by its path in `content/`. */
export interface ContentFiles {
  readonly chapters: string
  readonly concepts: string
  readonly fieldGuide: string
  readonly skills: string
  /** `1-the-first-file/01-four-regions/mission.yaml` → its text. */
  readonly missions: Readonly<Record<string, string>>
  /** `1-the-first-file/01-four-regions/story.md` → its text. */
  readonly stories: Readonly<Record<string, string>>
}

/** The whole game's content, parsed and checked. */
export interface LoadedContent {
  /** What `configureGame({ content })` takes. */
  readonly game: GameContent
  /** The mission's paced story, every section its mission.yaml points at present. */
  readonly storyOf: (id: MissionId) => Story | undefined
  /** The mission's folder in `content/`, for error messages. */
  readonly folderOf: (id: MissionId) => string | undefined
}
