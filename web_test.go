package main

import (
	"encoding/json"
	"fmt"
	"image/png"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
	"testing/fstest"
)

func fakeSite() fs.FS {
	return fstest.MapFS{
		"index.html":                     {Data: []byte("<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n</head></html>")},
		"js/app.js":                      {Data: []byte("var a = 1;")},
		"js/deep/x.js":                   {Data: []byte("var x = 1;")},
		"vendor/chess.js":                {Data: []byte("var Chess;")},
		"vendor/stockfish-17.1-x.wasm":   {Data: []byte("\x00asm\x01\x00\x00\x00")},
		"vendor/stockfish-COPYING.txt":   {Data: []byte("GNU GENERAL PUBLIC LICENSE")},
		"vendor/stockfish-17.1-x.js":     {Data: []byte("var sf;")},
		"secret.txt":                     {Data: []byte("not served")},
		"vendor/.hidden":                 {Data: []byte("x")},
		"vendor/chess.js.LICENSE":        {Data: []byte("BSD")},
		"vendor/stockfish-17.1-asm-y.js": {Data: []byte("var asm;")},
	}
}

func do(t *testing.T, site fs.FS, method, path string, hdr ...string) *httptest.ResponseRecorder {
	t.Helper()
	mux := http.NewServeMux()
	registerStatic(mux, site)
	req := httptest.NewRequest(method, path, nil)
	for i := 0; i+1 < len(hdr); i += 2 {
		req.Header.Set(hdr[i], hdr[i+1])
	}
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func TestStaticContentTypesAndCaching(t *testing.T) {
	old := version
	version = "abc123"
	defer func() { version = old }()
	for _, tc := range []struct{ path, ctype, cache string }{
		{"/js/app.js", "text/javascript; charset=utf-8", "no-cache"},
		{"/vendor/chess.js", "text/javascript; charset=utf-8", "no-cache"},
		{"/vendor/stockfish-COPYING.txt", "text/plain; charset=utf-8", "no-cache"},
		{"/vendor/stockfish-17.1-x.wasm", "application/wasm", "public, max-age=31536000, immutable"},
		{"/vendor/stockfish-17.1-x.js", "text/javascript; charset=utf-8", "public, max-age=31536000, immutable"},
	} {
		rec := do(t, fakeSite(), http.MethodGet, tc.path)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s: got %d", tc.path, rec.Code)
		}
		if got := rec.Header().Get("Content-Type"); got != tc.ctype {
			t.Errorf("%s: content-type %q, want %q", tc.path, got, tc.ctype)
		}
		if got := rec.Header().Get("Cache-Control"); got != tc.cache {
			t.Errorf("%s: cache-control %q, want %q", tc.path, got, tc.cache)
		}
	}
}

func TestStaticRevalidation(t *testing.T) {
	old := version
	version = "abc123"
	defer func() { version = old }()
	rec := do(t, fakeSite(), http.MethodGet, "/js/app.js")
	if etag := rec.Header().Get("ETag"); etag != `"abc123"` {
		t.Fatalf("etag %q", etag)
	}
	if rec := do(t, fakeSite(), http.MethodGet, "/js/app.js", "If-None-Match", `"abc123"`); rec.Code != http.StatusNotModified {
		t.Fatalf("same version: got %d, want 304", rec.Code)
	}
	if rec := do(t, fakeSite(), http.MethodGet, "/js/app.js", "If-None-Match", `"older"`); rec.Code != http.StatusOK {
		t.Fatalf("other version: got %d, want 200", rec.Code)
	}
}

func TestStaticRefusals(t *testing.T) {
	for _, tc := range []struct {
		method, path string
		want         int
	}{
		{http.MethodGet, "/js/missing.js", http.StatusNotFound},
		{http.MethodGet, "/js/deep/x.js", http.StatusNotFound},         // one path segment only
		{http.MethodGet, "/secret.txt", http.StatusNotFound},           // only /, js/ and vendor/ are served
		{http.MethodGet, "/index.html", http.StatusNotFound},           // the page lives at /
		{http.MethodGet, "/js/", http.StatusNotFound},                  // no directory listing
		{http.MethodGet, "/vendor/", http.StatusNotFound},              // no directory listing
		{http.MethodGet, "/js/..%2fsecret.txt", http.StatusBadRequest}, // traversal is refused outright
		{http.MethodPost, "/js/app.js", http.StatusMethodNotAllowed},
		{http.MethodPost, "/", http.StatusMethodNotAllowed},
	} {
		if rec := do(t, fakeSite(), tc.method, tc.path); rec.Code != tc.want {
			t.Errorf("%s %s: got %d, want %d", tc.method, tc.path, rec.Code, tc.want)
		}
	}
}

func TestHeadHasNoBody(t *testing.T) {
	rec := do(t, fakeSite(), http.MethodHead, "/vendor/stockfish-17.1-x.wasm")
	if rec.Code != http.StatusOK || rec.Body.Len() != 0 || rec.Header().Get("Content-Type") != "application/wasm" {
		t.Fatalf("got %d, %d bytes, %q", rec.Code, rec.Body.Len(), rec.Header().Get("Content-Type"))
	}
}

func TestPageGetsBrowserAgent(t *testing.T) {
	old := browserAgent
	browserAgent = []byte("<script>/*rum*/</script>\n")
	defer func() { browserAgent = old }()
	rec := do(t, fakeSite(), http.MethodGet, "/")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "<meta charset=\"utf-8\">\n<script>/*rum*/</script>") {
		t.Fatalf("got %d %q", rec.Code, rec.Body.String())
	}
}

// The real embedded page: a full HTML document whose local scripts are all served.
func TestEmbeddedPage(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	page := rec.Body.String()
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "text/html; charset=utf-8" || rec.Header().Get("Cache-Control") != "no-cache" {
		t.Fatalf("got %d %q %q", rec.Code, rec.Header().Get("Content-Type"), rec.Header().Get("Cache-Control"))
	}
	if !strings.HasPrefix(page, "<!doctype html>\n") || !strings.Contains(page, "<title>Knight School</title>") ||
		!strings.Contains(page, `<meta name="viewport"`) {
		t.Fatalf("not the Knight School document: %.120q", page)
	}
	// The views are switched with the `hidden` attribute while their CSS sets `display`: without this base rule
	// every view and the lesson-finish panel show at once.
	if !strings.Contains(page, "[hidden]{display:none!important}") {
		t.Fatal("the page lost its [hidden] base rule")
	}
	scripts := regexp.MustCompile(`<script src="(js/[^"]+)"`).FindAllStringSubmatch(page, -1)
	if len(scripts) < 4 {
		t.Fatalf("expected the app scripts in the page, found %v", scripts)
	}
	for _, m := range scripts {
		rec := httptest.NewRecorder()
		newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/"+m[1], nil))
		if rec.Code != http.StatusOK || rec.Body.Len() == 0 {
			t.Errorf("/%s: got %d, %d bytes", m[1], rec.Code, rec.Body.Len())
		}
	}
}

// Play-mode hints are capped per game, the count is saved with the game and shown on the button; lesson hints
// stay unlimited. (No JS runner in CI, so this pins the wiring in the shipped script and page.)
func TestPlayHintLimit(t *testing.T) {
	get := func(path string) string {
		rec := httptest.NewRecorder()
		newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec.Body.String()
	}
	js, page := get("/js/app.js"), get("/")
	for _, want := range []string{
		"var MAX_HINTS = Profiles.HINTS_PER_GAME;",                   // the one named constant (10, see profiles.js)
		"hints: this.hintsLeft, lim: MAX_HINTS",                      // saved with the game in progress, tagged with its limit
		"this.hintsLeft = g.hints;",                                  // restored on resume
		"this.hintsLeft = MAX_HINTS;",                                // reset by a new game
		"'Hint (' + this.hintsLeft + ' left)'",                       // label
		"if (this.hintsLeft < 1) {",                                  // showHint refuses at 0 and says why
		"No hints left: you used all ' + MAX_HINTS + ' in this game", // the refusal message
		"self.hintsLeft--;",
		"Strategy.describe(self.game, u, Lessons) || ''", // strategy note, empty falls back to the plain hint
	} {
		if !strings.Contains(js, want) {
			t.Errorf("app.js lost %q", want)
		}
	}
	profiles := get("/js/profiles.js")
	if !strings.Contains(profiles, "var HINTS_PER_GAME = 10,") {
		t.Error("the hint limit is not 10")
	}
	if !strings.Contains(page, `<script src="js/strategy.js"></script>`) {
		t.Error("page does not load strategy.js")
	}
	if !strings.Contains(page, `id="playHint">Hint (10 left)</button>`) {
		t.Error("play hint button does not show the remaining hints")
	}
	if !strings.Contains(page, `id="lsnHint">Hint</button>`) || !strings.Contains(js, "$('lsnHint').disabled = this.solved;") {
		t.Error("lesson hint button must stay unlimited")
	}
}

// The icon, PNGs and manifest are served from the root with the right types, the page links them, and the
// manifest lists icons that exist at the sizes it claims.
func TestIconsAndManifest(t *testing.T) {
	get := func(path string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec
	}
	for path, ctype := range rootFiles {
		rec := get("/" + path)
		if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != ctype || rec.Body.Len() == 0 {
			t.Errorf("%s: got %d %q, want 200 %q", path, rec.Code, rec.Header().Get("Content-Type"), ctype)
		}
	}
	if len(rootFiles) != 5 {
		t.Errorf("expected svg, three PNGs and the manifest, got %d files", len(rootFiles))
	}
	page := get("/").Body.String()
	for _, want := range []string{
		`<link rel="icon" type="image/svg+xml" href="/icon.svg">`,
		`<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
		`<link rel="manifest" href="/manifest.webmanifest">`,
	} {
		if !strings.Contains(page, want) {
			t.Errorf("page head lacks %s", want)
		}
	}
	var m struct {
		Name  string `json:"name"`
		Icons []struct {
			Src, Sizes, Type string
		} `json:"icons"`
	}
	if err := json.Unmarshal(get("/manifest.webmanifest").Body.Bytes(), &m); err != nil || m.Name != "Knight School" {
		t.Fatalf("manifest: %v, name %q", err, m.Name)
	}
	seen := map[string]bool{}
	for _, ic := range m.Icons {
		rec := get(ic.Src)
		if rec.Code != http.StatusOK {
			t.Errorf("manifest icon %s: got %d", ic.Src, rec.Code)
			continue
		}
		seen[ic.Sizes] = true
		if ic.Type == "image/png" {
			cfg, err := png.DecodeConfig(rec.Body)
			if err != nil || ic.Sizes != fmt.Sprintf("%dx%d", cfg.Width, cfg.Height) {
				t.Errorf("%s: sizes %q but decoded %v (%v)", ic.Src, ic.Sizes, cfg, err)
			}
		}
	}
	if !seen["192x192"] || !seen["512x512"] {
		t.Errorf("manifest must list 192 and 512 icons, got %v", seen)
	}
	cfg, err := png.DecodeConfig(get("/apple-touch-icon.png").Body)
	if err != nil || cfg.Width != 180 || cfg.Height != 180 {
		t.Errorf("apple-touch-icon: %v %v, want 180x180", cfg, err)
	}
}

// At 16px the knight must still show: sampled on a 16x16 grid, the cream silhouette covers a good share.
func TestIconIsLegibleSmall(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/icon-192.png", nil))
	img, err := png.Decode(rec.Body)
	if err != nil {
		t.Fatal(err)
	}
	cream := 0
	for y := 0; y < 16; y++ {
		for x := 0; x < 16; x++ {
			r, g, b, _ := img.At(x*12+6, y*12+6).RGBA()
			if r>>8 > 0xB0 && g>>8 > 0xB0 && b>>8 > 0x90 {
				cream++
			}
		}
	}
	if cream < 40 || cream > 160 {
		t.Errorf("%d of 256 sampled pixels are knight, want 40..160", cream)
	}
}

// web/vendor is filled by the Dockerfile, not committed: every vendor file the page or its scripts name must be
// extracted there, or the deployed app would 404 on it.
func TestDockerfileProvidesEveryVendorFile(t *testing.T) {
	dockerfile, err := os.ReadFile("Dockerfile")
	if err != nil {
		t.Fatal(err)
	}
	ref := regexp.MustCompile(`vendor/([A-Za-z0-9._-]+\.(?:js|wasm|txt))`)
	seen := map[string]bool{}
	err = fs.WalkDir(siteFS(), ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || strings.HasPrefix(path, "vendor/") {
			return err
		}
		b, err := fs.ReadFile(siteFS(), path)
		for _, m := range ref.FindAllSubmatch(b, -1) {
			seen[string(m[1])] = true
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	// The .wasm is not named in the scripts: the Stockfish loader derives it from its own file name.
	seen["stockfish-17.1-lite-single-03e3232.wasm"] = true
	if len(seen) < 5 {
		t.Fatalf("expected chess.js, three Stockfish files and the licence text, found %v", seen)
	}
	for name := range seen {
		if !strings.Contains(string(dockerfile), name) {
			t.Errorf("web/ refers to vendor/%s but the Dockerfile does not provide it", name)
		}
	}
}
