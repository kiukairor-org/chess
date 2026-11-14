// Knight School is a static web app: the page, its scripts and the third-party browser code under web/vendor (put
// there by the Dockerfile) are embedded in the binary and served from the same origin, so the Stockfish Web Worker
// and its .wasm load without any cross-origin setup. Nothing is stored on the server.
package main

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed web
var embedded embed.FS

// rootFiles are the icon and manifest files served straight from the site root.
var rootFiles = map[string]string{
	"icon.svg":             "image/svg+xml",
	"apple-touch-icon.png": "image/png",
	"icon-192.png":         "image/png",
	"icon-512.png":         "image/png",
	"manifest.webmanifest": "application/manifest+json",
}

func siteFS() fs.FS {
	site, err := fs.Sub(embedded, "web")
	if err != nil {
		panic(err)
	}
	return site
}

// registerStatic serves the page at / and the files directly under js/ and vendor/ (one path segment, GET/HEAD only).
// Content types come from the file extension (.wasm is application/wasm, which streaming compilation requires).
func registerStatic(mux *http.ServeMux, site fs.FS) {
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		page, err := fs.ReadFile(site, "index.html")
		if err != nil {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-cache")
		servePage(w, page)
	})
	for name, ctype := range rootFiles {
		mux.HandleFunc("GET /"+name, func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", ctype)
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("ETag", `"`+version+`"`)
			http.ServeFileFS(w, r, site, name)
		})
	}
	for _, dir := range []string{"js", "vendor"} {
		mux.HandleFunc("GET /"+dir+"/{file}", func(w http.ResponseWriter, r *http.Request) {
			name := r.PathValue("file")
			if strings.HasPrefix(name, "stockfish-17.") {
				// Engine builds carry a content hash in their name: download once (7 MB), keep for a year.
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			} else {
				// Everything else is revalidated on each load; the ETag changes with every release.
				w.Header().Set("Cache-Control", "no-cache")
				w.Header().Set("ETag", `"`+version+`"`)
			}
			http.ServeFileFS(w, r, site, dir+"/"+name)
		})
	}
}
