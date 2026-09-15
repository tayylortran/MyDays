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
    return new Response(options.method === 'HEAD' ? null : JSON.stringify(reply.body), {
      status: reply.status ?? 200, headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
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

  const dated = (id, date) => ({ ...row, id, storage_path: 'owner/' + id + '.jpg', thumb_storage_path: null, hangouts: { date } });
  const sign = (rows) => replies.push({ body: rows.map((p) => ({ path: p.storage_path, signedURL: '/object/sign/photos/' + p.storage_path + '?token=grid', error: null })) });
  const a = dated('c', '2026-09-15'), b = dated('b', '2026-09-15'), c = dated('a', '2026-09-15');
  replies.push({ body: [a, b, c] });
  sign([a, b]);
  const firstPageStart = requests.length;
  const page = await api.listLibraryPhotos({ limit: 2, circleId: 'circle' });
  assert.deepEqual(page.items.map((p) => p.id), ['c', 'b']);
  assert.equal(page.items[0].date, a.hangouts.date);
  assert.deepEqual(JSON.parse(page.nextCursor), { date: a.hangouts.date, id: 'b', circleId: 'circle' });
  const firstQuery = requests[firstPageStart].url.searchParams;
  assert.equal(firstQuery.get('order'), 'hangouts(date).desc,id.desc');
  assert.equal(firstQuery.get('hangouts.circle_id'), 'eq.circle');
  assert.ok(firstQuery.get('select').includes('hangouts!inner'));
  assert.equal(requests.length, firstPageStart + 2, 'One metadata and one batched signing request');
  assert.equal(JSON.parse(requests.at(-1).body).paths.length, 2, 'Do not sign the lookahead photo');

  const older = dated('z', '2026-09-14');
  replies.push({ body: [c] }, { body: [older] });
  sign([c, older]);
  const continuationStart = requests.length;
  const next = await api.listLibraryPhotos({ limit: 2, circleId: 'circle', cursor: page.nextCursor });
  assert.deepEqual(next.items.map((p) => p.id), ['a', 'z']);
  assert.equal(next.nextCursor, null);
  assert.equal(requests[continuationStart].url.searchParams.get('hangouts.date'), 'eq.2026-09-15');
  assert.equal(requests[continuationStart].url.searchParams.get('id'), 'lt.b');
  assert.equal(requests[continuationStart + 1].url.searchParams.get('hangouts.date'), 'lt.2026-09-15');
  assert.equal(requests[continuationStart + 1].url.searchParams.get('limit'), '2');

  // A single day must not be truncated by the server's maximum rows per response.
  replies.push({ body: [a], headers: { 'Content-Range': '0-0/2' } }, { body: [{ ...b, hangout_id: 'another' }], headers: { 'Content-Range': '1-1/2' } });
  sign([a, b]);
  const dayStart = requests.length;
  assert.equal((await api.listPhotosForDate('2026-09-15')).length, 2);
  assert.equal(requests[dayStart].url.searchParams.get('hangouts.date'), 'eq.2026-09-15');
  assert.equal(requests[dayStart].url.searchParams.get('order'), 'sort.asc,id.asc');
  assert.equal(requests[dayStart + 1].url.searchParams.get('offset'), '1');

  for (const circleId of [undefined, 'circle']) {
    replies.push({ body: null, headers: { 'Content-Range': '*/42' } });
    assert.equal(await api.countLibraryPhotos(circleId), 42);
    assert.equal(requests.at(-1).method, 'HEAD');
    assert.equal(requests.at(-1).url.searchParams.get('hangouts.circle_id'), circleId ? 'eq.circle' : null);
  }
  replies.push({ body: [], headers: { 'Content-Range': '*/0' } });
  assert.deepEqual(await api.listPhotosForDate('2026-09-16'), []);
  replies.push({ body: [] });
  assert.deepEqual(await api.listLibraryPhotos({ limit: 30 }), { items: [], nextCursor: null });
  const beforeInvalid = requests.length;
  for (const options of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { limit: 2, cursor: 'bad' }, { limit: 2, cursor: page.nextCursor }]) {
    await assert.rejects(api.listLibraryPhotos(options));
  }
  assert.equal(requests.length, beforeInvalid);
  replies.push({ status: 403, body: { message: 'Denied', code: '42501' } });
  await assert.rejects(api.countLibraryPhotos());
  assert.equal(replies.length, 0);
  console.log('PASS: uploads, batched URLs, cache keys, date reads, library pagination/filtering, counts, validation, and errors.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
