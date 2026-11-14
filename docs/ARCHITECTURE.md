# DICOMFall: architecture

How the code fits together. The code rules (layout, imports, file names) are in
[CONTRIBUTING.md](../CONTRIBUTING.md).

## Constraints

- **Client-side only.** A static site; everything runs in the player's browser. No backend,
  no account, and it works offline once loaded. One third-party service: Microsoft Clarity
  session recordings, loaded only when the build sets `VITE_CLARITY_ID` and the player
  allows it in the consent notice (or later in Settings → Privacy).
- **Real go-dicom on real Linux.** The Machine is a real Linux kernel running go-dicom's own
  command-line tool. What players see is what go-dicom reads, writes, sends and prints;
  nothing is re-implemented.
- **go-dicom is used as released.** The image pins a published
  [go-dicom release](https://github.com/amrshadid/go-dicom/releases) binary by version and
  checksum. It is never patched or rebuilt here. What it lacks is asked for on its issue
  tracker.
- **Synthetic data only.** Every DICOM file in the game is generated, and its generator is in
  `packages/fixtures`. No real patient data anywhere.
- **One source of truth.** The console, the inspector, the lightbox and the mission checks
  all read the same event stream and the same files.
- **Same start every time.** Every mission starts from the same saved boot and the same
  fixtures. Where timing matters, checks judge outcomes with a stated tolerance.
- **No timers on the player**, free retries, three staged hints.
- **Players start knowing nothing:** each term is explained next to the evidence on screen.

## The Machine

```
 ┌──────────────────────────── Web Worker ────────────────────────────┐
 │  v86 emulates a 32-bit PC running Alpine Linux                     │
 │                                                                    │
 │   netns modality ── veth ── netns archive ── veth ── netns viewer  │
 │     go-dicom storescu …       go-dicom storescp / qrscp …          │
 │                                                                    │
 │  /lab/        synthetic fixtures on a real disk                    │
 │  console      the player's shell, in the selected AE               │
 │  control      root's channel: setup, reset, faults, reads for checks│
 │  logs         go-dicom's output, tcpdump on the links              │
 └──────────────────────────────┬─────────────────────────────────────┘
                                │  MachineEvent (assoc_accepted, dimse_sent, …)
       ┌───────────┬────────────┼────────────┬────────────┐
    console    inspector     lightbox      checks     golden runs
```

- **Application entities are network namespaces.** An AE (modality, archive, viewer,
  workstation) is a namespace with its own address and its own go-dicom processes, joined to
  the others by veth pairs.
- **The network is real.** A C-STORE is a real TCP connection carrying real PDUs. C-MOVE's
  second association, back to its destination, is just more real TCP.
- **Faults** are real too: a stopped server, a wrong AE title, a closed port, a presentation
  context the server refuses, `tc netem` loss on a link.
- **Events** follow go-dicom's names, which follow pynetdicom's `EVT_*`: association
  requested, accepted, rejected, released and aborted; PDU, data and DIMSE sent and received;
  C-ECHO, C-STORE, C-FIND, C-MOVE and C-GET received. The game's names are their snake-case
  forms (`assoc_accepted`, `dimse_sent`, `cstore_received`).

The image is Alpine Linux for 32-bit x86 plus the go-dicom release binary, built from pinned,
checksummed downloads. Files are fetched only when Linux opens them.

## Packages

| Package    | Holds                                                                                  | Depends on    |
| ---------- | -------------------------------------------------------------------------------------- | ------------- |
| `core`     | the event bus, `ServiceResponse` and its error handler, the logger, storage keys       | nothing       |
| `theme`    | token values: palettes, typography, spacing, motion, colour utils                      | nothing       |
| `machine`  | the VM: v86 in a Web Worker, the image build, AE sessions, the event pipeline, hooks   | core          |
| `game`     | a pure engine: mission loop, checks, hints, saves; knows no mission by id              | core, machine |
| `missions` | the content ([MISSIONS.md](MISSIONS.md)), its loader, the recorder and the golden runs | game, machine |
| `fixtures` | the synthetic data generator and its outputs                                           | nothing       |
| `apps/web` | the game: pages, features, the design system                                           | all           |

Packages hold logic or values, never UI. `lab/` at the repository root runs go-dicom
against pynetdicom on one host, outside the browser, for cross-checks.

## The screen

Three columns: the **Guide** (story, objectives, hints, Codex cards), the **Bench** (the
console, and the inspector with its File and Wire tabs), and the **Lightbox** (the image
preview, the UID trail, the timeline of events).

- The File tab shows go-dicom's decoded element tree beside a hex pane; selecting either
  side highlights the same bytes in the other.
- The Wire tab is a sequence diagram of the association: each PDU a row, the presentation
  contexts as a table, a DIMSE message's Command Set apart from its Data Set.
- Pass and fail states carry text and a symbol as well as colour; the whole game works from
  the keyboard, in light and dark themes. Below 1024px the game shows a "needs a bigger
  screen" page.

## Storage

| Data                             | Where                                                |
| -------------------------------- | ---------------------------------------------------- |
| Settings, tour "seen" flags      | localStorage `dicomfall:v1:settings`                 |
| Progress, hints used, saved runs | localStorage `dicomfall:v1:profile:<slot>`           |
| The app and the image            | Cache Storage, by a service worker (production only) |

Writes are atomic, records are versioned (older saves migrate, newer ones are refused, never
overwritten), and without storage the game stays playable in memory and offers an export.

## Testing

All TypeScript on Vitest; tests sit next to the file they test. Missions have **golden
runs**: scripted player actions on the real image, booted in Node, judged by the mission's
own checks. Every fixture's decoded tree is compared with pydicom. `pnpm verify` runs lint,
types, tests and the build.
