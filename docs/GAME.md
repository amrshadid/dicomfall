# DICOMFall: the game

DICOMFall is a free, open-source game that teaches DICOM from zero: what a DICOM file holds,
how its bytes are laid out, how its elements are encoded, how an object is identified, and
then how two application entities agree to exchange it and move it across a network. It runs
entirely in the browser: every command the player types is real go-dicom on real Linux, so
there is nothing to install and no server.

This page is what we're building. [MISSIONS.md](MISSIONS.md) says how a mission is made,
[ROADMAP.md](ROADMAP.md) what comes next, and [`missions/`](missions/) holds the spec of
every mission and the [concept list](missions/concepts.md).

## 1. Who it's for

- Developers who have to read or write DICOM and have never opened a file byte by byte.
- Imaging informatics students.
- PACS engineers new to DICOM, or who know the screens of one product and want to know what
  is underneath.

Players don't need to know what a byte offset, a hexadecimal number or a UID is: the first
stage starts there.

## 2. The promise

After the last stage, a player can honestly say:

> **"I can open any DICOM file and explain every byte of it, and I can send it, find it and
> retrieve it on a network, and explain why it failed when it does."**

After 0.1.0 (stages 1 to 3 and the bridge), already:

> **"I can find the four parts of a DICOM file, read any element in it by hand in either
> little-endian encoding, say which study, series and instance it is, describe its image
> from its elements, and tell what of it travels on the wire."**

## 3. Design pillars

1. **Real go-dicom, real Linux.** Every AE is a network namespace on a real Linux kernel,
   running go-dicom's released CLI. What the player reads is what go-dicom and Linux print;
   nothing is re-implemented. Where the Machine differs from a real site, the game says so.
2. **See the invisible.** The File inspector ties each element to its bytes; the Wire
   inspector ties each message to its PDUs; the Lightbox ties the bytes to the picture and the
   UID to every place it appears.
3. **Show, then explain.** The player runs a command, or marks bytes, and reads the answer
   before any word explains it. One new idea per mission.
4. **The story carries the curriculum.** Every guide is a part of the standard and speaks as
   what it really does. The game always names the real term.
5. **Judged by outcome.** A mission is passed by what is true (the bytes found, the value
   read, the UID received, the status returned), never by which command was typed.
6. **Failure teaches.** No timers, free retries, Start over at any moment.
7. **Take it home.** Every mission ends with the go-dicom commands to do the same on the
   player's own machine.

## 4. Story

### Premise

The player joins a small imaging lab as its newest engineer. Tonight one CT scan has to reach
the archive: a single synthetic CT instance, one slice of 64 by 64 pixels belonging to a
fictional patient. Before it can be sent, someone has to be able to say what is in the file
and whether it is right.

The player follows that one instance the whole way: as bytes on a disk (stages 1 and 2), as
an object with an identity among others (stage 3), as the same object on the wire (the
bridge), and then through associations, queries and retrievals (stages 4 to 6). The instance's
SOP Instance UID is the thread: it never changes, and the Lightbox's UID trail shows it in
every place it appears.

### Guides

Characters from the standard, each with a portrait, as zebra and ospfd are in Peerfall. The
player never speaks; they act. Each guide speaks as what it really is. A metaphor names its
real term the first time it appears and says where it stops being true. Tone: calm, playful,
exact.

| Guide                         | Real thing                                                                             | Speaks in                   | Voice                                             |
| ----------------------------- | -------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------- |
| **The Preamble**              | the 128 bytes at the start of a Part 10 file (PS3.10 §7.1)                             | Stage 1, The First File     | dry humour; has nothing in it and knows it        |
| **VR**                        | the Value Representation: the two letters that say how a value is encoded (PS3.5 §6.2) | Stage 2, The Elements       | pedantic about encodings                          |
| **The Instance UID**          | the SOP Instance UID (0008,0018): the instance's name everywhere                       | Stage 3, The Object; Bridge | has never been anywhere twice                     |
| **The SCP**                   | the receiving side of a DIMSE service                                                  | Stage 4, The Association    | the receiving desk: polite, strict about contexts |
| **The Archive**               | a store that answers queries and retrievals                                            | Stage 5, Query and Retrieve | old, has everything, answers only a proper query  |
| **The Conformance Statement** | the document that says what an implementation supports (PS3.2)                         | Stage 6, Interoperability   | says what it can do, and holds you to it          |

go-dicom is not a character: it is the tool the player works with. **You** are root at an
AE's console, `workstation:~#`, and type every command.

## 5. The screen

Three columns, as Kernelfall's Guide · terminal · X-ray and Peerfall's Guide · terminal ·
topology:

| Column       | Holds                                                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Guide**    | the story step by step, the objectives (they tick by themselves), the chips, the three hints and the mission's Codex cards                                               |
| **Bench**    | the **Console** (a real shell in the selected AE, go-dicom on the path) above the **Inspector**, with its **File** and **Wire** tabs                                     |
| **Lightbox** | the image preview with its pixel elements beside it, the **UID trail** (Study ▸ Series ▸ SOP Instance, on disk and on the wire) and the **timeline** of the run's events |

- **File inspector.** go-dicom's element tree beside a hex pane. Selecting either side marks
  the same bytes in the other. The Part 10 regions are drawn as bands: preamble, prefix, File
  Meta Information, Data Set. Inside an element, tag, VR, length and value each have their
  own underline style and label as well as a colour. Sequences and items fold.
- **Wire inspector.** A sequence diagram between AEs: one row per A-ASSOCIATE-RQ, AC or RJ,
  P-DATA-TF, A-RELEASE and A-ABORT. A row opens to its fields and a field to its bytes.
  Presentation contexts are a table. A DIMSE message shows its Command Set apart from its Data
  Set.
- **Lightbox.** The preview is go-dicom's own rendering of the instance. The timeline is the
  events of the run in order.

Selections and pass or fail states always carry text and a symbol as well as colour
(✓ / ✗ / ◐). The whole game works from the keyboard, in light and dark themes. Below 1024px
the game shows a "needs a bigger screen" page.

## 6. Core systems

### The Machine

One Linux computer runs in the browser, and every AE is a network namespace inside it, with
its own address and its own go-dicom processes. All AEs share one disk: the fixtures sit in
`/lab/`, and each receiving AE writes to `/lab/<ae>/received/`. The game says so the first
time it matters (Bridge, B.1). Each mission's Real world shows the same commands on the
player's own files.

### The Archive Map

The map is the journey, ported feature for feature from Kernelfall's Kernel Map and
Peerfall's Peer Map: stages in play order, each with its regions, and each region with its
heading, caption, guide, source location, progress and line of stops. Missions open by skill.
A **Missions / Skills** switch names each stop by its mission or by its first skill. The side
panel shows Skill, Needs (each skill met or not), Time and the mission's Codex cards.

### Hints, chips and the Guide

The Guide speaks the story step by step and waits for the player's command or selection before
it explains the answer. Each mission has exactly three hints: a nudge, the idea, then the
spot. No hint gives a command, and hints cost nothing. Chips are commands the player can
click, each with a one-line explanation: a whole line in stage 1, later only a command's name.

### The Codex

Every concept the player learns becomes a **card**: the real term, a **Simple** explanation
(≤ 25 words), a **Deep** one with the standard's section and go-dicom's source behind it
(≤ 80 words), a link to the standard and a "try it" line. One chapter per stage, in play
order, each with a title page; cards in teaching order; a later card **deepens** an earlier
one; a finished chapter ends with **You can now…**.

The Codex also holds the **Field Guide**, one entry per go-dicom command with the mission that
first used it, and a **glossary** of every first-meeting word.

### The Dictionary

A searchable tag lookup (tag, keyword, name, VR, VM) generated from go-dicom's dictionary,
which follows PS3.6. It opens from any tag in the hex pane or the tree.

## 7. The mission loop (10–20 minutes each)

1. **Scene:** a guide sets up the problem in under a minute.
2. **See it:** the player looks with real commands and the inspector; the guide names what
   they see.
3. **Build it:** the player finds, predicts, sorts or sends, with guidance.
4. **Watch it:** the result. It often opens with a **Predict** beat: the player commits to
   what the bytes or the wire will show, then the Machine shows it. A wrong answer costs
   nothing.
5. **Debrief:** what was learned, in a few lines, and the hand-off to the next mission.
6. **Real world:** the same go-dicom commands on the player's own machine.

There is no Submit button. Objectives are judged after every command, selection and answer,
tick by themselves, and stay met.

## 8. The game's own words

A word in the story, the hints and the Codex has one meaning only, so a player never has to
unlearn one. `pnpm content:report` flags a word used outside its meaning. Inline code and
code blocks are the Machine's own text and are never flagged.

| Word            | Means                                                                                        | Never                                                                |
| --------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| you, the player | the lab's newest engineer, root at an AE's console                                           | "the user", "the student"                                            |
| the Machine     | the one Linux computer in the browser that every AE runs in                                  | an AE; "the emulator", "the VM", "the game"                          |
| the lab         | a mission's AEs, links and files, as it starts                                               | the Machine                                                          |
| AE              | an application entity: here, a namespace running go-dicom, named `workstation`, `archive`, … | a computer, a "node", a "server" or a "client"                       |
| AE title        | the AE's DICOM name, up to 16 characters: `ARCHIVE`                                          | the AE's name in the lab (`archive`), which is the prompt            |
| the console     | the shell at an AE's prompt, `workstation:~#`                                                | "the terminal" in the story (the Bench's panel is the Console)       |
| the fixture     | a synthetic file the game ships in `/lab/`, generated with go-dicom                          | "sample", "test data"; never "patient data"                          |
| the instance    | the one synthetic CT instance the player follows                                             | "the image", "the scan" said of the file                             |
| file            | a DICOM file on disk, as PS3.10 lays it out                                                  | the object it holds; "image"                                         |
| object          | what a file holds or the wire carries: a Data Set describing one thing                       | the file                                                             |
| mission         | one stop of a stage, played on its own lab                                                   | "level", "lesson"                                                    |
| stage           | one part of the journey, numbered 1 to 6, plus the Bridge                                    | "level", "act", "chapter"                                            |
| region          | a group of a stage's missions on one subject, with its own heading on the map                | a Part 10 region (always "the four regions of the file", or by name) |
| the Archive Map | the game's map of stages and missions                                                        | the archive AE                                                       |
| the inspector   | the Bench's File and Wire tabs                                                               | the Lightbox                                                         |
| mark, select    | highlight bytes in the inspector                                                             | "click on", "choose" for bytes                                       |
| offset          | a byte's position counted from the start of the file, from 0                                 | an address; a length                                                 |
| capstone        | a stage's last mission, which asks for the whole task in one line                            | "boss", "exam", "test"                                               |

## 9. Vocabulary: DICOM terms

Each term with a one-line plain definition and the mission that first teaches it. A term
named earlier is only named there: explained in one line, never relied on. Numbers are
missions (1.4 is stage 1's fourth; B.1 is the Bridge's first). Stage 4 terms are listed
because the bridge names them.

| Term                                      | Means                                                                                                                                                                                         | Taught |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| DICOM                                     | the standard for medical images and the information about them, in files and on networks                                                                                                      | 1.1    |
| DICOM file                                | a file that holds one DICOM object, laid out as PS3.10 says                                                                                                                                   | 1.1    |
| element (data element)                    | one entry of an object: a tag naming it, and its value                                                                                                                                        | 1.1    |
| byte, hexadecimal                         | a byte is 8 bits, written as two hex digits from `00` to `FF`                                                                                                                                 | 1.2    |
| offset                                    | where a byte sits, counted from the start of the file, from 0                                                                                                                                 | 1.2    |
| text in bytes                             | a text value's characters stored one byte each, readable in the hex pane's text column                                                                                                        | 1.2    |
| Part 10 file (DICOM File Format)          | preamble, prefix, File Meta Information, then the Data Set (PS3.10 §7)                                                                                                                        | 1.3    |
| preamble                                  | the first 128 bytes; DICOM gives them no meaning, and unused they are all `00`                                                                                                                | 1.3    |
| DICM prefix                               | the four letters `DICM` at offsets 128 to 131 that mark a DICOM file                                                                                                                          | 1.3    |
| File Meta Information                     | the elements of group 0002 that describe the file itself; always Explicit VR Little Endian. PS3.10 counts the preamble and prefix as part of it; the game names the group 0002 elements alone | 1.4    |
| group length                              | (0002,0000): how many bytes of group 0002 follow it                                                                                                                                           | 1.4    |
| Data Set                                  | the object's own elements, after the File Meta Information                                                                                                                                    | 1.4    |
| transfer syntax                           | the rules a Data Set is encoded by: VR written or not, byte order, compression                                                                                                                | 1.5    |
| UID                                       | a unique identifier: numbers joined by dots, at most 64 characters (PS3.5 §9)                                                                                                                 | 1.5    |
| little endian                             | a number stored least significant byte first: 2 is `02 00`                                                                                                                                    | 1.5    |
| tag                                       | an element's number, (group,element), four hex digits each                                                                                                                                    | 2.1    |
| tag order                                 | elements of a Data Set sit in increasing tag order                                                                                                                                            | 2.1    |
| data dictionary                           | the list of every standard tag with its name, keyword, VR and VM (PS3.6)                                                                                                                      | 2.1    |
| VR (Value Representation)                 | two letters that say what kind of value follows: `PN` a person's name, `UI` a UID, `US` a 16-bit number                                                                                       | 2.2    |
| value length                              | how many bytes the value takes; always even, except the undefined length `FFFFFFFF`                                                                                                           | 2.2    |
| padding                                   | the byte added to an odd value to make it even: a space for text, `00` for a UID                                                                                                              | 2.2    |
| long form                                 | the explicit layout of OB, OW, SQ, UN, UT and others: two reserved bytes, then a 4-byte length                                                                                                | 2.3    |
| binary VRs (OB, OW)                       | values that are raw bytes or 16-bit words, not text                                                                                                                                           | 2.3    |
| VM (Value Multiplicity)                   | how many values an element holds, separated by `\` in text                                                                                                                                    | 2.4    |
| explicit VR                               | each element carries its VR in the bytes                                                                                                                                                      | 2.5    |
| implicit VR                               | elements carry no VR; the reader takes it from the dictionary                                                                                                                                 | 2.5    |
| default transfer syntax                   | Implicit VR Little Endian, which every DICOM implementation must support                                                                                                                      | 2.5    |
| same object, other bytes                  | two transfer syntaxes encode the same values differently                                                                                                                                      | 2.6    |
| sequence (SQ)                             | an element whose value is a list of items                                                                                                                                                     | 2.7    |
| item                                      | one entry of a sequence: a small set of elements of its own, tag (FFFE,E000)                                                                                                                  | 2.7    |
| undefined length                          | length `FFFFFFFF`: the value ends at a delimitation item instead                                                                                                                              | 2.7    |
| information model                         | patient, study, series, instance: how DICOM files real-world things                                                                                                                           | 3.1    |
| study                                     | one examination of one patient, named by its Study Instance UID (0020,000D)                                                                                                                   | 3.1    |
| series                                    | the instances of a study made in one run of one modality, named by its Series Instance UID (0020,000E)                                                                                        | 3.2    |
| SOP Instance UID                          | (0008,0018): the name of one object, unique in the world                                                                                                                                      | 3.3    |
| UID root                                  | a UID's first components, which say who made it; `1.2.840.10008` is DICOM's own                                                                                                               | 3.3    |
| instance number                           | (0020,0013): a number for people to order instances by; not unique                                                                                                                            | 3.3    |
| SOP Class                                 | what kind of object it is, by UID: CT Image Storage is `1.2.840.10008.5.1.4.1.1.2`                                                                                                            | 3.4    |
| IOD                                       | the definition of which elements an object of a kind must hold (PS3.3)                                                                                                                        | 3.4    |
| Media Storage SOP Class and Instance UIDs | (0002,0002) and (0002,0003): the File Meta Information's copy of the object's class and instance                                                                                              | 3.4    |
| Rows, Columns                             | (0028,0010), (0028,0011): the image's height and width in pixels                                                                                                                              | 3.5    |
| Photometric Interpretation                | (0028,0004): how pixel values become colour; `MONOCHROME2` is greyscale, low is dark                                                                                                          | 3.5    |
| Pixel Data                                | (7FE0,0010): the image's pixel values                                                                                                                                                         | 3.5    |
| Bits Allocated, Bits Stored               | the bits each pixel takes in the file, and how many of them hold the value                                                                                                                    | 3.6    |
| Pixel Representation                      | (0028,0103): `0` unsigned, `1` two's complement                                                                                                                                               | 3.6    |
| Rescale Slope and Intercept               | turn a stored value into the CT value: slope × value + intercept, in Hounsfield units                                                                                                         | 3.6    |
| DIMSE message                             | what one AE sends another: a Command Set, sometimes followed by a Data Set                                                                                                                    | B.1    |
| Command Set                               | the elements of group 0000 that say what to do with the Data Set                                                                                                                              | B.1    |
| File Meta stays on disk                   | group 0002 belongs to files only and is never sent                                                                                                                                            | B.1    |
| negotiated transfer syntax                | the syntax both AEs accepted for a presentation context; the Data Set travels in it                                                                                                           | B.2    |
| Command Set encoding                      | a Command Set is always encoded as Implicit VR Little Endian                                                                                                                                  | B.2    |
| stored encoding                           | the receiver chooses the transfer syntax of the file it writes                                                                                                                                | B.2    |
| AE title                                  | named in B.1; taught in stage 4                                                                                                                                                               | 4      |
| association                               | named in B.1; taught in stage 4                                                                                                                                                               | 4      |
| SCU, SCP                                  | named in B.1; taught in stage 4                                                                                                                                                               | 4      |
| presentation context                      | named in B.1; taught in stage 4                                                                                                                                                               | 4      |
| C-STORE                                   | named in B.1; taught in stage 4                                                                                                                                                               | 4      |
| PDU                                       | named in B.1; taught in stage 4                                                                                                                                                               | 4      |

## 10. Words the stories avoid

| Avoid                                 | Why                                                                                                              | Say instead                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| "header", "DICOM header"              | used loosely for the File Meta Information, for the elements before Pixel Data, and for an element's first bytes | File Meta Information; the elements; the tag, VR and length      |
| "metadata"                            | vague: every element is data                                                                                     | the element's name, or "the elements"                            |
| "DICOM image", "the image" for a file | a file holds an object, and not every object is an image                                                         | the file; the instance; the image (only for the pixels)          |
| "field", "attribute" for an element   | "attribute" is PS3.3's word for what a module lists; "field" is no DICOM word                                    | element; attribute only when a module's table is meant (stage 3) |
| "tag" for a whole element             | the tag is only its number                                                                                       | element                                                          |
| "magic number", "signature"           | not DICOM's words                                                                                                | the DICM prefix                                                  |
| "server", "client"                    | DICOM's roles are per service, not per machine                                                                   | SCP, SCU (from stage 4), or the AE's name                        |
| "packet", "message" for a PDU         | a PDU is not a packet, and "message" is DIMSE's                                                                  | PDU; DIMSE message                                               |
| "PACS" for the archive AE             | a PACS is a whole system                                                                                         | the archive                                                      |
| "anonymous", "anonymized"             | the standard's word is de-identified (PS3.15)                                                                    | de-identified                                                    |
| "patient data", "real scan"           | nothing in the game is real                                                                                      | the fictional patient; the synthetic instance                    |
| "simply", "just", "easy", "obviously" | they tell a newcomer they should already know                                                                    | nothing                                                          |
| "basically", "kind of", "sort of"     | hedges                                                                                                           | the exact claim                                                  |
| "the VM", "the emulator"              | the game's internals                                                                                             | the Machine                                                      |

A picture used once and dropped teaches a second vocabulary; say the thing itself instead.
An analogy is allowed when it says where it stops being true, in the same step.
