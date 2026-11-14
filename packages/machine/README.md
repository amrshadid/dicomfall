# @dicomfall/machine

The Machine: real Alpine Linux (32-bit x86) in v86, in a Web Worker. Each application entity
(AE) is a network namespace, joined to others by veth pairs. The package holds the image build,
the VM session, root's control channel, the event stream and the hooks the web app uses.

## Commands

From the repository root:

- `pnpm vm:image` (`node packages/machine/scripts/vm-image/build.ts`) builds the image into
  `apps/web/public/vm/`, which git ignores. `--update` re-pins Alpine's packages in
  `vm-image.lock.json` (never go-dicom); `--out <dir>` writes the image elsewhere.
- `pnpm vm:mirror` (the same with `--mirror-out node_modules/.cache/dicomfall-vm-mirror`) also
  writes every pinned download, flat, with `SHA256SUMS`, for the `vm-mirror` release.
- `pnpm vm:check` (`node packages/machine/scripts/vm-check.ts`) boots the built image in Node,
  checks the Machine end to end and prints its timings.
- `pnpm --filter @dicomfall/machine vm:show-json` (`scripts/vm-show-json.ts`) builds a lab with
  the three fixtures the tests read, captures `go-dicom show <file> --json` for each into
  `src/test/show-json/`, and checks that `readMachineShow` gives the same tree on the Machine and
  refuses a file that is not DICOM. Run it again whenever the image's go-dicom changes.

A download missing upstream is taken from the mirror (`DF_VM_MIRROR`, default the
`vm-mirror` release of this repository); the lock's checksum still decides what is built.

## The image

- Alpine 3.24 x86 minirootfs, the `linux-virt` kernel, `bash`, `iproute2`, `iproute2-tc`
  (netem) and `tcpdump`, every package pinned by version and SHA-256.
- Every file of `packages/fixtures/out/`, read at build time, under `/usr/share/dicomfall/fixtures/`
  (`FIXTURES_DIR`). `/lab` is not in the image: building a lab makes it and copies in only the
  files the lab names, so `ls /lab` shows what the mission put there and nothing else.
- go-dicom's release binary at `/usr/local/bin/go-dicom`, once the lock pins one (below).

v86 fetches each file only when Linux opens it, from `flat/`, zstd-compressed and named by
its content, so a cached file never goes stale. `manifest.json` names the current image.

## go-dicom

go-dicom is used only as a published release binary from
[its releases](https://github.com/amrshadid/go-dicom/releases), pinned by version and by the
checksum in the release's own `SHA256SUMS`. It is never built, patched or copied from anywhere
else. v86 emulates a 32-bit PC, so only the `go-dicom-linux-386` asset runs; never pin another
architecture.

The lock pins **v1.9.0**, the first release with a `go-dicom-linux-386` asset. A release is
pinned this way:

1. Check the asset exists:
   `gh release view v1.9.0 -R amrshadid/go-dicom --json assets -q '.assets[].name'`
   lists `go-dicom-linux-386`.
2. Take its checksum from the release's own `SHA256SUMS`:
   `curl -sL https://github.com/amrshadid/go-dicom/releases/download/v1.9.0/SHA256SUMS | grep ' go-dicom-linux-386$'`
3. Set `goDicom` in `scripts/vm-image/vm-image.lock.json` to:

   ```json
   "goDicom": {
     "version": "1.9.0",
     "asset": "go-dicom-linux-386",
     "url": "https://github.com/amrshadid/go-dicom/releases/download/v1.9.0/go-dicom-linux-386",
     "sha256": "<the 64 hex digits from step 2>"
   }
   ```

4. Run `pnpm vm:image`. It downloads the asset, refuses it unless its SHA-256 matches the lock
   and its ELF header says 32-bit x86, and installs it at `/usr/local/bin/go-dicom`.
   `manifest.json`'s `goDicomVersion` names the version.
5. Run `pnpm vm:check`: it also runs `go-dicom --version` in the workstation's console.
6. Run `pnpm vm:mirror` and upload its files to the `vm-mirror` release, so the binary stays
   buildable from the mirror too.

A later release is pinned the same way: change all four fields together.

## go-dicom's reading of a file

The File inspector and the file checks read a file only as go-dicom reads it:
`go-dicom show <path> --json` (go-dicom #259, released in 1.9.0), never a parser of our own.

- `types/definitions/show.ts`: `ShowReading`, schemaVersion 1: `regions` (`preamble`, `prefix`,
  `fileMeta`, `dataSet`, each `offset` to `endOffset`), `transferSyntax`, `fileMeta` (with
  (0002,0000) first, which the text form of `show` leaves out) and `dataSet`, each element with
  `tagOffset`, `vrOffset` (null under implicit VR), `lengthOffset`, `lengthSize`, `valueOffset`,
  `valueLength`, `undefinedLength`, `endOffset`, its `value` as text and a sequence's `items`.
- `parseShowJson(text)` checks every field and refuses any other `schemaVersion` with an error
  that says so, rather than misreading it.
- `readMachineShow(control, path, ae?)` runs it as root over the control channel: in the AE's
  namespace for a file under `/lab/<ae>/received/` (or the AE given), stderr kept apart from the
  JSON. A file go-dicom read no element from is refused, as the text form refuses it.
  `readVmShow(path)` is the same on the running VM, and `useMachineControls().readShow` hands it to
  the app.
- `useFileReading(path)`: the tree and the raw bytes (root's base64 read) of one file, for the
  inspector, with `reload()` after a command.
- Tests read only captured output, and check every element's offsets against the fixture's bytes.

Seen on the Machine with go-dicom 1.9.0, and worked around here:

- With implicit VR, Pixel Data's `vr` is the dictionary's `OB or OW`, and its `value` is the 8192
  pixel bytes as text, where explicit VR leaves `value` out.
- `show --json` on a file that is not DICOM exits 0 with no elements, an empty transfer syntax UID
  and its warnings; the text form exits 1 ("does not look like a DICOM file").
- The text form has no (0002,0000), and `show <file>::0002,0000` fails (go-dicom #271); the JSON
  has it.

## Events

The event port (COM2) carries one line per event, `<source> <line>`, and
`utils/events/event-parser.util.ts` turns each into a stamped `MachineEvent`. Today the only
source is the game's own link faults. go-dicom's `-events` JSON-lines log is not released yet;
once it is, its lines are tailed into the port with `eventPortPipe('dicom <ae>')`, parsed by a
new entry in `PARSERS`, and every test of that parser uses lines copied from a real run.
