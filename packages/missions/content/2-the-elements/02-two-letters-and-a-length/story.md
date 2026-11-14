# Two Letters and a Length

**Question:** How does a reader know what kind of value comes next, and how long it is?

## Scene

> **VR:** In Four Bytes of Name the tag said which element it is. The next two bytes are mine: they say what kind of value follows. After them, two more say how many bytes that value takes. A reader that skips me might read a name as a number, or run past the end of a value into the next element. Tonight nobody reads a value without first reading me.

## See it

> **VR:** Select Modality again in `/lab/ct-explicit-le.dcm`, and read past its tag in the hex.

---

> **VR:** After `08 00 60 00` come `43 53`: in the text column, `CS`. Those two letters are the element's _VR_, its Value Representation, PS3.5 §6.2. They say what kind of value it is, and so how to read its bytes. `CS` is a code string, a short upper-case code. Others you will meet: `PN`, a person's name; `UI`, a UID; `US`, an unsigned 16-bit number, stored as two bytes rather than as text.

> **VR:** Then `02 00`: the _value length_, a little-endian number, 2. It counts the bytes of the value, and only the value: not the tag, not my letters, not itself. Then come those two bytes, `43 54`: `CT`. The element ends there, and the next tag begins. Ask go-dicom for the same element: `go-dicom show /lab/ct-explicit-le.dcm::0008,0060`.

---

```recorded go-dicom show /lab/ct-explicit-le.dcm::0008,0060
(recorded on the Machine)
```

> **VR:** The VR column is my two letters, read from the file's bytes. PS3.6 gives Modality the same VR, so here the bytes and the dictionary agree.

## Build it

> **VR:** Mark the two letters that give Modality its VR.

---

> **VR:** Now Patient's Name, `0010,0010`. Its VR is `PN`. Mark the two bytes of its length.

---

> **VR:** `0c 00`: 12 bytes of name. Last, the Transfer Syntax UID, `0002,0010`, at offset 244. Its length says 20, but the UID you read in stage 1 has 19 characters. The twentieth byte is `00`: _padding_. Every value's length is even, PS3.5 §7.1.1, so an odd value gets one byte more. Where does the next element start? Tag 4 bytes, VR 2, length 2, then the value. Give its offset.

---

> **VR:** 244, plus 8, plus 20: offset 272, and the tag there is `0002,0012`, Implementation Class UID, the next tag up in tag order.

## Watch it

> **VR:** Patient's Name, `FALLS^DICOM`, has 11 letters, and its length is 12. What fills the twelfth byte?
>
> - `00`, as in the UID
> - [x] a space, `20`
> - nothing: the length is wrong

---

> **VR:** A space, at offset 897. PS3.5 §6.2 pads each VR its own way: a text value with a space, `20`; a UID with `00`. The padding is counted in the length, but it is not part of the name: a reader removes it before it compares two values. So a name of 11 letters and one of 12 both take 12 bytes. The length tells you where the value ends; my letters tell you which padding to expect there.

## Debrief

> **VR:** Tag, VR, length: eight bytes, then the value, and the length is always even. With those, you can step from any element to the next. Some of my kind need more room than two bytes of length can count. The Long Form shows them.

## Real world

Read the VR and Length columns of every element in your own file, then one element alone:

```
go-dicom show ct.dcm
go-dicom show ct.dcm::0002,0010
go-dicom tag-doc 0010,0010
```

`tag-doc` gives the dictionary's VR for a tag; `show` gives the VR of the element in the file.
