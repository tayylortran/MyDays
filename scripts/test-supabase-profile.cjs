/* global __dirname */
// Installed Supabase client with mocked HTTP; database rules are tested in test-combined-save.sql.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const replies = [], requests = [], signed = [], deleted = [], preparedUris = [];
let cleanupCalls = 0;
let signedIn = true;
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    requests.push({ url: new URL(url), method: options.method, body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body });
    const reply = replies.shift();
    assert.ok(reply, 'Unexpected request');
    return new Response(options.method === 'HEAD' ? null : JSON.stringify(reply.body), {
      status: reply.status ?? 200, headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
  } },
});
supabase.auth.getSession = async () => ({ data: { session: signedIn ? { user: { id: 'owner' } } : null }, error: null });
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/profile.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === '@/src/lib/supabase') return { supabase };
  if (name === '@/src/lib/id') return { newId: () => '00000000-0000-4000-8000-000000000501' };
  if (name === './saveHangout') return { flushPhotoCleanup: async () => { cleanupCalls++; } };
  if (name === '@/src/lib/preparePhoto') return { preparePhoto: async (uri) => {
    preparedUris.push(uri);
    return { image: { uri: 'main-temp', bytes: 200 }, thumbnail: { uri: 'avatar-temp', bytes: 100 } };
  } };
  if (name === 'expo-file-system') return { File: class {
    constructor(uri) { this.uri = uri; }
    async arrayBuffer() { assert.equal(this.uri, 'avatar-temp'); return new Uint8Array([255,216,255]).buffer; }
    delete() { deleted.push(this.uri); }
  } };
  assert.equal(name, './photos');
  return { photosFromRows: async (rows) => { signed.push(rows); return rows.map((row) => ({ id: row.id, uri: 'signed' })); } };
}, loaded, loaded.exports);
const api = loaded.exports;
const save = (username, photoUri = null) => api.saveProfileSettings({ username, photoUri });
async function main() {
  replies.push({ body: null });
  assert.deepEqual(await api.getProfileSettings(), { username: '', photoUri: null });
  assert.equal(requests.at(-1).url.searchParams.get('user_id'), 'eq.owner');
  replies.push({ body: null });
  await save('  Sam_1.2  ');
  assert.equal(requests.at(-1).body.username, 'Sam_1.2');
  assert.equal(requests.at(-1).body.user_id, 'owner');
  assert.equal(requests.at(-1).url.searchParams.get('on_conflict'), 'user_id');
  replies.push({ status: 409, body: { code: '23505', message: 'duplicate' } });
  await assert.rejects(save('sam_1.2'), /already taken/);
  const beforeInvalid = requests.length;
  for (const value of ['', 'ab', 'a'.repeat(31), 'has spaces', 'emoji🙂']) await assert.rejects(save(value), /3 to 30/);
  await assert.rejects(api.facesForMonth('2026-13'), /YYYY-MM/);
  assert.equal(requests.length, beforeInvalid);
  replies.push({ body: null });
  assert.equal(await api.getDayFace('2026-09-15'), null);
  replies.push({ body: null });
  await api.setDayFace('2026-09-15', 'photo');
  assert.equal(requests.at(-1).url.searchParams.get('on_conflict'), 'user_id,date');
  assert.equal(requests.at(-1).body.photo_id, 'photo');
  replies.push({ body: null });
  await api.setDayFace('2026-09-15', null);
  assert.equal(requests.at(-1).method, 'DELETE');
  assert.equal(requests.at(-1).url.searchParams.get('user_id'), 'eq.owner');
  assert.equal(requests.at(-1).url.searchParams.get('date'), 'eq.2026-09-15');
  replies.push({ status: 403, body: { code: '42501', message: 'Permission denied' } });
  await assert.rejects(api.setDayFace('2026-09-15', null), /Permission denied/);
  replies.push({ body: [{ date: '2026-12-31', photos: { id: 'photo' } }] });
  assert.deepEqual(await api.facesForMonth('2026-12'), { '2026-12-31': { id: 'photo', uri: 'signed' } });
  assert.deepEqual(signed, [[{ id: 'photo' }]]);
  assert.deepEqual(requests.at(-1).url.searchParams.getAll('date'), ['gte.2026-12-01', 'lt.2027-01-01']);
  replies.push({ body: null, headers: { 'Content-Range': '*/17' } });
  assert.equal(await api.countProfilePhotos(), 17);
  assert.equal(requests.at(-1).method, 'HEAD');
  replies.push({ status: 400, body: { code: 'P0001', message: 'Wrong date' } });
  await assert.rejects(api.setDayFace('2026-09-16', 'photo'), /Wrong date/);
  const avatarPath = 'owner/avatars/00000000-0000-4000-8000-000000000501.jpg';
  replies.push({ body: { Key: avatarPath } }, { body: null });
  const uploadStart = requests.length;
  await save('Sam_1.2', 'file:///picked.jpg');
  assert.equal(requests.length, uploadStart + 2, 'One image upload and one profile write');
  assert.ok(requests[uploadStart].body instanceof ArrayBuffer);
  assert.equal(requests.at(-1).body.avatar_storage_path, avatarPath);
  assert.deepEqual(deleted.splice(0), ['main-temp', 'avatar-temp']);
  replies.push({ body: { username: 'Sam_1.2', avatar_storage_path: avatarPath } },
    { body: { signedURL: '/object/sign/photos/' + avatarPath + '?token=old' } });
  const settings = await api.getProfileSettings();
  assert.equal(settings.photoUri, 'https://test.invalid/storage/v1/object/sign/photos/' + avatarPath + '?token=old');
  const prepareCount = preparedUris.length;
  replies.push({ body: null });
  await save('Renamed', settings.photoUri);
  assert.equal(preparedUris.length, prepareCount, 'Username-only edit must reuse the existing file');
  assert.equal(requests.at(-1).body.avatar_storage_path, avatarPath);
  replies.push({ body: null });
  await save('Renamed', null);
  assert.equal(requests.at(-1).body.avatar_storage_path, null);
  const beforeInvalidAvatar = requests.length;
  await assert.rejects(save('Sam', 'https://elsewhere.invalid/avatar.jpg'), /photo library/);
  await assert.rejects(save('Sam', settings.photoUri.replace('/owner/', '/other/')), /photo library/);
  assert.equal(requests.length, beforeInvalidAvatar);
  const beforeConflictCleanup = cleanupCalls;
  replies.push({ body: { Key: avatarPath } }, { status: 409, body: { code: '23505', message: 'duplicate' } });
  await assert.rejects(save('Taken', 'file:///picked.jpg'), /already taken/);
  assert.equal(cleanupCalls, beforeConflictCleanup, 'A rejected save must not clean up files that may be in use');
  replies.push({ status: 400, body: { code: '', message: 'Connection lost' } });
  await assert.rejects(save('Sam', settings.photoUri), /Could not confirm/);
  const beforeFailedUpload = requests.length;
  replies.push({ status: 403, body: { message: 'Upload denied', statusCode: '403' } });
  await assert.rejects(save('Sam', 'file:///picked.jpg'), /Upload denied/);
  assert.equal(requests.length, beforeFailedUpload + 1, 'Upload failure must not save the profile');
  assert.deepEqual(deleted.splice(0), ['main-temp', 'avatar-temp', 'main-temp', 'avatar-temp']);
  signedIn = false;
  await assert.rejects(api.getProfileSettings(), /Sign in/);
  assert.equal(replies.length, 0);
  console.log('PASS: profile settings, single-file avatar uploads/reuse/removal, username conflicts, uncertain saves, and daily selections.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
