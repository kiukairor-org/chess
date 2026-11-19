// Run by TestStrategyHints with the paths of web/js/strategy.js, web/js/lessons.js and web/vendor/chess.js.
// Exits non-zero on the first failed check.
'use strict';
const assert = require('assert');
const path = require('path');
globalThis.Chess = require(path.resolve(process.argv[4])).Chess;
const S = require(path.resolve(process.argv[2]));
const L = require(path.resolve(process.argv[3]));
const text = (fen, uci) => S.describe(new Chess(fen), uci, L);
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// the strategy is named, with the lesson it comes from (titles are read from lessons.js)
assert.strictEqual(text('r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', 'b5c7'),
  'Strategy: The fork. This move attacks two pieces at once. See the lesson “The fork” in “First tactics”.');
assert.match(text('4k3/pp3ppp/2n5/8/8/8/PP2BPPP/4K3 w - - 0 1', 'e2b5'), /^Strategy: The pin\..*lesson “The pin”/);
assert.match(text('3q4/8/8/8/3k4/8/8/R5K1 w - - 0 1', 'a1d1'), /^Strategy: The skewer\..*lesson “The skewer”/);
assert.match(text(START, 'e2e4'), /^Strategy: Centre control\..*lesson “Three golden rules” in “Starting a game”/);
assert.match(text(START, 'g1f3'), /^Strategy: Development\..*lesson “Three golden rules”/);
assert.match(text('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1'), /^Strategy: Castling\./);

// no lesson fits: no note, the plain best-move hint stays
assert.strictEqual(text(START, 'a2a3'), null);
assert.strictEqual(text('4k3/8/8/8/8/8/P7/4K3 w - - 0 1', 'e1e2'), null);
// bad input never throws
assert.strictEqual(text(START, 'e2e5'), null);
// a strategy whose lesson is missing is not shown
assert.strictEqual(S.describe(new Chess(START), 'e2e4', { LESSONS: [], CHAPTERS: [] }), null);
// the position is not changed
const g = new Chess(START); S.describe(g, 'e2e4', L);
assert.strictEqual(g.fen(), START);
console.log('ok');
