# Multi-arch (linux/arm64 required). Built natively on ubuntu-24.04-arm in CI.
FROM golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
# Third-party browser code, pinned by checksum (BuildKit refuses a mismatch) and embedded with web/ by go:embed:
# chess.js 0.10.3 (BSD-2-Clause, the rules) and Stockfish 17.1 for the browser (GPLv3, the computer player;
# its licence text ships next to it). Same files as npm's chess.js@0.10.3 and stockfish@17.1.0.
ADD --checksum=sha256:c7b7e163abc8cbafd735550c9f9af260a67dbeebf28f51684749cfb9772b20b9 \
    https://registry.npmjs.org/chess.js/-/chess.js-0.10.3.tgz /npm/chess.tgz
ADD --checksum=sha256:f6473919fcd9dc1a3e6a8f30fb5e3b7e6a57d966b36c8ad0959fce7aca7ec5fc \
    https://registry.npmjs.org/stockfish/-/stockfish-17.1.0.tgz /npm/stockfish.tgz
COPY . .
RUN mkdir -p web/vendor \
 && tar -xzf /npm/chess.tgz -C web/vendor --strip-components=1 package/chess.js \
 && tar -xzf /npm/chess.tgz -O package/LICENSE > web/vendor/chess.js.LICENSE \
 && tar -xzf /npm/stockfish.tgz -C web/vendor --strip-components=2 \
      package/src/stockfish-17.1-lite-single-03e3232.js \
      package/src/stockfish-17.1-lite-single-03e3232.wasm \
      package/src/stockfish-17.1-asm-341ff22.js \
 && tar -xzf /npm/stockfish.tgz -O package/Copying.txt > web/vendor/stockfish-COPYING.txt \
 && test -s web/vendor/chess.js -a -s web/vendor/stockfish-17.1-lite-single-03e3232.wasm -a -s web/vendor/stockfish-COPYING.txt
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/app .

FROM gcr.io/distroless/static-debian12:nonroot@sha256:afa5c872c891853ca7fcf1f12c3edb23f7eeef36189728842dd51042ff57f7ab
COPY --from=build /out/app /app
# 65532 is the distroless nonroot UID/GID; numeric so the kubelet can verify runAsNonRoot
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app"]
