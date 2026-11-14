/* Computer opponent. One facade over two engines:
   - Stockfish 17.1 (WebAssembly, single thread) in a Worker, with an asm.js build as second try;
   - the small built-in engine (mini-engine.js) until Stockfish is ready, or if it never starts.
   Level 1-100 is turned into a playing style by policy(). */
(function () {
  'use strict';

  var SF_BUILDS = [
    { url: 'vendor/stockfish-17.1-lite-single-03e3232.js', name: 'Stockfish 17.1', timeout: 30000 },
    { url: 'vendor/stockfish-17.1-asm-341ff22.js', name: 'Stockfish 17.1 (compatibility build)', timeout: 45000 }
  ];

  /* ---------- level policy ---------- */
  var SOFT_MAX = 30;      // levels 1..30: deliberate beginner mistakes
  var ELO_MIN = 1320, ELO_MAX = 3190;
  function policy(level) {
    var L = Math.max(1, Math.min(100, Math.round(level)));
    if (L <= SOFT_MAX) {
      return {
        mode: 'soft',
        // chance of a completely random move: 90% at level 1, gone by level 25
        random: Math.max(0, 0.9 - (L - 1) * 0.0375),
        // otherwise pick among all moves, the better the likelier; lower temp = pickier
        temp: Math.round(420 * Math.pow(0.9, L - 1)) + 44,
        depth: L <= 12 ? 1 : (L <= 22 ? 2 : 3)
      };
    }
    if (L < 100) {
      var t = (L - SOFT_MAX - 1) / (99 - SOFT_MAX - 1);
      return { mode: 'elo', elo: Math.round(ELO_MIN + t * (ELO_MAX - ELO_MIN)), movetime: Math.round(250 + t * 950) };
    }
    return { mode: 'full', movetime: 1500 };
  }

  /* ---------- Stockfish over UCI ---------- */
  function SF(url) {
    var self = this;
    this.w = new Worker(url);
    this.lines = null;
    this.waiters = [];
    this.chain = Promise.resolve();
    this.dead = false;
    this.w.onmessage = function (e) { self._line(typeof e.data === 'string' ? e.data : String(e.data)); };
    this.w.onerror = function (e) { self.dead = true; if (self.onfail) self.onfail(e); if (e && e.preventDefault) e.preventDefault(); };
  }
  SF.prototype._line = function (line) {
    for (var i = 0; i < this.waiters.length; i++) {
      var w = this.waiters[i];
      if (w.collect) w.collect(line);
      if (line.indexOf(w.until) === 0) { this.waiters.splice(i, 1); w.resolve(line); return; }
    }
  };
  SF.prototype._send = function (s) { this.w.postMessage(s); };
  SF.prototype._wait = function (until, collect) {
    var self = this;
    return new Promise(function (resolve) { self.waiters.push({ until: until, collect: collect, resolve: resolve }); });
  };
  SF.prototype.init = function (timeout) {
    var self = this;
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('engine start timed out')); }, timeout);
      self.onfail = function (e) { clearTimeout(timer); reject(new Error('engine failed: ' + (e && e.message || 'worker error'))); };
      self._send('uci');
      self._wait('uciok').then(function () {
        self._send('setoption name Hash value 16');
        self._send('isready');
        return self._wait('readyok');
      }).then(function () { clearTimeout(timer); self.onfail = null; resolve(); });
    });
  };
  SF.prototype.kill = function () { try { this.w.terminate(); } catch (e) {} this.dead = true; };
  SF.prototype._job = function (fn) {
    var p = this.chain.then(fn, fn);
    this.chain = p.catch(function () {});
    return p;
  };
  /* Score moves. Returns [{uci, score}] best first; score in centipawns for the side to move. */
  SF.prototype.analyse = function (fen, depth, multipv) {
    var self = this;
    return this._job(function () {
      var found = {};
      self._send('setoption name UCI_LimitStrength value false');
      self._send('setoption name MultiPV value ' + multipv);
      self._send('position fen ' + fen);
      self._send('go depth ' + depth);
      return self._wait('bestmove', function (line) {
        if (line.indexOf('info ') !== 0 || line.indexOf(' pv ') < 0) return;
        var m = /multipv (\d+) score (cp|mate) (-?\d+)/.exec(line);
        var pv = / pv (\S+)/.exec(line);
        if (!m || !pv) return;
        var v = +m[3];
        var score = m[2] === 'cp' ? v : (v > 0 ? 100000 - v : -100000 - v);
        found[m[1]] = { uci: pv[1], score: score };
      }).then(function (line) {
        var list = Object.keys(found).map(function (k) { return found[k]; });
        list.sort(function (a, b) { return b.score - a.score; });
        var bm = line.split(' ')[1];
        if (!list.length && bm && bm !== '(none)') list.push({ uci: bm, score: 0 });
        return list;
      });
    });
  };
  /* Best move at a rating (elo) or at full strength. */
  SF.prototype.best = function (fen, p) {
    var self = this;
    return this._job(function () {
      self._send('setoption name MultiPV value 1');
      if (p.elo) {
        self._send('setoption name UCI_LimitStrength value true');
        self._send('setoption name UCI_Elo value ' + p.elo);
      } else {
        self._send('setoption name UCI_LimitStrength value false');
      }
      self._send('position fen ' + fen);
      self._send('go movetime ' + Math.max(20, Math.round(p.movetime * api.timeScale)));
      return self._wait('bestmove').then(function (line) { return line.split(' ')[1]; });
    });
  };

  /* ---------- built-in engine, in a Worker when possible ---------- */
  var mini = { worker: null, seq: 0, pending: {} };
  function miniStart() {
    try {
      var w = new Worker('js/mini-engine.js');
      w.onmessage = function (e) {
        var d = e.data;
        if (d.ready) { mini.worker = w; return; }
        var p = mini.pending[d.id];
        if (!p) return;
        delete mini.pending[d.id];
        if (d.error) p.reject(new Error(d.error)); else p.resolve(d.result);
      };
      w.onerror = function (e) { mini.worker = null; if (e && e.preventDefault) e.preventDefault(); };
    } catch (e) { mini.worker = null; }
  }
  function miniCall(q) {
    if (mini.worker) {
      return new Promise(function (resolve, reject) {
        q.id = ++mini.seq;
        mini.pending[q.id] = { resolve: resolve, reject: reject };
        mini.worker.postMessage(q);
      });
    }
    return new Promise(function (resolve) { // main thread, kept shallow so the page stays responsive
      setTimeout(function () {
        resolve(q.cmd === 'analyse' ? MiniEngine.analyse(q.fen, Math.min(q.depth, 2)) : MiniEngine.best(q.fen, Math.min(q.depth, 3), Math.min(q.ms, 900)));
      }, 30);
    });
  }

  /* ---------- choosing a move ---------- */
  function randomMove(fen) {
    var ms = new Chess(fen).moves({ verbose: true });
    if (!ms.length) return null;
    var m = ms[Math.floor(Math.random() * ms.length)];
    return m.from + m.to + (m.promotion || '');
  }
  function softPick(list, temp) {
    if (!list.length) return null;
    var top = Math.max(-1500, Math.min(1500, list[0].score));
    var weights = list.map(function (x) {
      var s = Math.max(-1500, Math.min(1500, x.score));
      return Math.exp((s - top) / temp);
    });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0), r = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i].uci; }
    return list[0].uci;
  }

  var sf = null;
  var listeners = [];
  var api = {
    status: 'starting',          // 'starting' | 'stockfish' | 'builtin'
    name: 'built-in engine',
    timeScale: 1,                // tests shrink thinking time
    policy: policy,
    onChange: function (fn) { listeners.push(fn); },
    ready: null,
    forceBuiltin: false,
    /* Move for the computer at this level, as a UCI string like "e2e4" or "e7e8q". */
    pick: function (fen, level) {
      var p = policy(level);
      var useSF = sf && !sf.dead && !api.forceBuiltin;
      if (p.mode === 'soft') {
        if (Math.random() < p.random) return Promise.resolve(randomMove(fen));
        var scored = useSF ? sf.analyse(fen, p.depth, 256) : miniCall({ cmd: 'analyse', fen: fen, depth: Math.min(p.depth, 2) });
        return scored.then(function (list) { return softPick(list, p.temp) || randomMove(fen); });
      }
      if (useSF) return sf.best(fen, p);
      var depth = level < 55 ? 2 : (level < 80 ? 3 : 4);
      return miniCall({ cmd: 'best', fen: fen, depth: depth, ms: 2500 * api.timeScale }).then(function (m) { return m || randomMove(fen); });
    },
    /* A good move to suggest to the learner. */
    hint: function (fen) {
      if (sf && !sf.dead && !api.forceBuiltin) {
        return sf.analyse(fen, 10, 1).then(function (l) { return l.length ? l[0].uci : randomMove(fen); });
      }
      return miniCall({ cmd: 'best', fen: fen, depth: 3, ms: 1500 }).then(function (m) { return m || randomMove(fen); });
    }
  };

  function announce() { listeners.forEach(function (fn) { try { fn(api); } catch (e) {} }); }

  function boot() {
    miniStart();
    var i = 0;
    function tryNext() {
      if (i >= SF_BUILDS.length || typeof Worker === 'undefined') {
        api.status = 'builtin'; api.name = 'built-in engine'; announce();
        return Promise.resolve();
      }
      var b = SF_BUILDS[i++], e;
      try { e = new SF(b.url); } catch (err) { return tryNext(); }
      return e.init(b.timeout).then(function () {
        sf = e; api.status = 'stockfish'; api.name = b.name; announce();
      }, function () { e.kill(); return tryNext(); });
    }
    api.ready = tryNext();
  }

  window.Engine = api;
  boot();
})();
