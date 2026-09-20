/* global __dirname */
// Exercise the installed Supabase client without accessing a live project.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const requests = [], replies = [];
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    requests.push({ url: new URL(url), body: JSON.parse(options.body) });
    const reply = replies.shift();
    assert.ok(reply, 'Unexpected request');
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' },
    });
  } },
});
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/friends.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', compiled)((name) => {
  assert.equal(name, '@/src/lib/supabase');
  return { supabase };
}, loaded, loaded.exports);
const api = loaded.exports;

async function main() {
  replies.push({ body: [{ user_id: 'bob', username: 'Bob', friendship_id: null, relationship: 'none' }] });
  assert.deepEqual(await api.searchFriendUsername(' Bob '), { userId: 'bob', username: 'Bob', friendshipId: null, relationship: 'none' });
  assert.deepEqual(requests.at(-1).body, { p_username: 'Bob' });
  replies.push({ body: [] });
  assert.equal(await api.searchFriendUsername('Missing'), null);
  const count = requests.length;
  for (const value of ['', 'ab', 'wild%', 'has spaces']) await assert.rejects(api.searchFriendUsername(value), /Enter a username/);
  assert.equal(requests.length, count);

  const row = (id) => ({ friendship_id: `request-${id}`, user_id: `user-${id}`, username: `User${id}`, created_at: '2026-09-20T00:00:00Z', accepted_at: null });
  replies.push({ body: Array.from({ length: 50 }, (_, id) => row(id)) }, { body: [row(50)] });
  const friends = await api.listFriends();
  assert.equal(friends.length, 51, 'Load beyond a single page');
  assert.equal(requests.at(-1).body.p_offset, 50);
  assert.deepEqual(friends[50], { friendshipId: 'request-50', userId: 'user-50', username: 'User50', createdAt: '2026-09-20T00:00:00Z', acceptedAt: null });
  for (const [method, kind] of [['listIncomingFriendRequests', 'incoming'], ['listOutgoingFriendRequests', 'outgoing']]) {
    replies.push({ body: [] });
    assert.deepEqual(await api[method](), []);
    assert.equal(requests.at(-1).body.p_kind, kind);
  }
  replies.push({ body: 'request' });
  assert.equal(await api.sendFriendRequest('bob'), 'request');
  assert.deepEqual(requests.at(-1).body, { p_recipient_id: 'bob' });
  replies.push({ body: null });
  await api.acceptFriendRequest('request');
  assert.equal(requests.at(-1).url.pathname, '/rest/v1/rpc/accept_friend_request');
  for (const [method, action] of [['declineFriendRequest', 'decline'], ['cancelFriendRequest', 'cancel'], ['removeFriend', 'remove']]) {
    replies.push({ body: null });
    await api[method]('request');
    assert.deepEqual(requests.at(-1).body, { p_friendship_id: 'request', p_action: action });
  }
  replies.push({ status: 400, body: { code: 'P0001', message: 'This incoming request is unavailable.' } });
  await assert.rejects(api.acceptFriendRequest('request'), /incoming request is unavailable/);
  replies.push({ status: 503, body: { code: '', message: 'Connection lost' } });
  await assert.rejects(api.removeFriend('request'), /Could not confirm/);
  replies.push({ status: 403, body: { code: '42501', message: 'Permission denied' } });
  await assert.rejects(api.listFriends(), /Permission denied/);
  replies.push({ body: null });
  await assert.rejects(api.listFriends(), /Could not load friends/);
  replies.push({ body: null });
  await assert.rejects(api.searchFriendUsername('Bob'), /Could not load the search result/);
  assert.equal(replies.length, 0);
  console.log('PASS: friend search, pagination, request actions, server rejections, and uncertain writes.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
