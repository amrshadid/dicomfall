# Bridge: On Disk and on the Wire

Mission specs for the Bridge, played between stage 3 and stage 4. Read [GAME.md](../GAME.md)
for the story, the guides and the vocabulary, [MISSIONS.md](../MISSIONS.md) for how a mission
is built and checked, and [concepts.md](concepts.md) for the concept chain.

**Who it's for:** a player who has finished stage 3: they can map a file, read any element,
and place an instance by its UIDs. They have never sent a file over a network, and do not yet
know what an association or an AE title is.

**Guide:** The Instance UID. **Stands for:** the seam between Part 10 (files) and Parts 7 and
8 (messages and the network).

The Bridge is three missions, about **50 minutes**, in one region. The instance travels for
the first time: what goes on the wire with it and what stays on disk (B.1); who decides how
its Data Set is encoded there, and how the receiver writes it down again (B.2). The capstone
(B.3) follows its SOP Instance UID through every place it appears.

| #   | Title                   | Id                        | Region                  | Time    | The one question                                                                                 |
| --- | ----------------------- | ------------------------- | ----------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| B.1 | No Envelope on the Wire | `no-envelope-on-the-wire` | On disk and on the wire | ~20 min | When the instance travels to another AE, what goes with it and what stays on disk?               |
| B.2 | The Agreed Syntax       | `the-agreed-syntax`       | On disk and on the wire | ~15 min | Who decides how the Data Set is encoded on the wire, and does the received file keep it?         |
| B.3 | One UID, Everywhere     | `one-uid-everywhere`      | On disk and on the wire | ~15 min | Capstone: can you follow one SOP Instance UID from the file, onto the wire and into the archive? |

**Where it leads:** stage 4, The Association, takes apart what the Bridge used as given: AE
titles, the SCU and SCP roles, the association and its presentation contexts, then C-ECHO and
C-STORE.

## Region

```yaml
regions:
  - id: on-disk-and-on-the-wire
    name: On disk and on the wire
    caption: the same SOP Instance UID in a file, in a DIMSE message, and in the received file
    guide: The Instance UID
    source: network/dimse.go, network/pdu.go, cli/storescu.go, cli/storescp.go, PS3.7 §6.3, §9.3.1, PS3.8 §9.3, PS3.10 §7.1
    missions: [no-envelope-on-the-wire, the-agreed-syntax, one-uid-everywhere]
```

## The lab of the Bridge

Two AEs, one link. The archive's receiver is started by the Machine; the player sends from the
workstation.

```yaml
lab:
  aes:
    - name: workstation
      title: WORKSTATION
      address: 10.0.1.1/24
    - name: archive
      title: ARCHIVE
      address: 10.0.1.2/24
      start:
        - go-dicom storescp -aet ARCHIVE -port 11112 -output /lab/archive/received
  links:
    - [workstation, archive]
  files:
    - { fixture: ct-explicit-le.dcm, to: /lab/ct-explicit-le.dcm }
    - { fixture: ct-implicit-le.dcm, to: /lab/ct-implicit-le.dcm }
  console: workstation
```

The send command, given whole by the Guide because its options are stage 4's to teach:

```
go-dicom storescu -aet WORKSTATION -aec ARCHIVE 10.0.1.2:11112 /lab/ct-explicit-le.dcm
```

Port 11112 is DICOM's registered port, used where the well-known port 104 is not (PS3.8
§9.1.1). The Bridge says once that the two AEs share one disk on the Machine, and that on a
real network `/lab/archive/received` would be on another computer.

## Engine dependency

Every mission of the Bridge reads the wire: the `association` and `received` checks, the Wire
inspector and the wire form of `selected` need go-dicom's event log (go-dicom #260), with
each PDU's raw bytes and each DIMSE message's Command Set. tcpdump on the link gives an
independent copy for the fact-check. The Bridge cannot be recorded before a go-dicom release
has the log.

## Facts the Bridge relies on

From the standard:

- A DIMSE message is a Command Set, followed by a Data Set when the command has one (PS3.7
  §6.3).
- The Command Set's elements are group 0000, and it is encoded as Implicit VR Little Endian
  elements whatever the presentation context's transfer syntax (PS3.7 §6.3.1).
- C-STORE-RQ (PS3.7 §9.3.1.1): Command Field (0000,0100) `0001H`; Affected SOP Class UID
  (0000,0002); Message ID (0000,0110); Priority (0000,0700), where `0000H` is medium; Command
  Data Set Type (0000,0800), any value but `0101H` meaning a Data Set follows; Affected SOP
  Instance UID (0000,1000). C-STORE-RSP's Command Field is `8001H`, and it carries Status
  (0000,0900) (PS3.7 §9.3.1.2).
- Group 0002 is used only in the File Meta Information (PS3.10 §7.1): the Data Set a C-STORE
  carries holds no File Meta Information, and the receiver writes its own when it stores a
  file.
- Messages travel in P-DATA-TF PDUs (type `04H`), as presentation data values. Bit 0 of each
  value's message control header says command (1) or data set (0); bit 1 says last fragment
  (PS3.8 §9.3.5, Annex E.2).
- The association request proposes presentation contexts: an abstract syntax (here the SOP
  Class) and one or more transfer syntaxes. The acceptor answers each with a result and one
  transfer syntax (PS3.8 §9.3.2.2, §9.3.3.2). The Data Set of a message on that context is
  encoded in the accepted transfer syntax (PS3.7 §6.3.1 [verify the exact place this is
stated; also PS3.8 §7.1.1.13]).

From go-dicom (v1.8.0 source, read, not run; each is [verify on the release]):

- `storescu` proposes, for each file, a context with the file's SOP Class and the file's own
  transfer syntax first, then Explicit VR Little Endian and Implicit VR Little Endian if those
  are not already it (`planStoreBatches`, `cli/storescu.go`).
- `storescp` accepts, for each context, the first proposed transfer syntax it supports, and it
  supports all of go-dicom's (`NegotiatePresentationContexts`, `network/presentation.go`).
- `storescp` writes each received instance to `<output>/<SOP Instance UID>.dcm`
  (`fileutil.InstanceFilePath`), and writes a native (uncompressed) Data Set as Explicit VR
  Little Endian whatever syntax it arrived in (`filewriter.StorageTransferSyntax`), with a
  new File Meta Information of its own (`cli/storescp.go`).

So, sending `ct-implicit-le.dcm`: the context proposes Implicit VR Little Endian first; the
archive accepts it; the Data Set crosses the wire in Implicit VR Little Endian; the archive's
file is Explicit VR Little Endian. Three encodings of one Data Set, one SOP Instance UID.

---

## B.1 — No Envelope on the Wire

- **Id:** `no-envelope-on-the-wire` · **Region:** On disk and on the wire · **Guide:** The
  Instance UID · **Time:** ~20 min
- **Question:** When the instance travels to another AE, what goes with it and what stays on
  disk?
- **The one new idea:** on the wire the instance is a DIMSE message: a Command Set of group
  0000 that says what to do and names the instance, then the Data Set; the File Meta
  Information stays home.
- **Teaches:** `dimse-message`, `command-set`, `file-meta-stays-home` · **Names:** `ae`,
  `ae-title`, `association`, `scu-scp`, `c-store`, `presentation-context`, `pdu` · **Uses:**
  `file-meta-information`, `data-set`, `sop-instance-uid`, `sop-class`, `tag`, `media-storage-uids`
- **Skill:** `send-and-find-the-instance` ("Send an instance and find it in the message that
  carried it") · **Prerequisites:** `place-and-describe-an-instance`

The Wire inspector opens for the first time. Seven stage 4 words are named, each in one plain
line beside the row that shows it, and none is relied on.

### Lab

As above. Files: `/lab/ct-explicit-le.dcm`.

### Objectives

| Id               | Text                                                                   | Check                                                                           |
| ---------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `archive-has-it` | Send our instance to the archive.                                      | `{ kind: received, ae: archive, sopInstanceUid: <from the manifest> }`          |
| `uid-on-wire`    | Mark, in the message that carried it, the element naming our instance. | `{ kind: selected, message: C-STORE-RQ, set: command, element: "(0000,1000)" }` |

### Beats

- **Scene.** The Instance UID: "Tonight I leave this disk for the archive. I go; my envelope
  doesn't."
- **See it.** The Lightbox: two AEs, workstation and archive, joined by a link. AE named in one
  line (a program that speaks DICOM, here one per namespace); the archive's receiver already
  running, named.
- **Build it.** The send command, given whole. Its output; the archive's folder, `ls
  /lab/archive/received`: a file named after the SOP Instance UID. The Wire tab: rows for the
  association (named), then the C-STORE request (named) and its response. The request's
  Command Set: group 0000. Mark (0000,1000).
- **Watch it.** Predict: "Did group 0002 cross the wire?" — yes / **no** / only the Transfer
  Syntax UID. The Data Set row starts at group 0008; the archive's file has a File Meta
  Information it wrote itself.
- **Debrief.** On disk, an envelope and a Data Set; on the wire, a Command Set and the same
  Data Set. The Agreed Syntax asks who chose its encoding.
- **Real world.** `go-dicom storescp -aet ARCHIVE -port 11112 -output received` in one shell,
  `go-dicom storescu -aec ARCHIVE localhost:11112 ct.dcm` in another.

### Hints

1. **Nudge:** "Open the Wire tab and find the row where the workstation hands the instance
   over."
2. **The idea:** "A DIMSE message starts with a Command Set, group 0000, which says what to do
   and with which instance."
3. **The spot:** "In the C-STORE-RQ's Command Set, the element (0000,1000) holds the SOP
   Instance UID."

### Chips

| Command                    | Explain                      |
| -------------------------- | ---------------------------- |
| `go-dicom storescu`        | send files to an AE          |
| `ls /lab/archive/received` | what the archive has written |
| `go-dicom show`            | every element of a file      |

### Codex (chapter: Bridge)

- **A DIMSE message** (`dimse-message`)
- **The Command Set** (`command-set`, deepens: `dimse-message`)
- **The envelope stays home** (`file-meta-stays-home`, deepens: `file-meta-information`)

### Field Guide

`go-dicom storescu`, `go-dicom storescp` (met as the archive's command; taught in stage 4).

### Debrief links

PS3.7 §6.3 (DIMSE messages), §9.3.1.1 (C-STORE-RQ); PS3.10 §7.1 (group 0002 only in the File
Meta Information); PS3.8 §9.3.5 (P-DATA-TF).

### Golden runs

- `start` (fails); `sent-only` (fails: `uid-on-wire` not marked); `marked-data-uid` (fails:
  marks (0008,0018) in the Data Set, not (0000,1000)); `both` (passes).

---

## B.2 — The Agreed Syntax

- **Id:** `the-agreed-syntax` · **Region:** On disk and on the wire · **Guide:** The Instance
  UID · **Time:** ~15 min
- **Question:** Who decides how the Data Set is encoded on the wire, and does the received file
  keep that encoding?
- **The one new idea:** the sender offers transfer syntaxes, the receiver accepts one, and the
  Data Set travels in it; the Command Set is always Implicit VR Little Endian; and the
  receiver chooses the encoding of the file it writes.
- **Teaches:** `negotiated-transfer-syntax`, `command-set-encoding`, `stored-encoding` ·
  **Names:** `presentation-context` · **Uses:** `transfer-syntax`, `implicit-vr`,
  `explicit-vr`, `default-transfer-syntax`, `dimse-message`, `command-set`,
  `same-object-other-bytes`, `file-meta-stays-home`
- **Skill:** `follow-the-encoding` ("Say how an instance is encoded on disk, on the wire, and
  in the received file") · **Prerequisites:** `send-and-find-the-instance`

The implicit file is sent. Its encoding changes twice, and its UID never.

### Lab

As above. Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id                | Text                                                                              | Check                                                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agreed-implicit` | Send the implicit file, so that it crosses the wire in Implicit VR Little Endian. | `{ kind: association, abstractSyntax: 1.2.840.10008.5.1.4.1.1.2, transferSyntax: 1.2.840.10008.1.2 }`                                                                                              |
| `stored-explicit` | The archive's copy is in Explicit VR Little Endian and holds our instance.        | `{ kind: file, file: /lab/archive/received/<UID>.dcm, transferSyntax: 1.2.840.10008.1.2.1, attributes: { "(0008,0018)": { sameAs: { file: /lab/ct-implicit-le.dcm, element: "(0008,0018)" } } } }` |

`stored-explicit` is met by B.1's way of sending too, and that is right: it is about what
the archive writes, whatever arrives. `agreed-implicit` is met only by sending the implicit
file [verify on the release that `storescu` offers the file's own syntax first].

### Beats

- **Scene.** The Instance UID: "Two files of me, two encodings. Which one does the wire use?"
- **See it.** The Wire tab's association row: the presentation context table (named: one SOP
  Class, the transfer syntaxes offered, the one accepted). For B.1's send: Explicit VR Little
  Endian offered first and accepted.
- **Build it.** Send `/lab/ct-implicit-le.dcm`. The table: Implicit VR Little Endian offered
  first and accepted. The Data Set's bytes on the wire: no VR letters. The Command Set's, in
  both sends: no VR letters either.
- **Watch it.** Predict: "The archive received Implicit VR Little Endian. Its file is…" —
  implicit / **explicit** / whichever the sender's file was. `go-dicom show
  /lab/archive/received/<UID>.dcm::0002,0010`: `1.2.840.10008.1.2.1`. The archive chose.
- **Debrief.** The wire's syntax is agreed per context; the file's is the writer's choice; the
  Command Set has one encoding. One UID, Everywhere follows the one thing that never changed.
- **Real world.** `go-dicom storescu -aec ARCHIVE localhost:11112 ct-implicit.dcm`, then
  `go-dicom show received/<UID>.dcm::0002,0010`.

### Hints

1. **Nudge:** "In the Wire tab, open the association row and read the table of contexts."
2. **The idea:** "The sender offers transfer syntaxes for each SOP Class; the archive accepts
   one, and the Data Set is encoded in it on the wire."
3. **The spot:** "The workstation offers a file's own transfer syntax first. Send the file
   whose Transfer Syntax UID is 1.2.840.10008.1.2."

### Chips

| Command             | Explain                               |
| ------------------- | ------------------------------------- |
| `go-dicom storescu` | send files to an AE                   |
| `go-dicom show`     | add `::0002,0010` for a file's syntax |

### Codex

- **The negotiated transfer syntax** (`negotiated-transfer-syntax`, deepens: `transfer-syntax`)
- **The Command Set's encoding** (`command-set-encoding`, deepens: `command-set`)
- **The stored encoding** (`stored-encoding`, deepens: `same-object-other-bytes`)

### Field Guide

None new.

### Debrief links

PS3.8 §9.3.2.2, §9.3.3.2 (presentation contexts proposed and accepted); PS3.7 §6.3.1 (the
Command Set's encoding); PS3.5 §10 (transfer syntaxes); PS3.10 §7.1.

### Golden runs

- `start` (fails); `explicit-sent` (fails: meets `stored-explicit` only); `implicit-sent`
  (passes).

---

## B.3 — One UID, Everywhere (capstone)

- **Id:** `one-uid-everywhere` · **Region:** On disk and on the wire · **Guide:** The Instance
  UID · **Time:** ~15 min
- **Question:** Can you follow one SOP Instance UID from the file, onto the wire and into the
  archive's file?
- **The one new idea:** none: the Bridge in one line, on the UID trail.
- **Teaches:** none · **Names:** none · **Uses:** `sop-instance-uid`, `media-storage-uids`,
  `file-meta-always-explicit`, `command-set`, `file-meta-stays-home`,
  `negotiated-transfer-syntax`, `stored-encoding`
- **Skill:** `trace-an-instance` ("Follow one instance's UID on disk and on the wire") ·
  **Prerequisites:** `follow-the-encoding`

One line: "Send the implicit file again, and show me our UID in every place it lives." The
lab starts with an empty receive folder.

### Lab

As above. Files: `/lab/ct-explicit-le.dcm`, `/lab/ct-implicit-le.dcm`.

### Objectives

| Id            | Text                                                       | Check                                                                           |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `in-meta`     | In the implicit file, mark the envelope's copy of the UID. | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: "(0002,0003)" }`     |
| `in-data-set` | Mark the Data Set's own.                                   | `{ kind: selected, file: /lab/ct-implicit-le.dcm, element: "(0008,0018)" }`     |
| `on-wire`     | Send it, and mark the UID in the request's Command Set.    | `{ kind: selected, message: C-STORE-RQ, set: command, element: "(0000,1000)" }` |
| `received`    | The archive holds it.                                      | `{ kind: received, ae: archive, sopInstanceUid: <from the manifest> }`          |

### Beats

- **Scene.** The Instance UID: "I have been in four places tonight and I was the same in every
  one. Prove it."
- **See it.** The UID trail, empty except the disk side.
- **Build it.** One line. The player marks both copies in the file, sends, marks the Command
  Set's.
- **Watch it.** The UID trail fills: (0002,0003) and (0008,0018) on disk, (0000,1000) on the
  wire, (0002,0003) and (0008,0018) in the archive's file. Predict: "And the Data Set on the
  wire?" — **yes, (0008,0018) is there too** / no.
- **Debrief.** One instance, one UID, five places. Stage 4 opens the association you have used
  three times without knowing its rules.
- **Real world.** `go-dicom show ct.dcm::0002,0003`, `::0008,0018`, the send, and
  `go-dicom show received/<UID>.dcm::0008,0018`.

### Hints

1. **Nudge:** "Start on disk: the UID is in the file twice."
2. **The idea:** "The envelope copies the instance's UID as Media Storage SOP Instance UID; the
   Data Set holds its own; the Command Set names it again on the wire."
3. **The spot:** "0002,0003 and 0008,0018 in the file; 0000,1000 in the C-STORE-RQ."

### Chips

| Command             | Explain                       |
| ------------------- | ----------------------------- |
| `go-dicom storescu` | send files to an AE           |
| `go-dicom show`     | add `::<tag>` for one element |

### Codex

No new cards. **You can now…**:

- tell the File Meta Information from a DIMSE Command Set;
- say which transfer syntax an instance has on disk, on the wire and in the received file;
- find one instance's SOP Instance UID in every place it appears.

### Field Guide

None new.

### Debrief links

PS3.10 §7.1; PS3.7 §9.3.1.1; PS3.3 §C.12.1.

### Golden runs

- `start` (fails); `disk-only` (fails); `sent-unmarked` (fails); `all-four` (passes).
