package main

import (
	"os"
	"os/exec"
	"testing"
)

// The strategy-linked hint text lives in web/js/hints.js with no DOM, so it is checked by running
// testdata/hints_check.js under Node. The board checks need the vendored chess.js (not in git, added by the
// Dockerfile): without it only the checks that need no board run. Skipped when Node is missing.
func TestHintStrategies(t *testing.T) {
	node, err := exec.LookPath("node")
	if err != nil {
		t.Skip("node is not installed")
	}
	args := []string{"testdata/hints_check.js", "web/js/hints.js", "web/js/lessons.js"}
	if _, err := os.Stat("web/vendor/chess.js"); err == nil {
		args = append(args, "web/vendor/chess.js")
	}
	if out, err := exec.Command(node, args...).CombinedOutput(); err != nil {
		t.Fatalf("hints_check.js failed: %v\n%s", err, out)
	}
	if out, err := exec.Command(node, "--check", "web/js/hints.js").CombinedOutput(); err != nil {
		t.Errorf("hints.js does not parse: %v\n%s", err, out)
	}
}
