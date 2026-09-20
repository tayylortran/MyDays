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
    requests.push({ url: new URL(url), body: JSON.parse(options.body) });
    const reply = replies.shift(); assert.ok(reply, 'Unexpected request');
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  } },
});
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/friendProfiles.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', compiled)((name) => { assert.equal(name, '@/src/lib/supabase'); return { supabase }; }, loaded, loaded.exports);
const api = loaded.exports;
const userId = '00000000-0000-4000-8000-000000000001';
const row = { user_id: userId, username: 'Alice', avatar_storage_path: 'avatar', total_photos: 12,
  covers: [{ id: 'cover', date: '2026-09-20', storage_path: 'main', thumb_storage_path: 'thumb' }] };
async function main() {
  replies.push({ body: row }, { body: ['avatar','main','thumb'].map((path) => ({ path, signedURL: `/object/sign/photos/${path}?token=test` })) });
  const profile = await api.getFriendProfile(userId, '2026-09');
  assert.equal(profile.username, 'Alice'); assert.equal(profile.totalPhotos, 12);
  assert.equal(profile.covers[0].date, '2026-09-20');
  assert.deepEqual(Object.keys(profile.covers[0]).sort(), ['date','id','thumbUri','uri']);
  assert.deepEqual(requests[0].body, { p_user_id: userId, p_month: '2026-09' });
  assert.deepEqual(requests[1].body, { expiresIn: 300, paths: ['avatar','main','thumb'] });
  assert.match(profile.avatarUri, /\/avatar\?token=test$/);
  replies.push({ body: { ...row, avatar_storage_path: null, covers: [] } });
  const empty = await api.getFriendProfile(userId, '2026-10');
  assert.deepEqual(empty.covers, []); assert.equal(empty.avatarUri, null);
  const before = requests.length;
  await assert.rejects(api.getFriendProfile('invalid', '2026-09'), /unavailable/);
  await assert.rejects(api.getFriendProfile(userId, '2026-13'), /YYYY-MM/);
  assert.equal(requests.length, before);
  replies.push({ status: 403, body: { code: '42501', message: 'Only accepted friends' } });
  await assert.rejects(api.getFriendProfile(userId, '2026-09'), /accepted friends/);
  assert.equal(requests.length, before + 1, 'Denied profiles never request file URLs');
  replies.push({ body: row }, { body: [{ path: 'main', error: 'Access denied' }] });
  await assert.rejects(api.getFriendProfile(userId, '2026-09'), /Could not load shared photos/);
  replies.push({ body: null });
  await assert.rejects(api.getFriendProfile(userId, '2026-09'), /Could not load this profile/);
  assert.equal(replies.length, 0);
  console.log('PASS: shared profile mapping, empty months, short-lived signed URLs, validation, and access denial.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
