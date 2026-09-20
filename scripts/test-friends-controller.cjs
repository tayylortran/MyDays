/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/friends/friendsController.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', compiled)(() => ({}), loaded, loaded.exports);
const { createFriendsController } = loaded.exports;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

function setup(overrides = {}) {
  let relationship = 'none';
  const person = { friendshipId: 'request', userId: 'bob', username: 'Bob', createdAt: 'now', acceptedAt: null };
  const calls = [];
  const api = {
    listFriends: async () => relationship === 'friends' ? [person] : [],
    listIncomingFriendRequests: async () => relationship === 'incoming' ? [person] : [],
    listOutgoingFriendRequests: async () => relationship === 'outgoing' ? [person] : [],
    searchFriendUsername: async () => ({ userId: 'bob', username: 'Bob', friendshipId: relationship === 'none' ? null : 'request', relationship }),
    sendFriendRequest: async (id) => { calls.push(['send', id]); relationship = 'outgoing'; return 'request'; },
    acceptFriendRequest: async (id) => { calls.push(['accept', id]); relationship = 'friends'; },
    declineFriendRequest: async (id) => { calls.push(['decline', id]); relationship = 'none'; },
    cancelFriendRequest: async (id) => { calls.push(['cancel', id]); relationship = 'none'; },
    ...overrides,
  };
  const controller = createFriendsController(api);
  controller.activate();
  return { controller, api, calls, setRelationship: (value) => { relationship = value; } };
}

async function main() {
  const { controller: c, calls, setRelationship } = setup();
  c.open();
  await settle();
  assert.equal(c.getSnapshot().lists.incoming.length, 0);
  c.setQuery('Bob');
  await c.search();
  await c.act('send', 'bob');
  assert.equal(c.getSnapshot().result.relationship, 'outgoing');
  assert.equal(c.getSnapshot().lists.outgoing.length, 1);
  setRelationship('friends');
  await c.refresh();
  assert.equal(c.getSnapshot().result.relationship, 'friends', 'Refresh reconciles search after remote acceptance');
  setRelationship('outgoing');
  await c.act('cancel', 'request');
  assert.equal(c.getSnapshot().result.relationship, 'none');
  assert.equal(c.getSnapshot().lists.outgoing.length, 0);
  setRelationship('incoming');
  await c.refresh();
  await c.search();
  await c.act('accept', 'request');
  assert.equal(c.getSnapshot().lists.incoming.length, 0);
  assert.equal(c.getSnapshot().lists.friends.length, 1);
  assert.equal(c.getSnapshot().result.relationship, 'friends');
  setRelationship('incoming');
  await c.refresh();
  await c.act('decline', 'request');
  assert.equal(c.getSnapshot().lists.incoming.length, 0);
  assert.deepEqual(calls.map(([action]) => action), ['send', 'cancel', 'accept', 'decline']);

  // Typing or closing invalidates old network responses, including late failures.
  const oldSearch = deferred();
  const newer = { userId: 'cara', username: 'Cara', friendshipId: null, relationship: 'none' };
  const race = setup({ searchFriendUsername: (name) => name === 'Bob' ? oldSearch.promise : Promise.resolve(newer) }).controller;
  race.open(); await settle();
  race.setQuery('Bob'); const old = race.search();
  race.setQuery('Cara'); await race.search();
  oldSearch.resolve({ ...newer, username: 'Bob' }); await old;
  assert.equal(race.getSnapshot().result.username, 'Cara');
  const afterClose = deferred();
  const closing = setup({ searchFriendUsername: () => afterClose.promise }).controller;
  closing.open(); await settle(); closing.setQuery('Bob');
  const closingSearch = closing.search(); closing.close();
  afterClose.resolve(newer); await closingSearch;
  assert.equal(closing.getSnapshot().result, null);
  assert.equal(closing.getSnapshot().open, false);

  const duringSave = deferred();
  const mutationRace = setup();
  let searches = 0;
  mutationRace.api.searchFriendUsername = async () => ++searches === 1 ? duringSave.promise : { ...newer, relationship: 'friends' };
  mutationRace.controller.open(); await settle(); mutationRace.controller.setQuery('Cara');
  const pendingSearch = mutationRace.controller.search();
  await mutationRace.controller.act('accept', 'request');
  duringSave.resolve({ ...newer, relationship: 'incoming' }); await pendingSearch;
  assert.equal(mutationRace.controller.getSnapshot().result.relationship, 'friends', 'Pre-mutation search cannot restore an old action');

  // Double taps cannot submit two mutations or dismiss the sheet mid-save.
  const save = deferred(); let saveCalls = 0;
  const locked = setup({ sendFriendRequest: () => { saveCalls++; return save.promise; } }).controller;
  locked.open(); await settle();
  const saving = locked.act('send', 'bob');
  await locked.act('send', 'bob'); locked.close(); locked.setQuery('Cara');
  assert.equal(saveCalls, 1); assert.equal(locked.getSnapshot().open, true); assert.equal(locked.getSnapshot().query, '');
  save.resolve('request'); await saving;
  assert.equal(locked.getSnapshot().working, null);

  // A committed mutation with a lost response must still reload the actual state.
  const uncertain = setup();
  uncertain.api.sendFriendRequest = async () => { uncertain.setRelationship('outgoing'); throw new Error('Could not confirm the change.'); };
  uncertain.controller.open(); await settle(); uncertain.controller.setQuery('Bob'); await uncertain.controller.search();
  await uncertain.controller.act('send', 'bob');
  assert.equal(uncertain.controller.getSnapshot().lists.outgoing.length, 1);
  assert.equal(uncertain.controller.getSnapshot().result.relationship, 'outgoing');
  assert.match(uncertain.controller.getSnapshot().actionError, /Could not confirm/);

  // Reload failures preserve the last list and block stale actions until recovery.
  uncertain.api.listFriends = async () => { throw new Error('Offline'); };
  await uncertain.controller.refresh();
  assert.equal(uncertain.controller.getSnapshot().loadError, 'Offline');
  await uncertain.controller.act('cancel', 'request');
  assert.equal(uncertain.controller.getSnapshot().lists.outgoing.length, 1);
  uncertain.api.listFriends = async () => [];
  await uncertain.controller.refresh(); await uncertain.controller.act('cancel', 'request');
  assert.equal(uncertain.controller.getSnapshot().lists.outgoing.length, 0);

  const late = deferred();
  const unmounted = setup({ listFriends: () => late.promise }).controller;
  const pending = unmounted.refresh(); unmounted.deactivate();
  const before = unmounted.getSnapshot(); late.resolve([]); await pending;
  assert.equal(unmounted.getSnapshot(), before, 'No updates after leaving the screen');
  console.log('PASS: request lifecycle, stale searches, double taps, uncertain saves, refresh recovery, and screen cleanup.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
