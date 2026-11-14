# No Letters

**Question:** How can an element leave out its VR and still be read?

## Scene

> **VR:** In stage 1 you mapped a second file, `/lab/ct-implicit-le.dcm`, and saw that its Data Set had no two-letter VRs between the tags. In that file I am not written down at all. Someone still has to know me, or not one of its values can be read: a name, a date and a 16-bit number are all bytes, and nothing in the bytes says which is which. Today you find out who knows me there.

## See it

> **VR:** Open `/lab/ct-implicit-le.dcm` in the File inspector and select Patient's Name, `0010,0010`.

---

> **VR:** `10 00 10 00`, the same tag as in the first file. Then `0c 00 00 00`: four bytes of length, 12. Then `FALLS^DICOM` and its space. No `PN` anywhere. This is _implicit VR_, PS3.5 §7.1.3: every element is a tag, a four-byte length and the value, nothing else. The first file is _explicit VR_, PS3.5 §7.1.2: every element carries my letters, as you have read for three missions. The Transfer Syntax UID you read in stage 1 says which one a file uses, and here it is `1.2.840.10008.1.2`, Implicit VR Little Endian.

> **VR:** Ask go-dicom for the element: `go-dicom show /lab/ct-implicit-le.dcm::0010,0010`.

---

```recorded go-dicom show /lab/ct-implicit-le.dcm::0010,0010
0010,0010    PN  12      FALLS^DICOM
```

> **VR:** go-dicom still prints a VR. It could not read one from the file. It read the tag, looked it up in the data dictionary, and took the VR that PS3.6 gives Patient's Name: `PN`. In implicit VR, the dictionary is the only place I am written.

## Build it

> **VR:** Mark the whole Patient's Name element in the implicit file, from its tag to its last byte of padding.

---

> **VR:** Now mark its length: the four bytes after the tag. In the first file, the same name had two bytes of length, after `PN`; here the length takes the room my letters left.

---

> **VR:** Where does Patient ID start in this file? Tag 4 bytes, length 4, then the value. In implicit VR that makes 8 bytes before every value, whatever its VR. Give the offset.

---

> **VR:** 872, plus 8, plus 12: offset 892. You walked an element without knowing its VR. To read the value, a reader still needs it; to step over the value, it needs only the length. In the first file, Patient ID starts at 898: same object, other offsets.

## Watch it

> **VR:** If implicit VR drops me from every element, why does DICOM keep it?
>
> - it makes every file smaller
> - [x] it is the default that every DICOM implementation must support
> - it is faster to read

---

> **VR:** PS3.5 §10.1 makes Implicit VR Little Endian, `1.2.840.10008.1.2`, DICOM's _default transfer syntax_: two programs that share nothing else still share this one. Smaller, rarely: a short-form element takes 8 bytes before its value either way, and only the long form saves four. The price is the dictionary, and it has a gap. A private element, defined by a vendor, is not in PS3.6, so a reader without that vendor's dictionary cannot know its VR.

## Debrief

> **VR:** Explicit VR carries my letters; implicit VR leaves me to the dictionary, and every length takes four bytes. A reader needs the Transfer Syntax UID to know which it faces. Both files hold one object. The Same Object Twice lays them side by side.

## Real world

Read an element of a file in Implicit VR Little Endian, and ask the dictionary for the VR the reader used:

```
go-dicom show ct-implicit.dcm::0010,0010
go-dicom show ct-implicit.dcm::0002,0010
go-dicom tag-doc 0010,0010
```

The second line shows the file's Transfer Syntax UID: `1.2.840.10008.1.2` is Implicit VR Little Endian.
