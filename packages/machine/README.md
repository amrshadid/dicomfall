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

A download missing upstream is taken from the mirror (`DF_VM_MIRROR`, default the
`vm-mirror` release of this repository); the lock's checksum still decides what is built.

## The image

- Alpine 3.24 x86 minirootfs, the `linux-virt` kernel, `bash`, `iproute2`, `iproute2-tc`
  (netem) and `tcpdump`, every package pinned by version and SHA-256.
- Every file of `packages/fixtures/out/`, read at build time, under `/lab/fixtures/`.
- go-dicom's release binary at `/usr/local/bin/go-dicom`, once the lock pins one (below).

v86 fetches each file only when Linux opens it, from `flat/`, zstd-compressed and named by
its content, so a cached file never goes stale. `manifest.json` names the current image.

## go-dicom

go-dicom is used only as a published release binary from
[its releases](https://github.com/amrshadid/go-dicom/releases), pinned by version and by the
checksum in the release's own `SHA256SUMS`. It is never built, patched or copied from anywhere
else. v86 emulates a 32-bit PC, so only the `go-dicom-linux-386` asset runs; never pin another
architecture.

**No released version has a `go-dicom-linux-386` asset yet**, so the lock's `goDicom` is
`null`: the build warns and makes the image without go-dicom. The first release with it will be
v1.9.0. Once v1.9.0 is published with that asset:

1. Check the asset exists:
   `gh release view v1.9.0 -R amrshadid/go-dicom --json assets -q '.assets[].name'`
   lists `go-dicom-linux-386`.
2. Take its checksum from the release's own `SHA256SUMS`:
   `curl -sL https://github.com/amrshadid/go-dicom/releases/download/v1.9.0/SHA256SUMS | grep ' go-dicom-linux-386$'`
3. Replace `"goDicom": null` in `scripts/vm-image/vm-image.lock.json` with:

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

## Events

The event port (COM2) carries one line per event, `<source> <line>`, and
`utils/events/event-parser.util.ts` turns each into a stamped `MachineEvent`. Today the only
source is the game's own link faults. go-dicom's `-events` JSON-lines log is not released yet;
once it is, its lines are tailed into the port with `eventPortPipe('dicom <ae>')`, parsed by a
new entry in `PARSERS`, and every test of that parser uses lines copied from a real run.
