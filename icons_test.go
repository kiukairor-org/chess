package main

import (
	"bytes"
	"flag"
	"fmt"
	"image"
	"image/color"
	"image/png"
	"math"
	"os"
	"strings"
	"testing"
)

// The knight icon is drawn here with the stdlib only. web/icon.svg and the PNGs in web/ are generated from this one
// shape; to change the icon, edit it and run `go test -run TestIconFiles . -update-icons`.
var updateIcons = flag.Bool("update-icons", false, "rewrite the icon files in web/")

// The knight silhouette (facing left) and its eye, in a 100x100 box.
var knightShape = [][2]float64{
	{24, 82}, {76, 82}, {76, 72}, {72, 52}, {62, 34}, {50, 24}, {49, 13}, {41, 20}, {34, 14}, {32, 28},
	{19, 47}, {21, 55}, {31, 58}, {42, 49}, {44, 55}, {36, 68}, {28, 72}, {24, 76},
}

const (
	eyeX, eyeY, eyeR = 38.0, 31.0, 3.5
	iconCorner       = 20.0
)

var (
	iconGreen = color.NRGBA{0x1F, 0x4D, 0x36, 0xFF}
	iconCream = color.NRGBA{0xF6, 0xEE, 0xD3, 0xFF}
)

func inKnight(x, y float64) bool {
	in := false
	for i, j := 0, len(knightShape)-1; i < len(knightShape); j, i = i, i+1 {
		a, b := knightShape[i], knightShape[j]
		if (a[1] > y) != (b[1] > y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0] {
			in = !in
		}
	}
	return in
}

func inRoundedSquare(x, y float64) bool {
	dx := math.Max(iconCorner-x, x-(100-iconCorner))
	dy := math.Max(iconCorner-y, y-(100-iconCorner))
	return dx <= 0 || dy <= 0 || dx*dx+dy*dy <= iconCorner*iconCorner
}

// renderIcon draws the icon; full makes the green square fill the image (no rounded corners).
func renderIcon(size int, full bool) []byte {
	img := image.NewNRGBA(image.Rect(0, 0, size, size))
	const ss = 4
	for py := 0; py < size; py++ {
		for px := 0; px < size; px++ {
			var r, g, b, n float64
			for sy := 0; sy < ss; sy++ {
				for sx := 0; sx < ss; sx++ {
					x := (float64(px) + (float64(sx)+0.5)/ss) * 100 / float64(size)
					y := (float64(py) + (float64(sy)+0.5)/ss) * 100 / float64(size)
					if !full && !inRoundedSquare(x, y) {
						continue
					}
					c := iconGreen
					if inKnight(x, y) && math.Hypot(x-eyeX, y-eyeY) > eyeR {
						c = iconCream
					}
					r, g, b, n = r+float64(c.R), g+float64(c.G), b+float64(c.B), n+1
				}
			}
			if n > 0 {
				img.SetNRGBA(px, py, color.NRGBA{uint8(r/n + 0.5), uint8(g/n + 0.5), uint8(b/n + 0.5), uint8(n/(ss*ss)*255 + 0.5)})
			}
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

func iconSVG() []byte {
	var pts []string
	for _, p := range knightShape {
		pts = append(pts, fmt.Sprintf("%g,%g", p[0], p[1]))
	}
	return []byte(fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
<rect width="100" height="100" rx="%g" fill="#1F4D36"/>
<polygon points="%s" fill="#F6EED3"/>
<circle cx="%g" cy="%g" r="%g" fill="#1F4D36"/>
</svg>
`, iconCorner, strings.Join(pts, " "), eyeX, eyeY, eyeR))
}

// The committed icon files are exactly what the drawing code produces (UPDATE_ICONS=1 rewrites them).
func TestIconFiles(t *testing.T) {
	files := map[string][]byte{
		"web/icon.svg": iconSVG(),
		// iOS rounds the touch icon itself, so it is a full-bleed square.
		"web/apple-touch-icon.png": renderIcon(180, true),
		"web/icon-192.png":         renderIcon(192, false),
		"web/icon-512.png":         renderIcon(512, false),
	}
	for name, want := range files {
		if *updateIcons {
			if err := os.WriteFile(name, want, 0o644); err != nil {
				t.Fatal(err)
			}
			continue
		}
		got, err := os.ReadFile(name)
		if err != nil || !bytes.Equal(got, want) {
			t.Errorf("%s is missing or stale: run go test -run TestIconFiles . -update-icons (%v)", name, err)
		}
	}
}
