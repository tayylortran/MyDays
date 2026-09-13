/* global __dirname */
// Real Supabase client, mocked HTTP/native files. Live policies are checked on-device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const requests = [], replies = [], deleted = [];
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    requests.push({ url: new URL(url), ...options });
    const reply = replies.shift();
    assert.ok(reply, 'Unexpected request');
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json' } });
  } },
});
let bytes = 100;
const mocks = {
  '@/src/lib/supabase': { supabase },
  '@/src/lib/preparePhoto': { preparePhoto: async () => ({ image: { uri: 'main', bytes }, thumbnail: { uri: 'thumb', bytes: 50 } }) },
  'expo-file-system': { File: class {
    constructor(uri) { this.uri = uri; }
    async arrayBuffer() { return new Uint8Array([255, 216, 255]).buffer; }
    delete() { deleted.push(this.uri); }
  } },
};
const compiled = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/data/supabase/photos.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  assert.ok(mocks[name], `Unexpected import: ${name}`);
  return mocks[name];
}, loaded, loaded.exports);
const api = loaded.exports;
const paths = { storagePath: 'owner/unique/image.jpg', thumbStoragePath: 'owner/unique/thumb.jpg' };
const row = { id: 'photo', hangout_id: 'hangout', storage_path: paths.storagePath, thumb_storage_path: paths.thumbStoragePath, sort: 0, updated_at: 123 };
function readReplies(token, thumbnail = true) {
  replies.push({ body: [{ ...row, thumb_storage_path: thumbnail ? paths.thumbStoragePath : null }] });
  replies.push({ body: [paths.storagePath, ...(thumbnail ? [paths.thumbStoragePath] : [])].map((path) => ({
    path, signedURL: `/object/sign/photos/${path}?token=${token}`, error: null,
  })) });
}
async function main() {
  replies.push({ body: { Key: paths.storagePath } }, { body: { Key: paths.thumbStoragePath } });
  assert.deepEqual(await api.uploadPhotoFiles('picked', paths), { imageBytes: 100, thumbnailBytes: 50 });
  for (const request of requests) {
    assert.ok(request.body instanceof ArrayBuffer, 'Upload must use binary bytes on React Native');
    assert.equal(new Headers(request.headers).get('content-type'), 'image/jpeg');
    assert.equal(new Headers(request.headers).get('x-upsert'), 'false');
    assert.ok(request.url.pathname.startsWith('/storage/v1/object/photos/'));
  }
  assert.deepEqual(deleted.splice(0), ['main', 'thumb']);
  replies.push({ body: { Key: paths.storagePath } }, { status: 403, body: { message: 'Denied', statusCode: '403' } });
  await assert.rejects(api.uploadPhotoFiles('picked', paths), /Denied/);
  assert.deepEqual(deleted.splice(0), ['main', 'thumb']);
  // Upload failure must never delete a database row or a remote file.
  assert.ok(requests.every((request) => request.method === 'POST'));
  bytes = 6 * 1024 * 1024;
  const before = requests.length;
  await assert.rejects(api.uploadPhotoFiles('picked', paths), /5 MB/);
  assert.equal(requests.length, before);
  assert.deepEqual(deleted.splice(0), ['main', 'thumb']);
  readReplies('one');
  const first = (await api.listPhotos('hangout'))[0];
  readReplies('two');
  const second = (await api.listPhotos('hangout'))[0];
  assert.notEqual(first.uri, second.uri);
  assert.equal(first.cacheKey, second.cacheKey);
  assert.equal(first.thumbCacheKey, second.thumbCacheKey);
  assert.notEqual(first.cacheKey, first.thumbCacheKey);
  assert.ok(!first.cacheKey.includes('token='));
  assert.equal(first.hangoutId, 'hangout');
  assert.equal(first.updatedAt, 123);
  readReplies('legacy', false);
  assert.equal(((await api.listPhotos('hangout'))[0]).thumbUri, undefined);
  replies.push({ body: [] });
  const readStart = requests.length;
  assert.deepEqual(await api.listPhotos('hidden'), []);
  assert.equal(requests.length, readStart + 1, 'Hidden records must not request signed URLs');
  replies.push({ body: [row] }, { body: [{ path: paths.storagePath, error: 'Not found', signedURL: null }] });
  await assert.rejects(api.listPhotos('hangout'), /Not found/);
  assert.equal(replies.length, 0);
  console.log('PASS: binary uploads, immutable files, failure cleanup ownership, signed URLs, stable cache keys, and hidden records.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
