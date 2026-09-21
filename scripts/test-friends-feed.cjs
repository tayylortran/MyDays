/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const requests = [], replies = [];
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    const request = { url: new URL(url), body: JSON.parse(options.body) };
    requests.push(request);
    const reply = replies.shift(); assert.ok(reply, 'Unexpected request');
    const body = typeof reply.body === 'function' ? reply.body(request) : reply.body;
    return new Response(JSON.stringify(body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  } },
});
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/friendsFeed.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const shared = { exports: {} };
new Function('exports', ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/friendTypes.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText)(shared.exports);
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === '../friendTypes') return shared.exports;
  assert.equal(name, '@/src/lib/supabase'); return { supabase };
}, loaded, loaded.exports);
const api = loaded.exports;
const quiet = (id) => ({ user_id: `user-${id}`, username: `person${id}`, avatar_storage_path: `avatar-${id}`, cover: null });
const poster = (id, updated) => ({ ...quiet(id), cover: { id: `cover-${id}`, date: '2026-09-20', title: `Title ${id}`, storage_path: `main-${id}`, thumb_storage_path: `thumb-${id}`, updated_at: updated } });
const page = (friends, date = '2026-09-20', count = friends.length) => ({ date, friend_count: count, friends });
const sign = () => ({ body: (request) => request.body.paths.map((path) => ({ path, signedURL: `/object/sign/photos/${path}?token=test` })) });

async function main() {
  const rows = [...Array.from({ length: 12 }, (_, index) => quiet(index)), poster(12, 1), poster(13, 2)];
  replies.push({ body: page(rows) }, sign());
  const feed = await api.getFriendsToday('America/Los_Angeles');
  assert.deepEqual(requests[0].body, { p_timezone: 'America/Los_Angeles', p_limit: 50, p_offset: 0 });
  assert.equal(feed.friendCount, 14); assert.equal(feed.posts.length, 2); assert.equal(feed.quietFriends.length, 12);
  assert.equal(feed.posts[0].userId, 'user-13', 'Most recent selected cover appears first');
  assert.equal(feed.posts[0].title, 'Title 13'); assert.match(feed.posts[0].photo.uri, /thumb-13/);
  assert.equal(requests[1].body.expiresIn, 300);
  assert.equal(requests[1].body.paths.length, 13, 'Sign only 9 quiet avatars, 2 post avatars and 2 thumbnails');
  assert.ok(!requests[1].body.paths.includes('avatar-9'));
  assert.ok(!requests[1].body.paths.includes('main-12'));
  assert.equal(feed.quietFriends[0].userId, 'user-0');

  const noAvatar = Array.from({ length: 51 }, (_, index) => ({ ...quiet(index), avatar_storage_path: null }));
  replies.push({ body: page(noAvatar.slice(0, 50), '2026-09-20', 51) }, { body: page(noAvatar.slice(50), '2026-09-20', 51) });
  const paginated = await api.getFriendsToday('UTC');
  assert.equal(paginated.quietFriends.length, 51);
  assert.equal(requests.at(-1).body.p_offset, 50);
  assert.equal(paginated.posts.length, 0);
  replies.push({ body: page([]) });
  assert.equal((await api.getFriendsToday('UTC')).friendCount, 0);

  replies.push({ body: page(noAvatar.slice(0, 50), '2026-09-20', 51) }, { body: page(noAvatar.slice(50), '2026-09-21', 51) });
  await assert.rejects(api.getFriendsToday('UTC'), /new day/);
  replies.push({ status: 403, body: { code: '42501', message: 'Sign in to view friends.' } });
  await assert.rejects(api.getFriendsToday('UTC'), /Sign in/);
  replies.push({ body: page([poster(1, 1)]) }, { body: [{ path: 'thumb-1', error: 'Access denied' }] });
  await assert.rejects(api.getFriendsToday('UTC'), /shared photos changed/);
  replies.push({ body: null });
  await assert.rejects(api.getFriendsToday('UTC'), /Could not load today/);
  assert.equal(replies.length, 0);
  console.log('PASS: two feed groups, latest-cover ordering, quiet-avatar limit, signing, pagination, day rollover and failures.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
