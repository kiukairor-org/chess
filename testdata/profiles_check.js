// Run by TestProfilesLogic with the path of web/js/profiles.js as argv[2]. Exits non-zero on the first failed check.
'use strict';
const assert = require('assert');
const P = require(require('path').resolve(process.argv[2]));
const snap = (d) => JSON.stringify(d);

// 1. First load with existing progress: the first profile holds it, nothing lost.
const legacy = { stars: { pieces1: 3, pieces2: 1 }, level: 42, color: 'b', best: 30, game: { moves: ['e4', 'e5'], hints: 1 } };
// saved with the old limit of 3 (1 left = 2 used): the 2 used hints are kept under the new limit of 10
const migrated = { ...legacy, game: { moves: ['e4', 'e5'], hints: 8, lim: 10 } };
assert.strictEqual(P.HINTS_PER_GAME, 10);
const doc = P.load(null, JSON.stringify(legacy));
assert.strictEqual(doc.v, 2);
assert.strictEqual(doc.profiles.length, 1);
assert.strictEqual(doc.active, doc.profiles[0].id);
assert.ok(/^p[a-z0-9]+$/.test(doc.profiles[0].id));
assert.deepStrictEqual(doc.profiles[0].data, migrated);
// loading again does not use up more hints
assert.deepStrictEqual(P.load(snap(doc), null).profiles[0].data, migrated);
// an untouched old game keeps all 3 of its hints available (10 now), a used-up one stays used up (0 left)
const oldGame = (h) => P.cleanData({ game: { moves: [], hints: h } }).game.hints;
assert.deepStrictEqual([oldGame(3), oldGame(0), oldGame(undefined)], [10, 7, 10]);
// a game saved with the new limit is taken as it is
assert.strictEqual(P.cleanData({ game: { moves: [], hints: 9, lim: 10 } }).game.hints, 9);
assert.strictEqual(P.cleanData({ game: { moves: [], hints: 99, lim: 10 } }).game.hints, 10);
// a fresh browser gets one empty profile
assert.deepStrictEqual(P.load(null, null).profiles[0].data, P.emptyData());
// saved profiles win over the old key, and the id is stable across loads
const again = P.load(snap(doc), JSON.stringify({ level: 7 }));
assert.strictEqual(again.profiles[0].data.level, 42);
assert.strictEqual(again.profiles[0].id, doc.profiles[0].id);

// 2. Two profiles keep separate progress and survive a save/load round trip.
const kid = P.add(doc, 'Kid', P.AVATARS[1]);
kid.data.stars.rules1 = 2; kid.data.level = 5;
const back = P.load(snap(doc), null);
assert.strictEqual(back.profiles.length, 2);
assert.deepStrictEqual(back.profiles[0].data, migrated);
assert.strictEqual(back.profiles[1].data.level, 5);
assert.deepStrictEqual(back.profiles[1].data.stars, { rules1: 2 });
assert.strictEqual(back.profiles[1].data.game, null);
assert.notStrictEqual(back.profiles[0].id, back.profiles[1].id);

// rename and delete
P.rename(doc, kid.id, '  Sam   Jr ', P.AVATARS[2]);
assert.strictEqual(kid.name, 'Sam Jr');
assert.strictEqual(kid.avatar, P.AVATARS[2]);
assert.throws(() => P.rename(doc, kid.id, '   '), /name/);
doc.active = kid.id;
P.remove(doc, kid.id);
assert.strictEqual(doc.profiles.length, 1);
assert.strictEqual(doc.active, doc.profiles[0].id);
assert.throws(() => P.remove(doc, doc.profiles[0].id), /at least one/);

// 3. Export, then import into "another browser".
const src = P.load(null, JSON.stringify(legacy)).profiles[0];
src.name = 'Zoë ♞';
const code = P.exportCode(src);
assert.ok(code.startsWith('KS1.') && /^[A-Za-z0-9._-]+$/.test(code));
const other = P.load(null, null);
const got = P.importCode(other, code.replace(/(.{20})/g, '$1\n  ')); // whitespace from copy/paste is fine
assert.strictEqual(other.profiles.length, 2);
assert.strictEqual(got.name, 'Zoë ♞');
assert.strictEqual(got.avatar, src.avatar);
assert.deepStrictEqual(got.data, migrated);
assert.notStrictEqual(got.id, src.id);

// 4. Bad imports are rejected with a message and change nothing.
const b64 = (o) => 'KS1.' + Buffer.from(JSON.stringify(o)).toString('base64url');
const okPayload = () => ({ format: 'knight-school-profile', v: 1, name: 'A', avatar: P.AVATARS[0], data: P.emptyData() });
const mut = (f) => { const p = okPayload(); f(p); return b64(p); };
const bad = [
  ['', /Paste/], ['hello', /does not look/], ['KS1.', /damaged|does not look/], ['KS1.!!!notbase64', /damaged/],
  ['KS1.' + Buffer.from('not json').toString('base64url'), /damaged/],
  [b64({ nope: 1 }), /does not look/], [b64([1, 2]), /does not look/],
  [mut((p) => { p.v = 2; }), /newer/], [mut((p) => { p.name = ''; }), /name/], [mut((p) => { p.name = 5; }), /name/],
  [mut((p) => { p.avatar = '<script>'; }), /picture/],
  [mut((p) => { delete p.data; }), /damaged/], [mut((p) => { p.data.stars = []; }), /damaged/],
  [mut((p) => { p.data.stars = { a: 9 }; }), /damaged/], [mut((p) => { p.data.stars = { 'a b': 1 }; }), /damaged/],
  [mut((p) => { p.data.level = 0; }), /damaged/], [mut((p) => { p.data.level = '5'; }), /damaged/],
  [mut((p) => { p.data.color = 'x'; }), /damaged/], [mut((p) => { p.data.best = 101; }), /damaged/],
  [mut((p) => { p.data.game = { moves: 'e4', hints: 1 }; }), /damaged/],
  [mut((p) => { p.data.game = { moves: [1], hints: 1 }; }), /damaged/],
  [mut((p) => { p.data.game = { moves: [], hints: 4 }; }), /damaged/],
  [mut((p) => { p.data.game = { moves: [], hints: 11, lim: 10 }; }), /damaged/],
  [mut((p) => { p.data.game = { moves: [], hints: -1, lim: 10 }; }), /damaged/],
  ['KS1.' + 'A'.repeat(70000), /too big/],
];
for (const [text, re] of bad) {
  const before = snap(other);
  assert.throws(() => P.importCode(other, text), (e) => re.test(e.message), 'should reject ' + String(text).slice(0, 40));
  assert.strictEqual(snap(other), before, 'rejected import changed the profiles');
}
// the cap on players is enforced on import too, without changing anything
const full = P.load(null, null);
while (full.profiles.length < P.MAX_PROFILES) P.add(full, 'x');
const fb = snap(full);
assert.throws(() => P.importCode(full, code), /already/);
assert.strictEqual(snap(full), fb);

// 5. Corrupt saved data does not crash; it falls back to the old progress.
for (const raw of ['{not json', '[]', '{"v":2,"profiles":[]}', '{"v":3,"profiles":[{"id":"a"}]}']) {
  const d = P.load(raw, JSON.stringify(legacy));
  assert.deepStrictEqual(d.profiles[0].data, migrated);
}
// ...and hostile values inside saved data are cleaned.
const hostile = P.load(JSON.stringify({ v: 2, active: 'zzz', profiles: [{ id: 'a', name: '  ', avatar: 'x', data: { stars: { a: 99, 'b c': 1 }, level: 1000, color: 'q', game: { moves: [1] } } }] }), null);
assert.strictEqual(hostile.active, 'a');
assert.strictEqual(hostile.profiles[0].name, 'Player');
assert.deepStrictEqual(hostile.profiles[0].data, { stars: { a: 3 }, level: 100, color: 'w', best: 0, game: null });
console.log('ok');
