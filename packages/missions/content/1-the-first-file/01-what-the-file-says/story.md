# What the File Says

**Question:** What does a DICOM file hold, and how do you read it?

## Scene

> **The Preamble:** Evening, engineer. I am the Preamble: the first 128 bytes of tonight's file, and there is nothing in me. The rest of the file is full. It holds one CT slice that has to reach the archive tonight, and nobody sends a file they cannot read. The patient is fictional, made up for this lab. So we read the file, starting the gentle way.

## See it

> **The Preamble:** You are root at the console, the prompt that reads `workstation:~#`. See what is on the disk: type `ls -l /lab`.

---

```recorded ls -l /lab
total 10
-rw-r--r--    1 root     root          9648 Jan  1  1970 ct-explicit-le.dcm
drwxr-xr-x    3 root     root             0 Jan  1  1970 fixtures
```

> **The Preamble:** One file, `ct-explicit-le.dcm`, 9648 bytes long. A byte is the smallest piece a file is counted in; the next mission looks at them one by one. Now ask go-dicom, the tool you work with, for a summary: `go-dicom info /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom info /lab/ct-explicit-le.dcm
(recorded on the Machine)
```

> **The Preamble:** A patient's name, an ID, a date, a modality, and 64 rows by 64 columns: the picture is 64 pixels high and 64 wide. The Lightbox on the right draws it.

> **The Preamble:** `info` read every one of those lines from the file itself. A photo file carries its pixels and little else; this file also says whose picture it is, when it was taken and how it was made, so an archive can file it and a viewer can show it correctly.

> **The Preamble:** That is what DICOM is for. Digital Imaging and Communications in Medicine is the standard for medical images and the information that goes with them, in files and on networks, so that a scanner, an archive and a viewer from different makers all read the same thing.

## Build it

> **The Preamble:** `info` picked a few lines. Now print all of them: `go-dicom show /lab/ct-explicit-le.dcm`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm
(recorded on the Machine)
```

> **The Preamble:** One line per _element_: one numbered entry of the file, with a value. `Tag` is the element's number, `VR` two letters for the kind of value, `Length` how many bytes the value takes, and `Value` the value itself. Stage 2 opens the tag and the VR; for now, a number and a value.

> **The Preamble:** The line tagged `0008,0060` is Modality: the kind of equipment that made the picture. Give its value beside the objective.

---

> **The Preamble:** `CT`, computed tomography: X-rays taken from all around the body, turned into slices. Now the line tagged `0010,0010`, Patient's Name. Give it the same way.

---

> **The Preamble:** `FALLS^DICOM`. The `^` separates the family name from the given name.

## Watch it

> **The Preamble:** Every line was short, yet the file is 9648 bytes. Where is the picture in this list?
>
> - nowhere: the Lightbox draws it from somewhere else
> - [x] in one element near the end, with a very long value
> - spread over every element

---

> **The Preamble:** Look at the last line of `show`: tag `7FE0,0010`, Pixel Data, with a length of 8192. That is 64 times 64 pixels, two bytes each: the same bytes the Lightbox drew. The picture is one element among the others. The rest describe it: whose it is, when, from which equipment, how big. Stage 3 reads how they describe it.

## Debrief

> **The Preamble:** A DICOM file holds one object, and the object is a list of elements: a number and a value each, the picture among them. go-dicom read them for you, and printed what it understood. In Under the Words, you read them without its help.

## Real world

With go-dicom installed, on any DICOM file of your own:

```
go-dicom info ct.dcm
go-dicom show ct.dcm
go-dicom show ct.dcm --top
```

`--top` leaves out the elements nested inside other elements, which stage 2 opens.
