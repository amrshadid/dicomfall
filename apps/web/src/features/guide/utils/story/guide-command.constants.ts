/** A command in the story's text: a span in backticks. */
export const CODE_SPAN = /`([^`]+)`/g

/**
 * Words that ask for the span right after them: "type `ls /lab`", "Then `go-dicom show …`". Case
 * matters: a lowercase "and" or "then" joins clauses far more often than it asks.
 */
export const ASKING_WORD = /(?:^|[\s(])(?:type|Type|run|Run|open|Open|Now|Then|And|First|with|Try)\s*$/

/** A colon or comma that introduces the span: "Look at the file: `go-dicom show /lab/ct.dcm`." */
export const INTRODUCING_MARK = /[:,]\s*$/

/**
 * What may follow a span a colon or comma introduced, for it to be the thing asked for: the end of
 * the sentence, or "then". "the element `(0002,0010)`: `UI`, the VR you met" names a word, it
 * doesn't ask for one.
 */
export const ENDS_THE_ASK = /^(?:[.!]|\s*$|,\s*then\b)/

/** A sentence that starts with the span ("`ls /lab`.", "`go-dicom info /lab/ct.dcm` again."). */
export const SENTENCE_START = /(?:^|[.!?]\s+)$/
export const SENTENCE_OF_ITS_OWN = /^(?:[.,!]|\s+again\b)/

/**
 * A span that can be typed as a command: it starts with a lowercase word, a path or a `?`. Left
 * out: names and output (`DICM`, `UI`, `Explicit VR Little Endian`), tags and numbers
 * (`(0002,0010)`, `128`), UIDs (`1.2.840.10008.1.2.1`), options (`-v`) and prompts (`workstation:~#`).
 */
export const LOOKS_TYPED = /^(?:[a-z][\w.-]*\??|\/\S*|\?)(?:\s|$)/
export const PROMPT_LIKE = /[#>]$/

/** A prompt in front of a finished command line: an AE's (`workstation:~# `) or the Machine's own. */
export const LEADING_PROMPT = /^[a-z][a-z0-9-]*:[~/]\S*# /

/** `"/lab/ct.dcm"` and `'/lab/ct.dcm'` are the same word to the shell. */
export const QUOTES = /["']/g
