/* Small built-in chess engine (alpha-beta on top of chess.js).
   Used while Stockfish is loading, and as the fallback if Stockfish cannot start.
   Works as a Worker script and as a plain script on the page. */
(function (g) {
  'use strict';
  var inWorker = typeof WorkerGlobalScope !== 'undefined' && g instanceof WorkerGlobalScope;
  if (inWorker && typeof g.Chess === 'undefined') { importScripts('../vendor/chess.js'); }

  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var CENTRE = [0, 1, 2, 3, 3, 2, 1, 0];

  function pieceScore(p, r, f) { // r: 0 = rank 8 ... 7 = rank 1
    var c = CENTRE[r] + CENTRE[f];
    var adv = p.color === 'w' ? 7 - r : r; // ranks advanced from own back rank
    switch (p.type) {
      case 'p': return 100 + adv * 6 + (c >= 5 ? 12 : 0);
      case 'n': return 320 + c * 8;
      case 'b': return 330 + c * 4;
      case 'r': return 500 + (adv === 6 ? 15 : 0);
      case 'q': return 900 + c;
      default: return (adv === 0 ? 10 : 0) - c * 2; // king: stay home, off the centre
    }
  }
  function evaluate(c) {
    var b = c.board(), s = 0, r, f, p;
    for (r = 0; r < 8; r++) for (f = 0; f < 8; f++) {
      p = b[r][f];
      if (p) s += (p.color === 'w' ? 1 : -1) * pieceScore(p, r, f);
    }
    return c.turn() === 'w' ? s : -s;
  }
  function order(moves) {
    return moves.sort(function (a, b) {
      var sa = (a.captured ? VAL[a.captured] * 10 - VAL[a.piece] : 0) + (a.promotion ? 800 : 0);
      var sb = (b.captured ? VAL[b.captured] * 10 - VAL[b.piece] : 0) + (b.promotion ? 800 : 0);
      return sb - sa;
    });
  }
  function quiesce(c, alpha, beta, depth, ctx) {
    var stand = evaluate(c);
    if (depth === 0) return stand;
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    var moves = order(c.moves({ verbose: true }).filter(function (m) { return m.captured || m.promotion; }));
    for (var i = 0; i < moves.length; i++) {
      c.move(moves[i]);
      var sc = -quiesce(c, -beta, -alpha, depth - 1, ctx);
      c.undo();
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function search(c, depth, alpha, beta, ctx) {
    if (ctx.deadline && (++ctx.nodes & 63) === 0 && Date.now() > ctx.deadline) { ctx.aborted = true; }
    if (ctx.aborted) return 0;
    var moves = c.moves({ verbose: true });
    if (!moves.length) return c.in_check() ? -100000 - depth : 0;
    if (depth <= 0) return quiesce(c, alpha, beta, 2, ctx);
    order(moves);
    for (var i = 0; i < moves.length; i++) {
      c.move(moves[i]);
      var sc = -search(c, depth - 1, -beta, -alpha, ctx);
      c.undo();
      if (ctx.aborted) return 0;
      if (sc >= beta) return beta;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  }
  function uci(m) { return m.from + m.to + (m.promotion || ''); }

  /* Score every legal move (full window), best first. */
  function analyse(fen, depth) {
    var c = new g.Chess(fen), ctx = { nodes: 0 };
    var out = c.moves({ verbose: true }).map(function (m) {
      c.move(m);
      var sc = -search(c, depth - 1, -1e9, 1e9, ctx);
      c.undo();
      return { uci: uci(m), score: sc };
    });
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }
  /* Best move by iterative deepening, within a time budget. */
  function best(fen, maxDepth, ms) {
    var c = new g.Chess(fen), moves = order(c.moves({ verbose: true }));
    if (!moves.length) return null;
    var bestMove = moves[0], ctx = { nodes: 0, deadline: Date.now() + ms };
    for (var d = 1; d <= maxDepth; d++) {
      var alpha = -1e9, cur = null;
      for (var i = 0; i < moves.length; i++) {
        c.move(moves[i]);
        var sc = -search(c, d - 1, -1e9, -alpha, ctx);
        c.undo();
        if (ctx.aborted) break;
        if (sc > alpha) { alpha = sc; cur = moves[i]; }
      }
      if (ctx.aborted) break;
      if (cur) { bestMove = cur; moves.splice(moves.indexOf(cur), 1); moves.unshift(cur); }
    }
    return uci(bestMove);
  }

  g.MiniEngine = { analyse: analyse, best: best };

  if (inWorker) {
    g.onmessage = function (e) {
      var q = e.data, res;
      try {
        res = q.cmd === 'analyse' ? analyse(q.fen, q.depth) : best(q.fen, q.depth, q.ms);
        g.postMessage({ id: q.id, result: res });
      } catch (err) { g.postMessage({ id: q.id, error: String(err) }); }
    };
    g.postMessage({ ready: true });
  }
})(typeof self !== 'undefined' ? self : this);
