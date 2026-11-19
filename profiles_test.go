package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strings"
	"testing"
)

// The profile rules (migration, separate progress, export/import, rejecting bad codes) live in web/js/profiles.js with
// no DOM, so they are checked by running testdata/profiles_check.js under Node. Skipped when Node is missing.
func TestProfilesLogic(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node is not installed")
	}
	if out, err := exec.Command(node, "testdata/profiles_check.js", "web/js/profiles.js").CombinedOutput(); err != nil {
		t.Fatalf("profiles_check.js failed: %v\n%s", err, out)
	}
	for _, f := range []string{"web/js/app.js", "web/js/profiles.js", "web/js/strategy.js"} { // the scripts at least parse
		if out, err := exec.Command(node, "--check", f).CombinedOutput(); err != nil {
			t.Errorf("%s does not parse: %v\n%s", f, err, out)
		}
	}
}

// The strategy named by a play-mode hint is checked by running testdata/strategy_check.js under Node against the
// real chess.js. web/vendor is not in git (the Dockerfile downloads it), so this is skipped where it is missing.
func TestStrategyHints(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node is not installed")
	}
	if _, err := os.Stat("web/vendor/chess.js"); err != nil {
		t.Skip("web/vendor/chess.js is not downloaded")
	}
	if out, err := exec.Command(node, "testdata/strategy_check.js", "web/js/strategy.js", "web/js/lessons.js", "web/vendor/chess.js").CombinedOutput(); err != nil {
		t.Fatalf("strategy_check.js failed: %v\n%s", err, out)
	}
}

// Always-on wiring checks (no JS runner in CI): the page loads profiles.js before app.js, app.js keeps storage behind
// an interface and migrates the old key, and the README records the backend plan.
func TestProfilesWiring(t *testing.T) {
	get := func(path string) string {
		rec := httptest.NewRecorder()
		newMux().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
		return rec.Body.String()
	}
	page, js := get("/"), get("/js/app.js")
	if i, j := strings.Index(page, `src="js/profiles.js"`), strings.Index(page, `src="js/app.js"`); i < 0 || j < 0 || i > j {
		t.Error("profiles.js must be loaded before app.js")
	}
	for _, id := range []string{`id="profileBtn"`, `id="profileDlg"`} {
		if !strings.Contains(page, id) {
			t.Errorf("page lost %s", id)
		}
	}
	for _, want := range []string{"var LocalBackend = {", "backend: LocalBackend", "OLD_KEY = 'knight-school-v1'", "Profiles.load(saved.profiles, saved.legacy)", "Profiles.importCode(Store.doc,", "Play.restore();"} {
		if !strings.Contains(js, want) {
			t.Errorf("app.js lost %q", want)
		}
	}
	readme, err := os.ReadFile("README.md")
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"OpenTelemetry", "New Relic", "database"} {
		if !strings.Contains(string(readme), want) {
			t.Errorf("README lost the backend plan (%q)", want)
		}
	}
}
