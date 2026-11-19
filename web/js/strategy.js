/* Knight School: which lesson strategy a suggested move shows. Used by the play-mode hint.
   Pure logic on top of chess.js (passed in as `game`, never changed); the lesson titles come from lessons.js. */
(function (root) {
  'use strict';
  var VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  var DIRS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
  DIRS.q = DIRS.b.concat(DIRS.r);
  var CENTRE = ['d4', 'e4', 'd5', 'e5'];
  var OPENING_PLIES = 20; // the first ten moves each

  function fresh(fen) { return new root.Chess(fen); } // chess.js is a global in the page; the Node check sets it

  function sq(f, r) { return f < 0 || f > 7 || r < 0 || r > 7 ? null : 'abcdefgh'.charAt(f) + (r + 1); }

  /* The first two pieces met going outwards from `from` along one direction. */
  function firstTwo(game, from, d) {
    var f = from.charCodeAt(0) - 97, r = +from.charAt(1) - 1, found = [], s;
    for (;;) {
      f += d[0]; r += d[1]; s = sq(f, r);
      if (!s) break;
      var p = game.get(s);
      if (p) { found.push({ type: p.type, color: p.color, square: s }); if (found.length === 2) break; }
    }
    return found;
  }

  /* Squares that a piece on `from` attacks and that hold an enemy piece (pieces, not pawn pushes). */
  function targets(game, from, color) {
    var flipped = game.fen().split(' ');
    flipped[1] = color; flipped[3] = '-';
    var g = fresh(flipped.join(' ')), out = [];
    g.moves({ square: from, verbose: true }).forEach(function (m) { if (m.captured) out.push({ square: m.to, type: m.captured }); });
    return out;
  }

  /* Returns { id, why } for the lesson strategy that the move shows, or null. `uci` like "g1f3". */
  function classify(game, uci) {
    var from = uci.slice(0, 2), to = uci.slice(2, 4), promo = uci.slice(4, 5) || undefined;
    var ply = game.history().length, mover = game.turn();
    var g = fresh(game.fen());
    var m = g.move({ from: from, to: to, promotion: promo });
    if (!m) return null;
    var type = m.piece, opp = mover === 'w' ? 'b' : 'w';
    var rank = mover === 'w' ? 1 : 8;

    if (/[kq]/.test(m.flags)) return { id: 'castling', why: 'Castling tucks your king away and brings a rook into play.' };
    if (m.flags.indexOf('e') >= 0) return { id: 'enpassant', why: 'This is the special pawn capture, en passant.' };
    if (m.promotion) return { id: 'promotion', why: 'Your pawn reaches the last row and becomes a new piece.' };
    if (g.in_checkmate()) return null;

    // fork: the moved piece attacks two things worth going after, and cannot simply be taken by something cheaper
    var hit = targets(g, to, mover).filter(function (t) { return VALUE[t.type] > VALUE[type] || (t.type === 'k') || (VALUE[t.type] >= 3 && VALUE[t.type] === VALUE[type]); });
    var safe = !g.moves({ verbose: true }).some(function (o) { return o.to === to && o.captured && VALUE[o.piece] < VALUE[type]; });
    if (hit.length >= 2 && safe && !m.captured) return { id: 'fork', why: 'This move attacks two pieces at once.' };

    // pin and skewer: a bishop, rook or queen lines up two enemy pieces on one line
    if (DIRS[type] && !m.captured && safe) {
      for (var i = 0; i < DIRS[type].length; i++) {
        var two = firstTwo(g, to, DIRS[type][i]);
        if (two.length < 2 || two[0].color !== opp || two[1].color !== opp) continue;
        var a = two[0], b = two[1];
        if (a.type === 'k') { if (VALUE[b.type] >= 3 && Math.max(Math.abs(a.square.charCodeAt(0) - to.charCodeAt(0)), Math.abs(a.square.charCodeAt(1) - to.charCodeAt(1))) > 1) return { id: 'skewer', why: 'This move gives check, and the king must step aside so you can take what is behind it.' }; continue; }
        if (b.type === 'k' || VALUE[b.type] > VALUE[a.type]) return { id: 'pin', why: 'This move pins a piece: it is stuck in front of something more valuable.' };
        if (VALUE[a.type] > VALUE[b.type] && VALUE[b.type] >= 3 && VALUE[a.type] > VALUE[type]) return { id: 'skewer', why: 'This move skewers: the big piece in front has to move and you take what is behind.' };
      }
    }

    if (ply < OPENING_PLIES) {
      if (type === 'p' && CENTRE.indexOf(to) >= 0) return { id: 'opening', name: 'Centre control', why: 'A pawn in the centre controls the key squares.' };
      if ((type === 'n' || type === 'b') && +from.charAt(1) === rank) return { id: 'opening', name: 'Development', why: 'Bring your knights and bishops out early.' };
    }
    return null;
  }

  /* The note shown under the board, or null when no lesson fits. */
  function describe(game, uci, lessons) {
    var hit;
    try { hit = classify(game, uci); } catch (e) { return null; }
    if (!hit) return null;
    var lesson = null;
    (lessons.LESSONS || []).forEach(function (l) { if (l.id === hit.id) lesson = l; });
    if (!lesson) return null;
    var chapter = null;
    (lessons.CHAPTERS || []).forEach(function (c) { if (c.id === lesson.chapter) chapter = c; });
    var name = hit.name || lesson.title;
    return 'Strategy: ' + name + '. ' + hit.why + ' See the lesson “' + lesson.title + '”' + (chapter ? ' in “' + chapter.title + '”' : '') + '.';
  }

  root.Strategy = { classify: classify, describe: describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Strategy;
})(typeof window !== 'undefined' ? window : globalThis);
