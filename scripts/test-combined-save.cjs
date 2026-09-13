/* global __dirname */
// Client orchestration fault tests; SQL behavior is covered by test-combined-save.sql.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const uploads = [], removed = [];
let sequence = 0, failUpload = false, loseResponse = false, failCleanup = false, rpcCalls = 0;
let queued = [], sqlError = false;
const supabase = {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) },
  rpc: async (name, args) => {
    assert.equal(name, 'save_hangout_with_photos');
    rpcCalls++;
    assert.ok(uploads.length, 'Uploads must precede the database call');
    assert.deepEqual(args.p_input.photos, [{ kind: 'new', id: 'photo' }]);
    if (loseResponse) return { error: { message: 'Fetch failed', code: '' } };
    if (sqlError) return { error: { message: 'This hangout changed.', code: 'P0001' } };
    return { data: { hangout: { ...args.p_input.hangout, updatedAt: 999 }, photos: args.p_input.photos.map((p, sort) => ({
      id: p.id, hangout_id: args.p_input.hangout.id, sort, updated_at: 999,
    })) }, error: null };
  },
  from: (table) => {
    assert.equal(table, 'photo_file_cleanup');
    return {
      select: () => ({ limit: async () => ({ data: queued.map((p) => ({ path: p })), error: null }) }),
      delete: () => ({ in: async (_, paths) => { queued = queued.filter((p) => !paths.includes(p)); return { error: null }; } }),
    };
  },
  storage: { from: () => ({ remove: async (paths) => {
    if (failCleanup) return { error: new Error('Cleanup offline') };
    removed.push(...paths);
    return { error: null };
  } }) },
};
const mocks = {
  '@/src/lib/id': { newId: () => 'operation-' + ++sequence },
  '@/src/lib/supabase': { supabase },
  '../types': { MAX_HANGOUT_PHOTOS: 5 },
  './photos': {
    listPhotos: async () => [],
    photoFromRow: async (row) => ({ id: row.id, hangoutId: row.hangout_id, uri: 'signed-' + row.id, cacheKey: row.storage_path, sort: row.sort, updatedAt: row.updated_at }),
    uploadPhotoFiles: async (_, paths) => { uploads.push(paths); if (failUpload) throw new Error('Upload failed'); },
  },
};
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/saveHangout.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => { assert.ok(mocks[name]); return mocks[name]; }, loaded, loaded.exports);
const api = loaded.exports;
const input = { mode: 'create', hangout: { id: 'hangout', circleId: 'circle', date: '2026-09-12', title: 'Dinner', note: '', updatedAt: 1 },
  photos: [{ kind: 'new', id: 'photo', uri: 'picked' }] };
async function main() {
  const saved = await api.saveHangoutWithPhotos(input);
  assert.equal(saved.hangout.updatedAt, 999);
  assert.equal(saved.photos[0].uri, 'signed-photo');
  assert.equal(rpcCalls, 1);
  loseResponse = true;
  await assert.rejects(api.saveHangoutWithPhotos(input), /Could not confirm.*reload/);
  assert.equal(rpcCalls, 2, 'An uncertain request must not be retried automatically');
  assert.equal(removed.length, 0, 'Uncertain saves must preserve uploaded files');
  loseResponse = false;
  sqlError = true;
  await assert.rejects(api.saveHangoutWithPhotos(input), /This hangout changed/);
  sqlError = false;
  failUpload = true;
  const beforeUploadFailure = rpcCalls;
  await assert.rejects(api.saveHangoutWithPhotos(input), /Upload failed/);
  assert.equal(rpcCalls, beforeUploadFailure, 'An incomplete upload must not save any database changes');
  failUpload = false;
  queued.push('old-unreferenced-file');
  failCleanup = true;
  assert.ok(await api.saveHangoutWithPhotos(input), 'Cleanup failure must not mask a committed save');
  assert.equal(queued.length, 1);
  failCleanup = false;
  await api.flushPhotoCleanup();
  assert.equal(queued.length, 0);
  assert.deepEqual(removed, ['old-unreferenced-file']);
  const before = sequence;
  await assert.rejects(api.saveHangoutWithPhotos({ ...input, photos: [input.photos[0], input.photos[0]] }), /Duplicate/);
  assert.equal(sequence, before);
  console.log('PASS: single atomic call, uncertain response without deletion/retry, upload failure, database errors, cleanup retry, validation.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
