export { firstDifference, normaliseRecording } from '#utils/record/record-check.util'
export { labNetwork, startLine, startLogOf, startPort } from '#utils/record/record-lab.util'
export { labSkipReason, type MachineAbilities, needsGoDicom, skipReason } from '#utils/record/record-skip.util'
export {
  askedCommands,
  isPlaceholder,
  OWN_MACHINE_SECTION,
  RECORDED_PLACEHOLDER,
  type RecordedBlock,
  type RecordedStory,
  type RecordStep,
  readRecordedStory,
  recordPlan,
  replaceRecordedBodies,
  type TypedCommand,
  unsafeBody,
} from '#utils/record/recorded-block.util'
export { commandOutput, stripTerminalCodes } from '#utils/record/terminal-text.util'
