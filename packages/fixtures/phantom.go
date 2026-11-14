package main

// Stored values are Hounsfield units plus 1024, matching Rescale Intercept
// -1024 and Slope 1, and all fit in 12 bits so Bits Stored 12 is honest.
const (
	storedAir         = 0    // -1024 HU
	storedLung        = 224  // -800 HU
	storedFat         = 924  // -100 HU
	storedSoftTissue  = 1064 // +40 HU
	storedContrast    = 1324 // +300 HU
	storedDenseInsert = 1824 // +800 HU
	storedBone        = 2224 // +1200 HU
)

const imageSize = 64

type disc struct {
	cx, cy, r int
	value     uint16
}

// phantom draws a cylinder with a bony shell and four inserts. variant moves
// the contrast insert's size so slices of one series differ visibly.
//
// Geometry is done on doubled integer coordinates so the image centre falls
// on a pixel corner (31.5, 31.5) without floating point, which keeps the
// output identical on every architecture.
func phantom(variant int) []uint16 {
	discs := []disc{
		{32, 32, 28, storedBone},
		{32, 32, 26, storedSoftTissue},
		{20, 32, 6, storedLung},
		{44, 32, 6, storedFat},
		{32, 19, 4, storedDenseInsert},
		{32, 45, 3 + variant%4, storedContrast},
	}
	px := make([]uint16, imageSize*imageSize)
	for y := 0; y < imageSize; y++ {
		for x := 0; x < imageSize; x++ {
			v := uint16(storedAir)
			for _, d := range discs {
				dx := 2*x + 1 - 2*d.cx
				dy := 2*y + 1 - 2*d.cy
				if dx*dx+dy*dy <= 4*d.r*d.r {
					v = d.value
				}
			}
			px[y*imageSize+x] = v
		}
	}
	return px
}
