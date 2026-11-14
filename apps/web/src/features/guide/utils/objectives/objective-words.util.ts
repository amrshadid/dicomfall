import type { CheckResult, ElementPart, Part10Region } from '@dicomfall/game/types'
import type { GuideObjectiveState } from '@features/guide/types'

/** What a check found, in the Guide's words: its state, and the line under the objective. */
export interface ObjectiveWords {
  readonly state: GuideObjectiveState
  /** Under a met objective: what met it. */
  readonly evidence: string | null
  /** Under an open one: what the Machine shows instead; null where there is nothing to say yet. */
  readonly observed: string | null
}

const REGION_WORDS: Readonly<Record<Part10Region, string>> = {
  preamble: 'the preamble',
  prefix: 'the DICM prefix',
  'file-meta-information': 'the File Meta Information',
  'data-set': 'the Data Set',
}

const PART_WORDS: Readonly<Record<ElementPart, string>> = {
  tag: 'tag',
  vr: 'VR',
  length: 'length',
  value: 'value',
}

const RETRY = 'Try again: retries are free.'

const isRegion = (target: string): target is Part10Region => Object.hasOwn(REGION_WORDS, target)

/** Bytes as the inspector reads them out: first and last offset, both counted, and how many. */
export const bytesWords = (from: number, to: number): string =>
  `bytes ${from} to ${to - 1} (${to - from} byte${to - from === 1 ? '' : 's'})`

const targetWords = (target: string, part: ElementPart | null): string =>
  isRegion(target)
    ? REGION_WORDS[target]
    : part === null
      ? `element \`${target}\``
      : `the ${PART_WORDS[part]} of \`${target}\``

const open = (observed: string | null): ObjectiveWords => ({ state: 'open', evidence: null, observed })
const met = (evidence: string): ObjectiveWords => ({ state: 'met', evidence, observed: null })

function selectedWords(result: Extract<CheckResult, { kind: 'selected' }>): ObjectiveWords {
  const what = targetWords(result.target, result.part)
  const { marked, expected } = result
  if (result.passed && marked !== null) {
    return met(`you marked ${bytesWords(marked.from, marked.to)}, ${what}.`)
  }
  switch (result.failure) {
    case 'wrong_file':
      return open(`the marked bytes are in \`${marked?.file ?? ''}\`; this one asks about \`${result.file ?? ''}\`.`)
    case 'wrong_range': {
      if (marked === null || expected === null) {
        return open(null)
      }
      const marking = `you marked ${bytesWords(marked.from, marked.to)}`
      const overlaps = marked.from < expected.to && expected.from < marked.to
      if (!overlaps) {
        return open(`${marking}, which is not ${what}.`)
      }
      // Near, not right: said as a share, never as the offsets asked for.
      const inside = marked.from >= expected.from && marked.to <= expected.to
      const around = marked.from <= expected.from && marked.to >= expected.to
      return {
        state: 'partly',
        evidence: null,
        observed: `${marking}: ${inside ? `part of ${what}, not all of it` : around ? `${what} and more besides` : `part of ${what} and bytes outside it`}.`,
      }
    }
    case 'unreadable':
      return open(`go-dicom could not read \`${result.file ?? ''}\`.`)
    case 'no_element':
      return open(`go-dicom finds no ${what} in \`${result.file ?? ''}\`.`)
    case 'no_part':
      return open(`that element has no ${result.part === null ? 'such part' : PART_WORDS[result.part]} in this file.`)
    case 'no_region':
      return open(`go-dicom finds no ${what} in \`${result.file ?? ''}\`.`)
    case 'not_evaluated':
      return open('this is judged on the wire, which a later stage opens.')
    default:
      return open(null)
  }
}

/**
 * A check's evidence in words the player can act on. A wrong answer or offset says so plainly and
 * invites a retry, without the right value; a met one says what go-dicom read.
 */
export function objectiveWordsOf(result: CheckResult | null): ObjectiveWords {
  if (result === null) {
    return open(null)
  }
  switch (result.kind) {
    case 'selected':
      return selectedWords(result)
    case 'answer':
      if (result.passed) {
        return met(`go-dicom reads \`${result.expected ?? result.given ?? ''}\` in \`${result.element}\`.`)
      }
      return result.failure === 'wrong_value'
        ? open(`\`${result.given ?? ''}\` is not what the file holds there. ${RETRY}`)
        : result.failure === 'no_value'
          ? open(`go-dicom decodes no text value for \`${result.element}\`.`)
          : result.failure === 'unreadable'
            ? open(`go-dicom could not read \`${result.file}\`.`)
            : open(null)
    case 'offset':
      if (result.passed) {
        return met(`\`${result.element}\` starts at byte ${result.expected ?? result.given ?? ''}.`)
      }
      return result.failure === 'wrong_offset'
        ? open(`it does not start at byte ${result.given ?? ''}. ${RETRY}`)
        : result.failure === 'unreadable'
          ? open(`go-dicom could not read \`${result.file}\`.`)
          : open(null)
    case 'grouped': {
      const groups = result.by === 'study' ? 'studies' : 'series'
      if (result.passed) {
        return met(`every file sits under \`${result.into}\` in a folder of its own ${result.by}.`)
      }
      switch (result.failure) {
        case 'missing_files':
          return open(
            `${result.missing.length} file${result.missing.length === 1 ? ' is' : 's are'} not under \`${result.into}\` yet.`
          )
        case 'wrong_depth':
          return open(
            result.by === 'study'
              ? 'a file is not in a study folder directly under the folder.'
              : 'a file is not in a series folder inside a study folder.'
          )
        case 'mixed_folder':
          return open(`one folder holds files of two different ${groups}.`)
        case 'split_group':
          return open(`one ${result.by} is split over two folders.`)
        default:
          return open(null)
      }
    }
    case 'file': {
      if (result.passed) {
        return met(`go-dicom reads \`${result.file}\` with the transfer syntax and values asked for.`)
      }
      if (result.failure === 'wrong_transfer_syntax') {
        return open(`go-dicom reads it with \`${result.transferSyntax ?? ''}\`.`)
      }
      const wrong = result.attributes.find((attribute) => !attribute.passed)
      if (result.failure === 'wrong_attribute' && wrong !== undefined) {
        return open(
          wrong.found === null
            ? `it holds no \`${wrong.tag}\`.`
            : `\`${wrong.tag}\` holds \`${wrong.found}\`, not the value asked for.`
        )
      }
      return result.failure === 'unreadable' ? open(`go-dicom could not read \`${result.file}\`.`) : open(null)
    }
    case 'absent':
      if (result.passed) {
        return met(`\`${result.element}\` is gone from \`${result.file}\`.`)
      }
      return result.failure === 'still_present'
        ? open(`\`${result.file}\` still holds \`${result.element}\`.`)
        : result.failure === 'unreadable'
          ? open(`go-dicom could not read \`${result.file}\`.`)
          : open(null)
    default:
      return open('this is judged on the wire, which a later stage opens.')
  }
}
