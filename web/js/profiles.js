/* Knight School profiles: the data format, migration, validation and export/import. No DOM and no storage in here:
   app.js passes the saved text in and writes the result out through its storage interface. */
(function (root) {
  'use strict';
  var DOC_VERSION = 2;          // the saved document: { v, active, profiles: [{ id, name, avatar, data }] }
  var CODE_PREFIX = 'KS1.';     // export code: prefix + base64url(JSON)
  var FORMAT = 'knight-school-profile';
  var MAX_PROFILES = 12, MAX_NAME = 20, MAX_CODE = 60000, MAX_MOVES = 1000;
  var AVATARS = ['🦊', '🐼', '🐸', '🦁', '🐙', '🦄', '🐢', '🚀', '⚽', '🌈'];

  function isObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function emptyData() { return { stars: {}, level: 1, color: 'w', best: 0, game: null }; }
  function newId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function cleanName(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, MAX_NAME); }
  function int(n, lo, hi, dflt) { n = parseInt(n, 10); return isNaN(n) ? dflt : Math.max(lo, Math.min(hi, n)); }

  /* Lenient: turns whatever was saved into valid progress (used for saved data and the old single-profile data). */
  function cleanData(d) {
    var out = emptyData();
    if (!isObj(d)) return out;
    if (isObj(d.stars)) for (var k in d.stars) {
      var n = int(d.stars[k], 0, 3, 0);
      if (n && /^[A-Za-z0-9_-]{1,40}$/.test(k)) out.stars[k] = n;
    }
    out.level = int(d.level, 1, 100, 1);
    out.color = d.color === 'b' ? 'b' : 'w';
    out.best = int(d.best, 0, 100, 0);
    var g = d.game;
    if (isObj(g) && Array.isArray(g.moves) && g.moves.length <= MAX_MOVES && g.moves.every(function (m) { return typeof m === 'string' && m.length <= 10; })) {
      out.game = { moves: g.moves.slice(), hints: int(g.hints, 0, 3, 3) };
    }
    return out;
  }

  /* Strict: the problem with imported data in plain English, or '' when it is fine. */
  function problemWith(d) {
    if (!isObj(d)) return 'The progress in it is missing.';
    if (!isObj(d.stars)) return 'The stars in it are missing.';
    for (var k in d.stars) if (!/^[A-Za-z0-9_-]{1,40}$/.test(k) || [0, 1, 2, 3].indexOf(d.stars[k]) < 0) return 'The stars in it are not valid.';
    if (parseInt(d.level, 10) !== d.level || d.level < 1 || d.level > 100) return 'The level in it is not valid.';
    if (d.color !== 'w' && d.color !== 'b') return 'The colour in it is not valid.';
    if (parseInt(d.best, 10) !== d.best || d.best < 0 || d.best > 100) return 'The best win in it is not valid.';
    if (d.game !== null && d.game !== undefined) {
      var g = d.game;
      if (!isObj(g) || !Array.isArray(g.moves) || g.moves.length > MAX_MOVES || !g.moves.every(function (m) { return typeof m === 'string' && m.length <= 10; })) return 'The game in it is not valid.';
      if (parseInt(g.hints, 10) !== g.hints || g.hints < 0 || g.hints > 3) return 'The game in it is not valid.';
    }
    return '';
  }

  function makeProfile(name, avatar, data) {
    return { id: newId(), name: cleanName(name) || 'Player', avatar: AVATARS.indexOf(avatar) >= 0 ? avatar : AVATARS[0], data: cleanData(data) };
  }

  /* Build the document from what is saved. `raw` is the profiles text (or null), `legacy` the old single-progress
     text (or null). The old progress becomes the first profile and is never deleted. */
  function load(raw, legacy) {
    var doc = null, parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    if (isObj(parsed) && parsed.v === DOC_VERSION && Array.isArray(parsed.profiles)) {
      var seen = {}, list = [];
      parsed.profiles.forEach(function (p) {
        if (!isObj(p) || typeof p.id !== 'string' || !p.id || seen[p.id] || list.length >= MAX_PROFILES) return;
        seen[p.id] = 1;
        list.push({ id: p.id, name: cleanName(p.name) || 'Player', avatar: AVATARS.indexOf(p.avatar) >= 0 ? p.avatar : AVATARS[0], data: cleanData(p.data) });
      });
      if (list.length) doc = { v: DOC_VERSION, active: seen[parsed.active] ? parsed.active : list[0].id, profiles: list };
    }
    if (!doc) {
      var old = null;
      try { old = legacy ? JSON.parse(legacy) : null; } catch (e) { old = null; }
      var first = makeProfile('Player', AVATARS[0], old);
      doc = { v: DOC_VERSION, active: first.id, profiles: [first] };
    }
    return doc;
  }

  function find(doc, id) { for (var i = 0; i < doc.profiles.length; i++) if (doc.profiles[i].id === id) return doc.profiles[i]; return null; }
  function active(doc) { return find(doc, doc.active) || doc.profiles[0]; }
  function add(doc, name, avatar, data) {
    if (doc.profiles.length >= MAX_PROFILES) throw new Error('There are already ' + MAX_PROFILES + ' players. Delete one first.');
    var p = makeProfile(name, avatar, data); doc.profiles.push(p); return p;
  }
  function rename(doc, id, name, avatar) {
    var p = find(doc, id); if (!p) return null;
    var n = cleanName(name); if (!n) throw new Error('Please type a name.');
    p.name = n; if (AVATARS.indexOf(avatar) >= 0) p.avatar = avatar;
    return p;
  }
  function remove(doc, id) {
    if (doc.profiles.length < 2) throw new Error('There must be at least one player.');
    doc.profiles = doc.profiles.filter(function (p) { return p.id !== id; });
    if (doc.active === id) doc.active = doc.profiles[0].id;
  }

  /* ---- export / import ---- */
  function toB64(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function fromB64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }

  function exportCode(profile) {
    return CODE_PREFIX + toB64(JSON.stringify({ format: FORMAT, v: 1, name: profile.name, avatar: profile.avatar, data: profile.data }));
  }

  /* Adds the imported profile as a new player (new id, so nothing existing is replaced). Throws Error with a
     message for the child or parent to read; the document is not touched unless everything checks out. */
  function importCode(doc, text) {
    var code = String(text == null ? '' : text).replace(/\s+/g, '');
    if (!code) throw new Error('Paste a profile code or choose a file first.');
    if (code.length > MAX_CODE) throw new Error('That is too big to be a profile code.');
    if (code.indexOf(CODE_PREFIX) !== 0) throw new Error('That does not look like a Knight School profile code.');
    var p;
    try { p = JSON.parse(fromB64(code.slice(CODE_PREFIX.length))); } catch (e) { throw new Error('That code is damaged. Copy it again, all of it.'); }
    if (!isObj(p) || p.format !== FORMAT) throw new Error('That does not look like a Knight School profile code.');
    if (p.v !== 1) throw new Error('That code is from a newer version of Knight School.');
    if (typeof p.name !== 'string' || !cleanName(p.name)) throw new Error('The name in it is missing.');
    if (AVATARS.indexOf(p.avatar) < 0) throw new Error('The picture in it is not valid.');
    var bad = problemWith(p.data);
    if (bad) throw new Error('That code is damaged. ' + bad);
    return add(doc, p.name, p.avatar, p.data);
  }

  root.Profiles = {
    DOC_VERSION: DOC_VERSION, MAX_PROFILES: MAX_PROFILES, MAX_NAME: MAX_NAME, AVATARS: AVATARS,
    emptyData: emptyData, cleanData: cleanData, load: load, find: find, active: active,
    add: add, rename: rename, remove: remove, exportCode: exportCode, importCode: importCode
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Profiles;
})(typeof window !== 'undefined' ? window : globalThis);
