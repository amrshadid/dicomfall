# DICOMFall: roadmap

Where the game stands and what comes next, so you can pick something to work on. Open an
issue before you start, so two people don't build the same thing.

## Where it stands

Early development. The repository, its tooling and the shared packages are in place. Nothing
is playable yet.

The in-browser Machine needs a 32-bit x86 Linux build of go-dicom, which go-dicom does not
publish yet
([amrshadid/go-dicom#258](https://github.com/amrshadid/go-dicom/issues/258)). The file
inspector and the network stages also wait on go-dicom outputs:

- byte ranges in `show`
  ([#259](https://github.com/amrshadid/go-dicom/issues/259));
- an event log on the network commands
  ([#260](https://github.com/amrshadid/go-dicom/issues/260)).

## Milestones

1. **0.1.0, the file side.** Stages 1 to 3 and the bridge, each mission fact-checked and
   played end to end. Works offline.
2. **0.2.0, the network.** Stages 4 and 5: association, C-ECHO, C-STORE, C-FIND, C-GET and
   C-MOVE.
3. **Later.** Stage 6, interoperability.

## Next up

- **The engine spike**, once go-dicom publishes a `linux-386` binary: boot it in the
  browser's Linux, measure it, and send a C-STORE between two namespaces.
- **The game engine and the web shell**, which don't wait on go-dicom: progress, saves,
  hints, Codex, the title screen, the Archive Map and settings.
- **The fixture generator:** one synthetic CT instance, checked against pydicom.
