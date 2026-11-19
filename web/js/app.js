/* Knight School: board widget, lesson runner, play mode, navigation. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var FILES = 'abcdefgh';
  var GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
  var NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
  var VS = '︎'; // ask for the text (not emoji) form of the glyph

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function allSquares() { var out = []; for (var r = 1; r <= 8; r++) for (var f = 0; f < 8; f++) out.push(FILES[f] + r); return out; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------------- saved progress (this device only) ---------------- */
  /* Storage interface: load() -> {profiles, legacy} (saved text or null), save(text) -> true if it was written.
     Profiles live behind this so a backend (database, accounts) can replace localStorage later. */
  var KEY = 'knight-school-profiles-v2', OLD_KEY = 'knight-school-v1';
  var LocalBackend = {
    load: function () {
      var out = { profiles: null, legacy: null };
      try { out.profiles = localStorage.getItem(KEY); out.legacy = localStorage.getItem(OLD_KEY); } catch (e) {}
      return out;
    },
    save: function (text) { try { localStorage.setItem(KEY, text); return true; } catch (e) { return false; } }
  };
  function safeParse(t) { try { return JSON.parse(t); } catch (e) { return null; } }
  /* Store.data is always the active profile's progress: { stars, level, color, best, game }. */
  var Store = {
    backend: LocalBackend, doc: null, data: null,
    load: function () {
      var saved = this.backend.load();
      this.doc = Profiles.load(saved.profiles, saved.legacy);
      this.data = Profiles.active(this.doc).data;
      if (JSON.stringify(this.doc) !== JSON.stringify(safeParse(saved.profiles))) this.save(); // first run, migrated or repaired
    },
    save: function () { return this.backend.save(JSON.stringify(this.doc)); },
    profile: function () { return Profiles.active(this.doc); },
    switchTo: function (id) {
      if (!Profiles.find(this.doc, id)) return;
      this.doc.active = id; this.data = Profiles.active(this.doc).data; this.save();
    }
  };

  /* ---------------- the board ---------------- */
  function Board(root, handlers) {
    var self = this;
    this.root = root; this.h = handlers || {};
    this.orient = 'w'; this.pos = {}; this.sel = null; this.dests = [];
    this.st = { last: null, check: null, marks: [], hint: [], stars: [], arrows: [] };
    this.enabled = true; this.drag = null; this.sq = {}; this.lastPointer = 0;
    root.classList.add('board');
    this.grid = el('div', 'grid');
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'arrows'); this.svg.setAttribute('viewBox', '0 0 8 8');
    root.appendChild(this.grid); root.appendChild(this.svg);
    this.build();
    this.grid.addEventListener('pointerdown', function (e) { self.down(e); });
    this.grid.addEventListener('pointermove', function (e) { self.move(e); });
    this.grid.addEventListener('pointerup', function (e) { self.up(e); });
    this.grid.addEventListener('pointercancel', function () { self.endDrag(); self.render(); });
    this.grid.addEventListener('click', function (e) { // keyboard activation only; pointers are handled above
      if (e.detail !== 0 || e.pointerType || Date.now() - self.lastPointer < 800) return;
      var s = self.sqOf(e.target); if (s) self.press(s);
    });
  }
  Board.prototype.xy = function (sq) {
    var f = FILES.indexOf(sq[0]), r = +sq[1] - 1;
    return this.orient === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
  };
  Board.prototype.build = function () {
    this.grid.innerHTML = ''; this.sq = {};
    for (var y = 0; y < 8; y++) for (var x = 0; x < 8; x++) {
      var f = this.orient === 'w' ? x : 7 - x, r = this.orient === 'w' ? 7 - y : y;
      var name = FILES[f] + (r + 1);
      var b = el('button', 'sq' + ((f + r) % 2 === 0 ? ' dk' : ''));
      b.type = 'button'; b.dataset.sq = name;
      this.grid.appendChild(b); this.sq[name] = b;
    }
  };
  Board.prototype.setOrientation = function (o) { if (o !== this.orient) { this.orient = o; this.build(); } };
  Board.prototype.sqOf = function (t) { var b = t && t.closest ? t.closest('.sq') : null; return b ? b.dataset.sq : null; };
  Board.prototype.set = function (pos, st, anim) {
    this.pos = pos;
    this.st = { last: st.last || null, check: st.check || null, marks: st.marks || [], hint: st.hint || [], stars: st.stars || [], arrows: st.arrows || [] };
    this.sel = null; this.dests = [];
    this.render(anim);
  };
  Board.prototype.render = function (anim) {
    var st = this.st, self = this;
    allSquares().forEach(function (s) {
      var b = self.sq[s], p = self.pos[s], xy = self.xy(s);
      var cls = 'sq' + ((FILES.indexOf(s[0]) + (+s[1] - 1)) % 2 === 0 ? ' dk' : '');
      if (st.last && (st.last[0] === s || st.last[1] === s)) cls += ' last';
      if (st.marks.indexOf(s) >= 0) cls += ' mark';
      if (st.hint.indexOf(s) >= 0) cls += ' hint';
      if (st.check === s) cls += ' chk';
      if (self.sel === s) cls += ' sel';
      b.className = cls;
      b.textContent = '';
      b.setAttribute('aria-label', s + (p ? ', ' + (p.color === 'w' ? 'white ' : 'black ') + NAMES[p.type] : '') + (st.stars.indexOf(s) >= 0 ? ', star' : ''));
      if (xy.y === 7) b.appendChild(el('span', 'co f', s[0]));
      if (xy.x === 0) b.appendChild(el('span', 'co r', s[1]));
      if (st.stars.indexOf(s) >= 0) b.appendChild(el('span', 'starmark', '★'));
      if (p) { var pc = el('span', 'pc ' + p.color, GLYPH[p.type] + VS); b.appendChild(pc); }
      if (self.dests.indexOf(s) >= 0) b.appendChild(el('span', p ? 'ring' : 'dot'));
    });
    this.drawArrows();
    if (anim && anim.from && anim.to) this.slide(anim.from, anim.to);
  };
  Board.prototype.slide = function (from, to) {
    var pc = this.sq[to] && this.sq[to].querySelector('.pc');
    if (!pc) return;
    var a = this.xy(from), b = this.xy(to);
    pc.style.transform = 'translate(' + ((a.x - b.x) * 100) + '%,' + ((a.y - b.y) * 100) + '%)';
    pc.getBoundingClientRect();
    pc.classList.add('slide');
    pc.style.transform = '';
    setTimeout(function () { pc.classList.remove('slide'); }, 260);
  };
  Board.prototype.drawArrows = function () {
    var self = this, ns = 'http://www.w3.org/2000/svg';
    while (this.svg.firstChild) this.svg.removeChild(this.svg.firstChild);
    this.st.arrows.forEach(function (ar) {
      var a = self.xy(ar[0]), b = self.xy(ar[1]);
      var x1 = a.x + .5, y1 = a.y + .5, x2 = b.x + .5, y2 = b.y + .5;
      var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / len, uy = dy / len;
      var hx = x2 - ux * .12, hy = y2 - uy * .12, bx = hx - ux * .36, by = hy - uy * .36;
      var line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', x1 + ux * .25); line.setAttribute('y1', y1 + uy * .25); line.setAttribute('x2', bx); line.setAttribute('y2', by);
      var head = document.createElementNS(ns, 'polygon');
      head.setAttribute('points', hx + ',' + hy + ' ' + (bx - uy * .2) + ',' + (by + ux * .2) + ' ' + (bx + uy * .2) + ',' + (by - ux * .2));
      self.svg.appendChild(line); self.svg.appendChild(head);
    });
  };
  Board.prototype.select = function (s) {
    this.sel = s;
    this.dests = s && this.h.dests ? this.h.dests(s) : [];
    this.render();
  };
  /* One activation of a square (tap, click or keyboard). Returns true if it selected a piece. */
  Board.prototype.press = function (s) {
    if (!this.enabled) return false;
    if (this.sel && this.dests.indexOf(s) >= 0) { var from = this.sel; this.sel = null; this.dests = []; this.h.onMove && this.h.onMove(from, s); return false; }
    if (this.h.canSelect && this.h.canSelect(s)) {
      if (this.sel === s) { this.select(null); return false; }
      this.select(s); return true;
    }
    if (this.sel) this.select(null);
    if (this.h.onTap) this.h.onTap(s);
    return false;
  };
  Board.prototype.down = function (e) {
    if (e.button != null && e.button > 0) return;
    this.lastPointer = Date.now();
    var s = this.sqOf(e.target); if (!s || !this.enabled) return;
    e.preventDefault();
    var wasSel = this.sel === s;
    if (wasSel) { this.drag = { sq: s, x: e.clientX, y: e.clientY, active: false, toggle: true }; }
    else if (this.press(s)) { this.drag = { sq: s, x: e.clientX, y: e.clientY, active: false, toggle: false }; }
    if (this.drag) { try { this.grid.setPointerCapture(e.pointerId); } catch (err) {} }
  };
  Board.prototype.move = function (e) {
    var d = this.drag; if (!d) return;
    if (!d.active) {
      if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 8) return;
      var src = this.sq[d.sq].querySelector('.pc'); if (!src) { this.drag = null; return; }
      d.active = true;
      d.ghost = el('span', 'ghost ' + (src.classList.contains('w') ? 'w' : 'b'), src.textContent);
      d.ghost.style.fontSize = getComputedStyle(src).fontSize;
      document.body.appendChild(d.ghost);
      src.classList.add('lifting');
    }
    d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
  };
  Board.prototype.endDrag = function () { if (this.drag && this.drag.ghost) this.drag.ghost.remove(); this.drag = null; };
  Board.prototype.up = function (e) {
    var d = this.drag; if (!d) return;
    this.endDrag();
    if (d.active) {
      var s = this.sqOf(document.elementFromPoint(e.clientX, e.clientY));
      if (s && this.dests.indexOf(s) >= 0) { this.sel = null; this.dests = []; this.h.onMove && this.h.onMove(d.sq, s); }
      else this.render();
    } else if (d.toggle) { this.select(null); }
  };
  Board.prototype.setEnabled = function (on) { this.enabled = on; this.root.classList.toggle('off', !on); };
  /* Promotion chooser, drawn over the board. */
  Board.prototype.askPromotion = function (color) {
    var self = this;
    return new Promise(function (resolve) {
      var veil = el('div', 'promo'), box = el('div', 'box'), ch = el('div', 'choices');
      box.appendChild(el('b', null, 'Promote your pawn to…'));
      ['q', 'r', 'b', 'n'].forEach(function (t) {
        var b = el('button'); b.type = 'button'; b.dataset.promo = t; b.setAttribute('aria-label', NAMES[t]);
        b.appendChild(el('span', 'pc ' + color, GLYPH[t] + VS));
        b.addEventListener('click', function () { veil.remove(); resolve(t); });
        ch.appendChild(b);
      });
      box.appendChild(ch); veil.appendChild(box); self.root.appendChild(veil);
      ch.firstChild.focus();
    });
  };

  /* ---------------- chess helpers ---------------- */
  function posOf(game) { var pos = {}; allSquares().forEach(function (s) { var p = game.get(s); if (p) pos[s] = p; }); return pos; }
  function kingSq(game, color) { var out = null; allSquares().forEach(function (s) { var p = game.get(s); if (p && p.type === 'k' && p.color === color) out = s; }); return out; }
  function checkSq(game) { return game.in_check() ? kingSq(game, game.turn()) : null; }
  function destsOf(game, s) { var seen = {}; return game.moves({ square: s, verbose: true }).map(function (m) { return m.to; }).filter(function (t) { if (seen[t]) return false; seen[t] = 1; return true; }); }
  function isPromotion(game, from, to) { return game.moves({ square: from, verbose: true }).some(function (m) { return m.to === to && m.promotion; }); }
  function uciOf(m) { return m.from + m.to + (m.promotion || ''); }
  function playUci(game, u) { return game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] || undefined }); }
  function opponentCanMate(game) {
    return game.moves({ verbose: true }).some(function (m) { game.move(m); var mate = game.in_checkmate(); game.undo(); return mate; });
  }

  /* ---------------- navigation ---------------- */
  var VIEWS = ['home', 'learn', 'lesson', 'play'];
  var current = 'home';
  function show(view, quiet) {
    current = view;
    VIEWS.forEach(function (v) { $('view-' + v).hidden = v !== view; });
    $('navLearn').setAttribute('aria-current', view === 'learn' || view === 'lesson' ? 'page' : 'false');
    $('navPlay').setAttribute('aria-current', view === 'play' ? 'page' : 'false');
    if (view === 'home') renderHome();
    if (view === 'learn') renderLearn();
    if (view === 'play') Play.enter();
    if (!quiet) {
      var hash = view === 'lesson' ? 'lesson-' + Lesson.lesson.id : view;
      try { if (location.hash.slice(1) !== hash) history.replaceState(null, '', '#' + hash); } catch (e) { try { location.hash = hash; } catch (e2) {} }
    }
    try { window.scrollTo(0, 0); } catch (e) {}
  }
  function route() {
    var h = (location.hash || '').slice(1);
    if (h.indexOf('lesson-') === 0) {
      var id = h.slice(7);
      if (Lessons.LESSONS.some(function (l) { return l.id === id; })) { Lesson.start(id); return; }
    }
    show(VIEWS.indexOf(h) >= 0 && h !== 'lesson' ? h : 'home', true);
  }

  /* ---------------- home + lesson list ---------------- */
  function starsHtml(n) { var s = ''; for (var i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">★</span>'; return s; }
  function nextLesson() { var L = Lessons.LESSONS; for (var i = 0; i < L.length; i++) if (!Store.data.stars[L[i].id]) return L[i]; return null; }
  function renderHome() {
    var L = Lessons.LESSONS, done = 0, stars = 0;
    L.forEach(function (l) { var s = Store.data.stars[l.id] || 0; if (s) done++; stars += s; });
    $('homeDone').textContent = done; $('homeTotal').textContent = L.length; $('homeStars').textContent = stars;
    $('homeMeter').style.width = Math.round(100 * done / L.length) + '%';
    var nx = nextLesson();
    $('homeContinue').textContent = !nx ? 'Replay a lesson' : (done ? 'Continue: ' + nx.title : 'Start the first lesson');
    $('homeLessonLine').textContent = L.length + ' short lessons, from how the rook moves to your first checkmates.';
    $('homeLevel').textContent = Store.data.level;
    $('homeBest').textContent = Store.data.best ? 'level ' + Store.data.best : 'none yet';
  }
  function renderLearn() {
    var root = $('chapters'); root.innerHTML = '';
    var nx = nextLesson();
    Lessons.CHAPTERS.forEach(function (ch) {
      var sec = el('section', 'chapter');
      sec.appendChild(el('h2', null, ch.title));
      sec.appendChild(el('p', null, ch.blurb));
      var grid = el('div', 'lessons');
      Lessons.LESSONS.filter(function (l) { return l.chapter === ch.id; }).forEach(function (l) {
        var n = Store.data.stars[l.id] || 0;
        var b = el('button', 'lesson' + (nx && nx.id === l.id ? ' next' : ''));
        b.type = 'button'; b.dataset.lesson = l.id;
        b.appendChild(el('span', 'ico', l.icon + VS));
        b.appendChild(el('span', 'name', l.title));
        var st = el('span', 'stars'); st.innerHTML = starsHtml(n); st.setAttribute('aria-label', n + ' of 3 stars');
        b.appendChild(st);
        b.addEventListener('click', function () { Lesson.start(l.id); });
        grid.appendChild(b);
      });
      sec.appendChild(grid); root.appendChild(sec);
    });
  }

  /* ---------------- lesson runner ---------------- */
  var PRAISE = ['Well done!', 'Exactly right!', 'Great move!', 'You got it!', 'Nicely done!'];
  var Lesson = {
    board: null, lesson: null, i: 0, mistakes: 0, game: null, step: null, solved: false, busy: false, stars: [], hintStage: 0, hinted: false, token: 0,
    init: function () {
      var self = this;
      this.board = new Board($('lessonBoard'), {
        canSelect: function (s) { return self.canSelect(s); },
        dests: function (s) { return self.dests(s); },
        onMove: function (a, b) { self.onMove(a, b); },
        onTap: function (s) { self.onTap(s); }
      });
      $('lsnNext').addEventListener('click', function () { self.next(); });
      $('lsnHint').addEventListener('click', function () { self.hint(); });
      $('lsnBack').addEventListener('click', function () { show('learn'); });
      $('finNext').addEventListener('click', function () { var nx = self.following(); if (nx) self.start(nx.id); else show('play'); });
      $('finAgain').addEventListener('click', function () { self.start(self.lesson.id); });
      $('finList').addEventListener('click', function () { show('learn'); });
    },
    following: function () { var L = Lessons.LESSONS, i = L.indexOf(this.lesson); return L[i + 1] || null; },
    start: function (id) {
      this.lesson = Lessons.LESSONS.filter(function (l) { return l.id === id; })[0];
      this.i = 0; this.mistakes = 0; this.game = null;
      $('lessonStage').hidden = false; $('lessonFinish').hidden = true;
      $('lsnTitle').textContent = this.lesson.title;
      show('lesson');
      this.load();
    },
    load: function () {
      var s = this.step = this.lesson.steps[this.i], self = this;
      this.token++;
      this.solved = s.type === 'info'; this.busy = false; this.hintStage = 0; this.hinted = false;
      if (!s.cont || !this.game) this.game = new Chess(s.fen || Lessons.EMPTY);
      this.stars = (s.stars || []).slice();
      this.board.setOrientation(this.lesson.orient || 'w');
      $('lsnText').innerHTML = s.text;
      this.feedback('', '');
      var opts = $('lsnOpts'); opts.innerHTML = '';
      if (s.type === 'quiz') {
        var order = shuffle(s.options.map(function (o, i) { return i; }));
        order.forEach(function (idx) {
          var b = el('button', 'btn opt', s.options[idx]); b.type = 'button'; b.dataset.right = idx === s.answer ? '1' : '0';
          b.addEventListener('click', function () { self.answer(b, idx); });
          opts.appendChild(b);
        });
      }
      $('lsnHint').hidden = s.type === 'info' || s.type === 'quiz';
      var dots = $('lsnDots'); dots.innerHTML = '';
      this.lesson.steps.forEach(function (_, k) { dots.appendChild(el('i', k < self.i ? 'done' : (k === self.i ? 'now' : ''))); });
      this.draw();
      this.buttons();
    },
    buttons: function () {
      var last = this.i === this.lesson.steps.length - 1;
      $('lsnNext').textContent = last ? 'Finish' : 'Next';
      $('lsnNext').disabled = !this.solved;
      $('lsnHint').disabled = this.solved;
      this.board.setEnabled(!this.solved || this.step.type === 'info');
    },
    draw: function (anim, extra) {
      var s = this.step, marks = (s.marks || []).slice(), game = this.game;
      if (s.type === 'info' && s.show) marks = marks.concat(destsOf(game, s.show));
      var st = { marks: marks, stars: this.stars, arrows: s.type === 'info' || s.type === 'quiz' ? (s.arrows || []) : [], check: checkSq(game), last: anim ? [anim.from, anim.to] : null, hint: (extra && extra.hint) || [] };
      this.board.set(posOf(game), st, anim);
    },
    feedback: function (kind, text) { var f = $('lsnFb'); f.className = 'p-fb' + (kind ? ' ' + kind : ''); f.textContent = text; },
    canSelect: function (s) {
      var st = this.step;
      if (this.solved || this.busy || (st.type !== 'move' && st.type !== 'collect')) return false;
      var p = this.game.get(s);
      if (!p || p.color !== this.game.turn()) return false;
      if (st.only && p.type !== st.only) return false;
      return true;
    },
    dests: function (s) { return destsOf(this.game, s); },
    win: function (text) {
      this.solved = true; this.feedback('good', text || pick(PRAISE)); this.buttons();
      try { $('lsnNext').focus({ preventScroll: true }); } catch (e) {}
    },
    miss: function (text) { this.mistakes++; this.feedback('bad', text); },
    onTap: function (s) {
      var st = this.step;
      if (st.type !== 'tap' || this.solved) return;
      if (st.target.indexOf(s) >= 0) { this.board.set(posOf(this.game), { marks: [s] }); this.win('Yes, that is ' + s + '.'); }
      else this.miss('That square is ' + s + '. Try again.');
    },
    answer: function (btn, idx) {
      var st = this.step;
      if (this.solved) return;
      if (idx === st.answer) { btn.classList.add('right'); Array.prototype.forEach.call($('lsnOpts').children, function (b) { b.disabled = true; }); this.win('Correct! ' + (st.explain || '')); }
      else { btn.classList.add('wrong'); btn.disabled = true; this.miss('Not that one. Have another go.'); }
    },
    onMove: function (from, to) {
      var self = this, st = this.step, game = this.game;
      if (isPromotion(game, from, to)) {
        this.board.askPromotion(game.turn()).then(function (t) { self.apply(from, to, t); });
      } else this.apply(from, to);
    },
    apply: function (from, to, promo) {
      var self = this, st = this.step, game = this.game, tok = this.token;
      var m = game.move({ from: from, to: to, promotion: promo });
      if (!m) { this.draw(); return; }
      var u = uciOf(m);
      if (st.type === 'collect') {
        var k = this.stars.indexOf(to); if (k >= 0) this.stars.splice(k, 1);
        var f = game.fen().split(' '); f[1] = 'w'; f[2] = '-'; f[3] = '-';
        game.load(f.join(' '));
        this.draw({ from: from, to: to });
        var blackLeft = allSquares().some(function (s) { var p = game.get(s); return p && p.color === 'b'; });
        if (!this.stars.length && !blackLeft) { this.win(pick(PRAISE)); return; }
        var canMove = allSquares().some(function (s) { return self.canSelect(s) && destsOf(game, s).length; });
        if (!canMove) {
          this.busy = true; this.miss('Stuck! That piece cannot go any further. Let’s start this one again.');
          setTimeout(function () { if (tok === self.token) { var keep = self.mistakes; self.load(); self.mistakes = keep; } }, 1600);
        } else this.feedback('', '');
        return;
      }
      // move step
      var ok = st.accept ? st.accept.indexOf(u) >= 0 : this.goalMet(st, m);
      if (ok) {
        this.draw({ from: from, to: to });
        var nextStep = this.lesson.steps[this.i + 1];
        var chain = nextStep && nextStep.cont && nextStep.type === 'move';
        this.busy = true;
        this.feedback('good', st.ok || pick(PRAISE));
        var afterReply = function () {
          if (tok !== self.token) return;
          if (chain) { setTimeout(function () { if (tok === self.token) { self.i++; self.load(); } }, 1100); }
          else { self.busy = false; self.win(st.ok); }
        };
        if (st.reply) {
          setTimeout(function () {
            if (tok !== self.token) return;
            var r = playUci(game, st.reply);
            if (r) self.draw({ from: r.from, to: r.to });
            afterReply();
          }, 750);
        } else afterReply();
        return;
      }
      // not the move we wanted: show it, explain, take it back
      var msg, isAlso = st.also && st.also.indexOf(u) >= 0;
      if (isAlso) msg = 'That is a good move too. For this lesson, try the one described above.';
      else if (st.wrongFor && st.wrongFor[u]) msg = st.wrongFor[u];
      else if (game.in_stalemate()) msg = 'Stalemate! The king is not in check and has no legal move, so that would be a draw.';
      else if (st.goal !== 'mate' && st.goal !== 'check' && opponentCanMate(game) && st.goal !== 'any') msg = st.wrong || 'Careful: that allows checkmate on the next move.';
      else msg = st.wrong || 'Not quite. Try again.';
      this.draw({ from: from, to: to });
      this.busy = true;
      if (isAlso) this.feedback('note', msg); else this.miss(msg);
      setTimeout(function () {
        if (tok !== self.token) return;
        game.undo(); self.busy = false; self.draw();
      }, 900);
    },
    goalMet: function (st, m) {
      var game = this.game;
      switch (st.goal) {
        case 'mate': return game.in_checkmate();
        case 'check': return game.in_check();
        case 'capture': return !!m.captured;
        case 'any': return true;
        case 'safe': return m.from === st.piece && !game.moves({ verbose: true }).some(function (x) { return x.to === m.to; });
        case 'noMateIn1': return !opponentCanMate(game);
      }
      return false;
    },
    /* A move that solves the current step, as {from, to}. */
    solution: function () {
      var st = this.step, game = this.game, self = this, found = null;
      if (st.type === 'move') {
        if (st.accept) return { from: st.accept[0].slice(0, 2), to: st.accept[0].slice(2, 4), promotion: st.accept[0][4] };
        game.moves({ verbose: true }).some(function (m) {
          game.move(m); var ok = self.goalMet(st, m); game.undo();
          if (ok) found = { from: m.from, to: m.to, promotion: m.promotion };
          return ok;
        });
        return found;
      }
      if (st.type === 'collect') { var path = collectPath(game.fen(), this.stars, st.only); return path && path.length ? path[0] : null; }
      return null;
    },
    hint: function () {
      var st = this.step;
      if (this.solved || this.busy) return;
      if (!this.hinted) { this.hinted = true; this.mistakes++; }
      if (st.type === 'tap') {
        var t = st.target[0];
        this.feedback('note', this.hintStage === 0 ? 'Find the letter “' + t[0] + '” along the bottom, then go up to row ' + t[1] + '.' : 'It is the highlighted square.');
        if (this.hintStage > 0) this.draw(null, { hint: [t] });
        this.hintStage++;
        return;
      }
      var sol = this.solution();
      if (!sol) { this.feedback('note', 'Look at where each piece can go.'); return; }
      if (this.hintStage === 0) { this.draw(null, { hint: [sol.from] }); this.feedback('note', 'Try moving the highlighted piece.'); }
      else { this.draw(null, { hint: [sol.from, sol.to] }); this.feedback('note', 'Move it to the other highlighted square.' + (sol.promotion ? ' Then choose the ' + NAMES[sol.promotion] + '.' : '')); }
      this.hintStage++;
    },
    next: function () {
      if (!this.solved) return;
      if (this.i < this.lesson.steps.length - 1) { this.i++; this.load(); }
      else this.finish();
    },
    finish: function () {
      var n = this.mistakes === 0 ? 3 : (this.mistakes <= 2 ? 2 : 1);
      var prev = Store.data.stars[this.lesson.id] || 0;
      if (n > prev) { Store.data.stars[this.lesson.id] = n; Store.save(); }
      this.token++;
      $('lessonStage').hidden = true; $('lessonFinish').hidden = false;
      $('finTitle').textContent = this.lesson.title + ': complete!';
      $('finStars').innerHTML = starsHtml(n);
      $('finStars').setAttribute('aria-label', n + ' of 3 stars');
      $('finText').textContent = n === 3 ? 'Three stars: not a single slip.' : (n === 2 ? 'Two stars. Replay the lesson without a slip or a hint to earn the third.' : 'One star. Lessons can be replayed as often as you like to earn more.');
      var nx = this.following();
      $('finNext').textContent = nx ? 'Next: ' + nx.title : 'Play a game';
      try { $('finNext').focus({ preventScroll: true }); window.scrollTo(0, 0); } catch (e) {}
    }
  };

  /* Shortest way to finish a collect exercise (breadth-first search). Returns [{from,to}] or null. */
  function collectPath(fen, stars, only) {
    var start = { fen: fen, stars: stars.slice().sort(), path: [] };
    var queue = [start], seen = {}, guard = 0;
    function key(n) { return n.fen.split(' ')[0] + '|' + n.stars.join(','); }
    seen[key(start)] = 1;
    while (queue.length && guard++ < 20000) {
      var n = queue.shift(), g = new Chess(n.fen);
      var blackLeft = allSquares().some(function (s) { var p = g.get(s); return p && p.color === 'b'; });
      if (!n.stars.length && !blackLeft) return n.path;
      var moves = g.moves({ verbose: true });
      for (var i = 0; i < moves.length; i++) {
        var m = moves[i];
        if (only && m.piece !== only) continue;
        g.move(m);
        var f = g.fen().split(' '); f[1] = 'w'; f[2] = '-'; f[3] = '-';
        var child = { fen: f.join(' '), stars: n.stars.filter(function (s) { return s !== m.to; }), path: n.path.concat([{ from: m.from, to: m.to }]) };
        g.undo();
        var k = key(child);
        if (!seen[k]) { seen[k] = 1; queue.push(child); }
      }
    }
    return null;
  }

  /* ---------------- play against the computer ---------------- */
  var TIERS = [
    [10, 'First steps', 'Moves almost at random and gives pieces away.'],
    [20, 'Beginner', 'Still makes plenty of mistakes.'],
    [30, 'Learner', 'Starts to take the pieces you leave unprotected.'],
    [45, 'Casual player', 'Plays sensible moves, misses tactics.'],
    [60, 'Club player', 'Punishes loose pieces and simple tricks.'],
    [75, 'Strong club player', 'Hard to beat without a plan.'],
    [90, 'Expert', 'Very few mistakes.'],
    [99, 'Master', 'Stronger than almost every human.'],
    [100, 'Full power', 'The engine at full strength.']
  ];
  function tierOf(level) { for (var i = 0; i < TIERS.length; i++) if (level <= TIERS[i][0]) return TIERS[i]; return TIERS[TIERS.length - 1]; }

  var MAX_HINTS = Profiles.HINTS_PER_GAME; // computer hints per game (lesson hints are not limited)

  var Play = {
    board: null, game: null, color: 'w', level: 1, thinking: false, token: 0, started: false, hint: [], hintNote: '', hintsLeft: MAX_HINTS, hintPending: false, lastMove: null, resultShown: false,
    init: function () {
      var self = this;
      this.board = new Board($('playBoard'), {
        canSelect: function (s) { var p = self.game.get(s); return !self.thinking && !self.game.game_over() && self.game.turn() === self.color && p && p.color === self.color; },
        dests: function (s) { return destsOf(self.game, s); },
        onMove: function (a, b) { self.human(a, b); }
      });
      this.restore();
      $('levelRange').value = this.level;
      $('levelRange').addEventListener('input', function () { self.setLevel(+this.value); });
      $('levelDown').addEventListener('click', function () { self.setLevel(self.level - 1); });
      $('levelUp').addEventListener('click', function () { self.setLevel(self.level + 1); });
      $('colW').addEventListener('click', function () { self.setColor('w'); });
      $('colB').addEventListener('click', function () { self.setColor('b'); });
      $('playNew').addEventListener('click', function () { self.newGame(); });
      $('playUndo').addEventListener('click', function () { self.undo(); });
      $('playHint').addEventListener('click', function () { self.showHint(); });
      Engine.onChange(function () { self.engineNote(); });
      this.engineNote();
      this.levelUi();
    },
    /* (Re)load level, colour and the saved game from the active profile; also used when switching profiles. */
    restore: function () {
      var self = this;
      this.token++; this.thinking = false; this.hint = []; this.hintNote = ''; this.hintsLeft = MAX_HINTS; this.hintPending = false; this.lastMove = null; this.resultShown = false;
      this.level =Store.data.level; this.color = Store.data.color;
      this.game = new Chess();
      var g = Store.data.game;
      if (g && Array.isArray(g.moves)) {
        try { g.moves.forEach(function (san) { if (!self.game.move(san)) throw new Error('bad move'); }); } catch (e) { this.game = new Chess(); g = null; }
        if (g && g.hints >= 0 && g.hints <= MAX_HINTS && g.hints === (g.hints | 0)) this.hintsLeft = g.hints;
      }
      this.board.setOrientation(this.color);
      this.levelUi();
    },
    enter: function () {
      this.board.setOrientation(this.color);
      this.draw();
      if (!this.game.game_over() && this.game.turn() !== this.color && !this.thinking) this.computer();
    },
    engineNote: function () {
      var t = Engine.status === 'stockfish' ? 'Computer player: ' + Engine.name + '.'
        : Engine.status === 'builtin' ? 'Computer player: the small built-in engine (Stockfish could not start here, so the top levels are weaker than usual).'
        : 'Loading the strong engine… you can already play.';
      $('engineNote').textContent = t;
    },
    setLevel: function (n) {
      this.level = Math.max(1, Math.min(100, n | 0 || 1));
      Store.data.level = this.level; Store.save();
      this.levelUi(); this.persist();
    },
    levelUi: function () {
      var t = tierOf(this.level), p = Engine.policy(this.level);
      $('levelRange').value = this.level; $('levelNum').textContent = this.level;
      $('tierName').textContent = t[1];
      $('tierText').textContent = t[2] + (p.elo ? ' About ' + (Math.round(p.elo / 50) * 50) + ' Elo.' : '');
      $('levelDown').disabled = this.level <= 1; $('levelUp').disabled = this.level >= 100;
    },
    setColor: function (c) {
      if (c === this.color) return;
      this.color = c; Store.data.color = c; Store.save();
      this.newGame();
    },
    persist: function () { Store.data.game = { moves: this.game.history(), hints: this.hintsLeft, lim: MAX_HINTS }; Store.save(); },
    newGame: function () {
      this.token++; this.thinking = false; this.hint = []; this.hintNote = ''; this.hintsLeft = MAX_HINTS; this.hintPending = false; this.lastMove = null; this.resultShown = false;
      this.game = new Chess();
      this.board.setOrientation(this.color);
      this.persist(); this.draw();
      if (this.color === 'b') this.computer();
    },
    draw: function (anim) {
      var g = this.game, hist = g.history({ verbose: true }), last = hist.length ? hist[hist.length - 1] : null;
      $('colW').setAttribute('aria-pressed', this.color === 'w'); $('colB').setAttribute('aria-pressed', this.color === 'b');
      this.board.set(posOf(g), { last: last ? [last.from, last.to] : null, check: checkSq(g), hint: this.hint }, anim);
      this.board.setEnabled(!g.game_over());
      // status line
      var over = g.game_over(), mine = g.turn() === this.color, st = $('playStatus');
      var sub = 'You play ' + (this.color === 'w' ? 'White' : 'Black') + ' against level ' + this.level;
      var head = over ? 'Game over' : (this.thinking || !mine ? 'The computer is thinking…' : (g.in_check() ? 'Check! Your move' : 'Your move'));
      if (!over && this.hintsLeft < 1) sub += '. No hints left in this game';
      st.textContent = head; st.appendChild(el('small', null, sub));
      // result
      var res = $('playResult');
      if (over) {
        var r = this.outcome();
        res.className = 'p-fb result' + (r.win ? ' win' : '');
        res.innerHTML = ''; res.appendChild(el('h3', null, r.title)); res.appendChild(el('span', null, r.text));
        if (r.win && this.level < 100) {
          var self = this, up = el('button', 'btn small', 'Play level ' + (this.level + 1));
          up.type = 'button'; up.id = 'playLevelUp';
          up.addEventListener('click', function () { self.setLevel(self.level + 1); self.newGame(); });
          res.appendChild(up);
        }
        if (!this.resultShown) {
          this.resultShown = true;
          if (r.win && this.level > Store.data.best) { Store.data.best = this.level; Store.save(); }
        }
      } else { res.className = 'p-fb' + (this.hintNote ? ' note' : ''); res.textContent = this.hintNote; }
      // buttons
      var plies = hist.length;
      $('playUndo').disabled = this.color === 'w' ? plies < 1 : plies < 2;
      $('playHint').disabled = over || !mine || this.thinking; // at 0 it stays pressable so it can explain the limit
      $('playHint').textContent = 'Hint (' + this.hintsLeft + ' left)';
      $('playHint').title = this.hintsLeft < 1 ? 'You used all ' + MAX_HINTS + ' hints in this game. Start a new game for more.' : '';
      // move list
      var list = $('moveList'), sans = g.history(); list.innerHTML = '';
      for (var i = 0; i < sans.length; i += 2) {
        list.appendChild(el('span', 'n', (i / 2 + 1) + '.'));
        list.appendChild(el('span', null, sans[i]));
        list.appendChild(el('span', null, sans[i + 1] || ''));
      }
      list.scrollTop = list.scrollHeight;
    },
    outcome: function () {
      var g = this.game;
      if (g.in_checkmate()) {
        var win = g.turn() !== this.color;
        return win ? { win: true, title: 'Checkmate! You won!', text: 'You beat level ' + this.level + '.' + (this.level < 100 ? ' Ready for the next one?' : ' That is the strongest there is.') }
                   : { win: false, title: 'Checkmate. The computer won.', text: 'Your king had no way out. Press Undo to see where it went wrong, or start a new game.' };
      }
      if (g.in_stalemate()) return { win: false, title: 'Stalemate: a draw', text: (g.turn() === this.color ? 'You have' : 'The computer has') + ' no legal move and is not in check, so nobody wins.' };
      if (g.insufficient_material()) return { win: false, title: 'Draw', text: 'Neither side has enough pieces left to give checkmate.' };
      if (g.in_threefold_repetition()) return { win: false, title: 'Draw by repetition', text: 'The same position came up three times.' };
      return { win: false, title: 'Draw', text: 'Fifty moves went by with no capture and no pawn move.' };
    },
    human: function (from, to) {
      var self = this;
      if (isPromotion(this.game, from, to)) this.board.askPromotion(this.color).then(function (t) { self.commit(from, to, t); });
      else this.commit(from, to);
    },
    commit: function (from, to, promo) {
      var m = this.game.move({ from: from, to: to, promotion: promo });
      if (!m) { this.draw(); return; }
      this.hint = []; this.hintNote = ''; this.persist();
      if (this.game.game_over()) { this.draw({ from: from, to: to }); return; }
      this.thinking = true;
      this.draw({ from: from, to: to });
      this.computer();
    },
    computer: function () {
      var self = this, tok = ++this.token, fen = this.game.fen(), t0 = Date.now();
      this.thinking = true; this.draw();
      Engine.pick(fen, this.level).then(function (u) {
        var wait = Math.max(0, 450 * Engine.timeScale - (Date.now() - t0));
        setTimeout(function () {
          if (tok !== self.token) return;
          var m = u && playUci(self.game, u);
          if (!m) { // never leave the game stuck: fall back to any legal move
            var ms = self.game.moves({ verbose: true }); m = ms.length ? self.game.move(ms[0]) : null;
          }
          self.thinking = false; self.persist();
          self.draw(m ? { from: m.from, to: m.to } : null);
        }, wait);
      }, function () {
        if (tok !== self.token) return;
        var ms = self.game.moves({ verbose: true }), m = ms.length ? self.game.move(pick(ms)) : null;
        self.thinking = false; self.persist(); self.draw(m ? { from: m.from, to: m.to } : null);
      });
    },
    undo: function () {
      this.token++; this.hint = []; this.hintNote = ''; this.resultShown = false;
      var wasThinking = this.thinking; this.thinking = false;
      // take back until it is the player's turn again
      if (this.game.history().length) this.game.undo();
      if (!wasThinking && this.game.turn() !== this.color && this.game.history().length) this.game.undo();
      this.persist(); this.draw();
      if (this.game.turn() !== this.color && !this.game.game_over()) this.computer();
    },
    showHint: function () {
      var self = this, tok = this.token, fen = this.game.fen();
      if (this.hintPending) return;
      if (this.hintsLeft < 1) { this.hint = []; this.hintNote = 'No hints left: you used all ' + MAX_HINTS + ' in this game. Start a new game for more.'; this.draw(); return; }
      this.hintPending = true;
      $('playHint').disabled = true;
      Engine.hint(fen).then(function (u) {
        self.hintPending = false;
        if (tok !== self.token || self.game.fen() !== fen || !u) { self.draw(); return; }
        self.hintsLeft--; self.persist();
        self.hint = [u.slice(0, 2), u.slice(2, 4)];
        self.hintNote = Strategy.describe(self.game, u, Lessons) || ''; // empty: plain best-move hint
        self.draw();
      }, function () { self.hintPending = false; self.draw(); });
    }
  };

  /* ---------------- who's playing: pick, create, edit, export, import ---------------- */
  var Who = {
    dlg: null, mode: 'list', editId: null, confirmDelete: false, msg: null, code: '',
    init: function () {
      var self = this;
      this.dlg = $('profileDlg');
      $('profileBtn').addEventListener('click', function () { self.open(); });
      this.dlg.addEventListener('click', function (e) { if (e.target === self.dlg) self.close(); }); // click on the backdrop
      this.paintButton();
    },
    paintButton: function () {
      var p = Store.profile();
      $('profileAvatar').textContent = p.avatar; $('profileName').textContent = p.name;
      $('profileBtn').setAttribute('aria-label', 'Who is playing: ' + p.name + '. Change player');
    },
    open: function () {
      this.go('list');
      if (this.dlg.showModal) { if (!this.dlg.open) this.dlg.showModal(); } else this.dlg.setAttribute('open', '');
    },
    close: function () {
      if (this.dlg.close) this.dlg.close(); else this.dlg.removeAttribute('open');
      try { $('profileBtn').focus(); } catch (e) {}
    },
    go: function (mode, id, msg) {
      this.mode = mode; this.editId = id || null; this.confirmDelete = false; this.msg = msg || null;
      this.render();
    },
    note: function (parent) {
      if (!this.msg) return;
      var n = el('div', 'p-fb ' + this.msg.kind, this.msg.text); n.setAttribute('role', this.msg.kind === 'bad' ? 'alert' : 'status'); parent.appendChild(n);
    },
    button: function (parent, label, cls, fn) {
      var b = el('button', 'btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', fn); parent.appendChild(b); return b;
    },
    render: function () {
      var d = this.dlg, self = this;
      d.innerHTML = '';
      var box = el('div', 'dlgbox'); d.appendChild(box);
      var focus = null;
      if (this.mode === 'list') {
        box.appendChild(el('h2', null, 'Who’s playing?'));
        var list = el('div', 'profs');
        Store.doc.profiles.forEach(function (p) {
          var row = el('div', 'prof' + (p.id === Store.doc.active ? ' on' : ''));
          var pick = el('button', 'pick'); pick.type = 'button';
          var n = 0; for (var k in p.data.stars) n += p.data.stars[k];
          pick.appendChild(el('span', 'av', p.avatar)); pick.appendChild(el('span', 'nm', p.name));
          pick.appendChild(el('small', null, n + (n === 1 ? ' star' : ' stars') + ', level ' + p.data.level + (p.id === Store.doc.active ? ', playing now' : '')));
          pick.addEventListener('click', function () { self.choose(p.id); });
          row.appendChild(pick);
          var ed = el('button', 'btn small', 'Edit'); ed.type = 'button'; ed.setAttribute('aria-label', 'Edit ' + p.name);
          ed.addEventListener('click', function () { self.go('edit', p.id); });
          row.appendChild(ed); list.appendChild(row);
          if (p.id === Store.doc.active) focus = pick;
        });
        box.appendChild(list);
        this.note(box);
        var r = el('div', 'row'); box.appendChild(r);
        if (Store.doc.profiles.length < Profiles.MAX_PROFILES) this.button(r, 'New player', 'primary', function () { self.go('edit', null); });
        this.button(r, 'Import a profile', '', function () { self.go('import'); });
        this.button(r, 'Close', '', function () { self.close(); });
      } else if (this.mode === 'edit') {
        var p = this.editId ? Profiles.find(Store.doc, this.editId) : null, avatar = p ? p.avatar : Profiles.AVATARS[Store.doc.profiles.length % Profiles.AVATARS.length];
        box.appendChild(el('h2', null, p ? 'Edit player' : 'New player'));
        var lab = el('label', 'fld', 'Name'); var inp = el('input'); inp.type = 'text'; inp.maxLength = Profiles.MAX_NAME; inp.value = p ? p.name : ''; inp.id = 'profName'; inp.autocomplete = 'off';
        lab.appendChild(inp); box.appendChild(lab); focus = inp;
        box.appendChild(el('div', 'fld', 'Picture'));
        var av = el('div', 'avs'); av.setAttribute('role', 'group'); av.setAttribute('aria-label', 'Picture');
        Profiles.AVATARS.forEach(function (a) {
          var b = el('button', null, a); b.type = 'button'; b.setAttribute('aria-pressed', a === avatar);
          b.addEventListener('click', function () { avatar = a; Array.prototype.forEach.call(av.children, function (c) { c.setAttribute('aria-pressed', c === b); }); });
          av.appendChild(b);
        });
        box.appendChild(av);
        this.note(box);
        var save = function () {
          try {
            if (p) { Profiles.rename(Store.doc, p.id, inp.value, avatar); Store.save(); self.after(false); self.go('list', null, { kind: 'good', text: 'Saved.' }); }
            else { var np = Profiles.add(Store.doc, inp.value || 'Player', avatar); Store.save(); self.choose(np.id); }
          } catch (e) { self.go('edit', self.editId, { kind: 'bad', text: e.message }); }
        };
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); save(); } });
        var r2 = el('div', 'row'); box.appendChild(r2);
        this.button(r2, p ? 'Save' : 'Create player', 'primary', save);
        if (p) this.button(r2, 'Export', '', function () { self.code = Profiles.exportCode(p); self.go('export', p.id); });
        this.button(r2, 'Back', '', function () { self.go('list'); });
        if (p && Store.doc.profiles.length > 1) {
          var r3 = el('div', 'row danger'); box.appendChild(r3);
          if (!this.confirmDelete) this.button(r3, 'Delete player…', '', function () { self.confirmDelete = true; self.render(); });
          else {
            r3.appendChild(el('p', null, 'Delete ' + p.name + ' and all their stars? This cannot be undone. Export first to keep a copy.'));
            this.button(r3, 'Yes, delete ' + p.name, 'bad', function () {
              var wasActive = p.id === Store.doc.active;
              try { Profiles.remove(Store.doc, p.id); } catch (e) { self.go('list', null, { kind: 'bad', text: e.message }); return; }
              if (wasActive) Store.switchTo(Store.doc.active); else Store.save();
              self.after(wasActive); self.go('list', null, { kind: 'good', text: 'Deleted.' });
            });
            this.button(r3, 'No, keep', '', function () { self.confirmDelete = false; self.render(); });
          }
        }
      } else if (this.mode === 'export') {
        var q = Profiles.find(Store.doc, this.editId);
        box.appendChild(el('h2', null, 'Export ' + (q ? q.name : '')));
        box.appendChild(el('p', null, 'This code holds the stars, level and game. Copy it or save it as a file, then use “Import a profile” on the other device.'));
        var ta = el('textarea'); ta.readOnly = true; ta.rows = 5; ta.value = this.code; ta.setAttribute('aria-label', 'Profile code'); box.appendChild(ta);
        this.note(box);
        var r4 = el('div', 'row'); box.appendChild(r4);
        this.button(r4, 'Copy code', 'primary', function () {
          ta.select();
          var done = function () { self.msg = { kind: 'good', text: 'Copied.' }; self.render(); };
          var fail = function () { self.msg = { kind: 'note', text: 'Select the code and copy it.' }; self.render(); };
          try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(self.code).then(done, fail); else fail(); } catch (e) { fail(); }
        });
        this.button(r4, 'Save as file', '', function () {
          try {
            var a = document.createElement('a'), url = URL.createObjectURL(new Blob([self.code], { type: 'text/plain' }));
            a.href = url; a.download = 'knight-school-' + (q ? q.name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') : 'profile').toLowerCase() + '.txt';
            document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          } catch (e) { self.msg = { kind: 'bad', text: 'Could not save a file here. Copy the code instead.' }; self.render(); }
        });
        this.button(r4, 'Back', '', function () { self.go('edit', self.editId); });
        focus = ta;
      } else { // import
        box.appendChild(el('h2', null, 'Import a profile'));
        box.appendChild(el('p', null, 'Paste a code from another device, or choose a saved file. It is added as a new player; nobody is replaced.'));
        var ta2 = el('textarea'); ta2.rows = 5; ta2.value = this.code; ta2.setAttribute('aria-label', 'Profile code'); ta2.placeholder = 'KS1.…'; box.appendChild(ta2); focus = ta2;
        var file = el('input'); file.type = 'file'; file.accept = '.txt,text/plain'; file.setAttribute('aria-label', 'Choose a profile file');
        file.addEventListener('change', function () {
          var f = file.files && file.files[0]; if (!f) return;
          if (f.size > 100000) { self.code = ''; self.go('import', null, { kind: 'bad', text: 'That file is too big to be a profile.' }); return; }
          var rd = new FileReader();
          rd.onload = function () { self.code = String(rd.result || ''); self.go('import'); };
          rd.onerror = function () { self.go('import', null, { kind: 'bad', text: 'Could not read that file.' }); };
          rd.readAsText(f);
        });
        box.appendChild(file);
        this.note(box);
        var r5 = el('div', 'row'); box.appendChild(r5);
        this.button(r5, 'Import', 'primary', function () {
          self.code = ta2.value;
          try { var np = Profiles.importCode(Store.doc, ta2.value); Store.save(); self.code = ''; self.go('list', null, { kind: 'good', text: 'Added ' + np.name + '. Tap their name to play as them.' }); }
          catch (e) { self.go('import', null, { kind: 'bad', text: e.message }); }
        });
        this.button(r5, 'Back', '', function () { self.code = ''; self.go('list'); });
      }
      if (focus) { try { focus.focus(); } catch (e) {} }
    },
    /* Make a profile the one being played, and refresh whatever shows its progress. */
    choose: function (id) {
      var changed = id !== Store.doc.active;
      if (changed) Store.switchTo(id); else Store.save();
      this.after(changed); this.close();
    },
    after: function (changed) {
      this.paintButton();
      if (!changed) { renderHome(); return; }
      Play.restore();
      show(current === 'lesson' ? 'home' : current);
    }
  };

  /* ---------------- start ---------------- */
  Store.load();
  Lesson.init();
  Play.init();
  Who.init();
  $('brand').addEventListener('click', function () { show('home'); });
  $('navLearn').addEventListener('click', function () { show('learn'); });
  $('navPlay').addEventListener('click', function () { show('play'); });
  $('homeAll').addEventListener('click', function () { show('learn'); });
  $('homePlay').addEventListener('click', function () { show('play'); });
  $('homeContinue').addEventListener('click', function () { var nx = nextLesson(); if (nx) Lesson.start(nx.id); else show('learn'); });
  window.addEventListener('hashchange', route);
  route();

  window.KS = { Store: Store, Lesson: Lesson, Play: Play, show: show, collectPath: collectPath }; // for tests
})();
