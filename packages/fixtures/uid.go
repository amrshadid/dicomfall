package main

import (
	"crypto/sha1"
	"fmt"
	"math/big"

	"github.com/amrshadid/go-dicom/uid"
)

// uidNamespace is the RFC 9562 URL namespace. Name-based (version 5) UUIDs in
// it are a pure function of the name, so every UID below is the same on every
// run and every machine, with no registered org root needed.
var uidNamespace = [16]byte{
	0x6b, 0xa7, 0xb8, 0x11, 0x9d, 0xad, 0x11, 0xd1,
	0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8,
}

// uidNamePrefix makes the names globally ours: two projects using the URL
// namespace only collide if they claim the same URL.
const uidNamePrefix = "https://github.com/amrshadid/dicomfall/packages/fixtures#"

// uuidV5 follows RFC 9562 section 5.5.
func uuidV5(namespace [16]byte, name string) [16]byte {
	h := sha1.New()
	h.Write(namespace[:])
	h.Write([]byte(name))
	var u [16]byte
	copy(u[:], h.Sum(nil))
	u[6] = (u[6] & 0x0f) | 0x50
	u[8] = (u[8] & 0x3f) | 0x80
	return u
}

// fixtureUID returns the UUID-derived UID of PS3.5 B.2: "2.25." followed by
// the UUID read as one unsigned 128-bit integer, in decimal with no leading
// zeros.
func fixtureUID(key string) string {
	u := uuidV5(uidNamespace, uidNamePrefix+key)
	n := new(big.Int).SetBytes(u[:])
	s := uid.UUIDDerivedRoot + "." + n.String()
	if !uid.New(s).IsValid() || len(s) > 64 {
		panic(fmt.Sprintf("fixture UID for %q is not a valid UID: %s", key, s))
	}
	return s
}
