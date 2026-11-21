// Checks web/js/hints.js (a play-mode hint linked to a lesson strategy). Run: node hints_check.js hints.js lessons.js [chess.js]
// chess.js is the vendored rules library (not in git): without it only the checks that do not need real boards run.
const assert = require('assert');
const path = require('path');
const [hintsFile, lessonsFile, chessFile] = process.argv.slice(2).map((f) => path.resolve(f));
const H = require(hintsFile);
const L = require(lessonsFile);

// Every idea must point at a real lesson, so the hint text can name it.
for (const [id, idea] of Object.entries(H.IDEAS)) {
  assert.ok(L.LESSONS.some((l) => l.id === idea[1]), id + ' points at a lesson that does not exist');
}

// A rules library that fails must give the plain hint (null), never throw.
const Broken = function () { throw new Error('boom'); };
assert.strictEqual(H.explain(Broken, 'x', 'e2e4', L), null);

if (!chessFile) { console.log('hints ok (no chess.js: board checks skipped)'); process.exit(0); }
const { Chess } = require(chessFile);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const cases = [
  ['fork', 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5c7', 'The fork'],
  ['pin', '4k3/pp3ppp/2n5/8/8/8/PP2BPPP/4K3 w - - 0 1', 'e2b5', 'The pin'],
  ['mate', '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1', 'd1d8', 'Checkmate'],
  ['promotion', '8/4P3/8/8/8/8/k7/4K3 w - - 0 1', 'e7e8q', 'Promotion'],
  ['castling', 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', 'e1g1', 'Castling'],
  ['centre', START, 'e2e4', 'Three golden rules'],
  ['develop', START, 'g1f3', 'Three golden rules'],
];
for (const [id, fen, uci, title] of cases) {
  const r = H.explain(Chess, fen, uci, L);
  assert.ok(r, id + ': expected a strategy');
  assert.strictEqual(r.id, id);
  assert.ok(r.text.includes('“' + title + '”'), id + ': the text must name the lesson: ' + r.text);
  assert.ok(r.text.includes(H.IDEAS[id][0]), id + ': the text must name the strategy: ' + r.text);
}
// No lesson idea fits: the caller falls back to the plain hint.
assert.strictEqual(H.explain(Chess, START, 'a2a3', L), null);
assert.strictEqual(H.explain(Chess, START, 'e2e5', L), null); // not a legal move
console.log('hints ok');
