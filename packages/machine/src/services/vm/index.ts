// vm.worker.ts is the worker's entry point, not a module to import: it starts a VM when loaded.
export {
  connectVm,
  disconnectVm,
  onVmOutput,
  readVmFile,
  readVmShow,
  resizeVmTerminal,
  restoreVmSlot,
  runVmControl,
  saveVmSlot,
  selectVmAe,
  sendToVm,
  setupVmNetwork,
  setVmLinkLoss,
} from '#services/vm/vm-connection.service'
export { CONTROL_LOST, createVmControl } from '#services/vm/vm-control.service'
export { installVmFileCache, loadVmFile, resetVmFiles } from '#services/vm/vm-files.service'
export { readMachineFile } from '#services/vm/vm-read.service'
export { createVmSession } from '#services/vm/vm-session.service'
export { readMachineShow } from '#services/vm/vm-show.service'
export { loadVmState, saveVmState } from '#services/vm/vm-state.service'
