/* Links a play-mode hint to a strategy from the lessons. No DOM. Hints.explain(Chess, fen, uci, lessons) returns
   { id, name, lesson, chapter, text } when the suggested move shows one of the lesson ideas, otherwise null
   (the caller then shows the plain best-move hint). `lessons` is Lessons from lessons.js. */
(function () {
  'use strict';
  var VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  // strategy id -> [name, lesson id, one short sentence for the player]
  var IDEAS = {
    mate: ['Checkmate', 'checkmate', 'This move wins the game: the king is attacked and cannot escape.'],
    promotion: ['Promotion', 'promotion', 'A pawn that reaches the last row turns into a new piece.'],
    castling: ['Castling', 'castling', 'Castling tucks your king away safely and brings a rook into the game.'],
    enpassant: ['En passant', 'enpassant', 'A special pawn capture that is only allowed right after the pawn’s two-square move.'],
    fork: ['A fork', 'fork', 'One piece attacks two things at once, so your opponent can only save one.'],
    pin: ['A pin', 'pin', 'The piece in front cannot move without exposing the king behind it.'],
    centre: ['Control the centre', 'opening', 'A pawn in the middle of the board gives your pieces room to move.'],
    develop: ['Develop your pieces', 'opening', 'Bring a knight or bishop out early so it can join the game.']
  };
  var DIRS = { b: [[1, 1], [1, -1], [-1, 1], [-1, -1]], r: [[1, 0], [-1, 0], [0, 1], [0, -1]] };
  DIRS.q = DIRS.b.concat(DIRS.r);

  function sq(f, r) { return f < 0 || f > 7 || r < 0 || r > 7 ? null : 'abcdefgh'.charAt(f) + (r + 1); }

  /* A slider that lands with an enemy piece (not the king) in front and the enemy king right behind it on the same line. */
  function pins(g, to, piece, enemy) {
    var dirs = DIRS[piece.type];
    if (!dirs) return false;
    var f0 = to.charCodeAt(0) - 97, r0 = +to.charAt(1) - 1;
    return dirs.some(function (d) {
      var seen = 0;
      for (var f = f0 + d[0], r = r0 + d[1]; sq(f, r); f += d[0], r += d[1]) {
        var p = g.get(sq(f, r));
        if (!p) continue;
        if (p.color !== enemy) return false;
        if (p.type === 'k') return seen === 1;
        if (++seen > 1) return false;
      }
      return false;
    });
  }

  /* The moved piece attacks two or more valuable things (the king in check counts as one) and cannot just be taken by something cheaper. */
  function forks(Chess, g, mv, enemy) {
    var mine = VALUE[mv.piece], targets = g.in_check() ? 1 : 0;
    var cheaper = g.moves({ verbose: true }).some(function (m) { return m.to === mv.to && VALUE[m.piece] < mine; });
    if (cheaper) return false;
    var parts = g.fen().split(' ');
    parts[1] = mv.color; parts[3] = '-';
    var h;
    try { h = new Chess(parts.join(' ')); } catch (e) { return false; }
    h.moves({ verbose: true }).forEach(function (m) {
      if (m.from === mv.to && m.captured && m.captured !== 'k' && VALUE[m.captured] >= 3) targets++;
    });
    return targets >= 2;
  }

  function detect(Chess, fen, uci) {
    var g = new Chess(fen), ply = g.history().length;
    var mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.charAt(4) || undefined });
    if (!mv) return null;
    var enemy = mv.color === 'w' ? 'b' : 'w', fl = mv.flags || '';
    if (g.in_checkmate()) return 'mate';
    if (mv.promotion) return 'promotion';
    if (fl.indexOf('k') >= 0 || fl.indexOf('q') >= 0) return 'castling';
    if (fl.indexOf('e') >= 0) return 'enpassant';
    if (forks(Chess, g, mv, enemy)) return 'fork';
    if (pins(g, mv.to, { type: mv.piece }, enemy)) return 'pin';
    if (ply < 16 && mv.piece === 'p' && !mv.captured && /^[de][45]$/.test(mv.to)) return 'centre';
    if (ply < 16 && (mv.piece === 'n' || mv.piece === 'b') && mv.from.charAt(1) === (mv.color === 'w' ? '1' : '8')) return 'develop';
    return null;
  }

  function explain(Chess, fen, uci, lessons) {
    var id;
    try { id = detect(Chess, fen, uci); } catch (e) { return null; }
    if (!id) return null;
    var idea = IDEAS[id], les = null, chap = '';
    (lessons.LESSONS || []).forEach(function (l) { if (l.id === idea[1]) les = l; });
    if (!les) return null;
    (lessons.CHAPTERS || []).forEach(function (c) { if (c.id === les.chapter) chap = c.title; });
    return { id: id, name: idea[0], lesson: les.title, chapter: chap,
      text: idea[0] + ': ' + idea[2] + ' Lesson: “' + les.title + '”' + (chap ? ' in ' + chap : '') + '.' };
  }

  var api = { explain: explain, IDEAS: IDEAS };
  if (typeof window !== 'undefined') window.Hints = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
