// Run with Node 22.13+ / 24: node scripts/test-hangout-drafts.cjs
// Exercises production persistence code against real in-memory SQLite.
// Only Expo's native filesystem and image compression are substituted.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function fixture({ width = 1600, height = 1200, failThumbnail = false } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  const dbSource = fs.readFileSync(path.join(root, 'src/data/db.ts'), 'utf8');
  sqlite.exec(dbSource.match(/db\.execAsync\(`([\s\S]*?)`\)/)[1]);
  sqlite.exec("INSERT INTO circles VALUES ('circle', 'Friends', '#aa3333', 0, 1)");
  const files = new Set();
  const tempFiles = new Set();
  const renderedSizes = [];
  const lockedFiles = new Set();
  let counter = 0;
  let failSql = null;
  const adapter = {
    async runAsync(sql, params = []) {
      if (failSql?.(sql, params)) throw new Error('Injected database failure');
      return sqlite.prepare(sql).run(...params);
    },
    async getFirstAsync(sql, params = []) { return sqlite.prepare(sql).get(...params) ?? null; },
    async getAllAsync(sql, params = []) { return sqlite.prepare(sql).all(...params); },
    async withExclusiveTransactionAsync(fn) {
      sqlite.exec('BEGIN');
      try { await fn(adapter); sqlite.exec('COMMIT'); }
      catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
    async withTransactionAsync(fn) { return adapter.withExclusiveTransactionAsync(fn); },
  };
  class Directory {
    constructor(base, name) { this.uri = `${base}/${name}`; }
    get exists() { return true; }
    create() {}
  }
  class File {
    constructor(base, name) { this.uri = name ? `${base.uri}/${name}` : base; }
    get exists() { return files.has(this.uri) || tempFiles.has(this.uri); }
    get size() { return 10000; }
    copy(destination) { files.add(destination.uri); }
    delete() {
      if (lockedFiles.has(this.uri)) throw new Error('File busy');
      files.delete(this.uri);
      tempFiles.delete(this.uri);
    }
  }
  function load(relative, mocks) {
    const source = fs.readFileSync(path.join(root, relative), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', '__DEV__', compiled)((name) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    }, module, module.exports, false);
    return module.exports;
  }
  const types = load('src/data/types.ts', {});
  const photoQueries = load('src/data/photos.ts', { './db': { getDb: async () => adapter }, './types': types });
  const profileQueries = load('src/data/profile.ts', {
    './db': { getDb: async () => adapter }, './photos': photoQueries, './types': types,
  });
  const fileSystem = { Directory, File, Paths: { document: 'file:///test' } };
  const preparation = load('src/lib/preparePhoto.ts', {
    'expo-file-system': fileSystem,
    'expo-image-manipulator': {
      SaveFormat: { JPEG: 'jpeg' },
      ImageManipulator: { manipulate(uri) {
        if (uri === 'fail') throw new Error('Injected image failure');
        let w = width, h = height, saves = 0;
        return {
          release() {},
          reset() { w = width; h = height; },
          resize(size) {
            const scale = size.width ? size.width / w : size.height / h;
            w = Math.round(w * scale); h = Math.round(h * scale);
          },
          async renderAsync() {
            const renderedWidth = w, renderedHeight = h;
            return { width: w, height: h, release() {}, async saveAsync(options) {
              if (++saves === 2 && failThumbnail) throw new Error('Injected thumbnail failure');
              renderedSizes.push({ width: renderedWidth, height: renderedHeight, ...options });
              const uri = `file:///cache/${++counter}.jpg`;
              tempFiles.add(uri);
              return { uri };
            } };
          },
        };
      } },
    },
  });
  const api = load('src/data/hangouts.ts', {
    './photos': photoQueries,
    'expo-file-system': fileSystem,
    '../lib/preparePhoto': preparation,
    'react-native': { Platform: { OS: 'ios' } },
    '../lib/id': { newId: () => `file-${++counter}` },
    './db': { getDb: async () => adapter },
    './types': types,
  });
  const hangout = { id: 'hangout', date: '2026-09-19', title: ' Game day ', note: ' Diary ', circleId: 'circle', updatedAt: 1 };
  const photo = (id) => ({ kind: 'new', id, uri: `picked-${id}` });
  const count = (table) => sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  return { api, photoQueries, profileQueries, hangout, photo, sqlite, files, tempFiles, renderedSizes, lockedFiles, count, fail: (fn) => { failSql = fn; } };
}

async function main() {
  {
    const f = fixture();
    const saved = await f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [f.photo('a'), f.photo('b')] });
    assert.equal(saved.hangout.title, 'Game day');
    assert.equal(f.count('hangouts'), 1);
    assert.equal(f.files.size, 4);
    assert.equal(f.tempFiles.size, 0, 'Prepared cache files are removed after copying');
    assert.deepEqual(f.renderedSizes.slice(0, 2), [
      { width: 1200, height: 900, compress: 0.7, format: 'jpeg' },
      { width: 720, height: 540, compress: 0.8, format: 'jpeg' },
    ]);
    assert.ok(saved.photos.every((p) => p.thumbUri && p.thumbUri !== p.uri));
    assert.deepEqual(saved.photos.map((p) => p.id), ['a', 'b']);
    const expectedPhotos = saved.photos.map((photo) => ({ ...photo, thumbUri: photo.thumbUri }));
    assert.deepEqual(await f.photoQueries.listPhotos('hangout'), expectedPhotos);
    const library = await f.photoQueries.listLibraryPhotos({ limit: 1, circleId: 'circle' });
    assert.equal(library.items[0].date, f.hangout.date);
    assert.equal(library.items[0].hangoutId, 'hangout');
    assert.equal(library.items[0].uri, saved.photos[1].uri);
    const nextPage = await f.photoQueries.listLibraryPhotos({ limit: 1, circleId: 'circle', cursor: library.nextCursor });
    assert.equal(nextPage.items[0].id, 'a');
    assert.equal(nextPage.nextCursor, null);
    assert.deepEqual(await f.profileQueries.listPhotosForDate(f.hangout.date), expectedPhotos);
    const originalB = saved.photos[1].uri;
    const originalThumbB = saved.photos[1].thumbUri;
    f.sqlite.exec("INSERT INTO day_faces VALUES ('2026-09-19', 'a', 1)");
    assert.deepEqual((await f.profileQueries.facesForMonth('2026-09'))[f.hangout.date], expectedPhotos[0]);
    const edited = await f.api.saveHangoutWithPhotos({ mode: 'edit', hangout: { ...f.hangout, title: 'Edited' }, photos: [{ kind: 'existing', id: 'b' }, f.photo('c')] });
    assert.deepEqual(edited.photos.map((p) => p.id), ['b', 'c']);
    assert.equal(edited.photos[0].uri, originalB, 'Retained image is reused, not copied');
    assert.equal(edited.photos[0].thumbUri, originalThumbB, 'Retained thumbnail is reused');
    assert.equal(f.count('day_faces'), 0);
    assert.equal(f.files.size, 4);
    assert.ok(!f.files.has(saved.photos[0].uri));
    assert.ok(!f.files.has(saved.photos[0].thumbUri));
    await f.api.deleteHangout('hangout');
    assert.equal(f.count('hangouts'), 0);
    assert.equal(f.count('photos'), 0);
    assert.equal(f.files.size, 0);
    f.sqlite.close();
  }
  {
    const f = fixture();
    const input = { mode: 'create', hangout: f.hangout, photos: [f.photo('a'), f.photo('b')] };
    f.fail((sql, params) => sql.startsWith('INSERT INTO photos') && params[0] === 'b');
    await assert.rejects(f.api.saveHangoutWithPhotos(input), /Injected/);
    assert.equal(f.count('hangouts'), 0, 'Failed create rolls back the hangout');
    assert.equal(f.count('photos'), 0);
    assert.equal(f.files.size, 0, 'Failed save removes prepared images');
    assert.equal(f.tempFiles.size, 0);
    f.fail(null);
    await f.api.saveHangoutWithPhotos(input);
    assert.equal(f.count('hangouts'), 1, 'Retry creates one hangout');
    assert.equal(f.count('photos'), 2, 'Retry does not duplicate photos');
    f.sqlite.exec("INSERT INTO day_faces VALUES ('2026-09-19', 'a', 1)");
    const before = [...f.files].sort();
    f.fail((sql) => sql.startsWith('INSERT INTO photos'));
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'edit', hangout: { ...f.hangout, title: 'Should roll back' }, photos: [f.photo('c')] }));
    assert.equal(f.sqlite.prepare('SELECT title FROM hangouts').get().title, 'Game day');
    assert.equal(f.count('day_faces'), 1, 'Failed edit preserves profile selection');
    assert.equal(f.count('photos'), 2);
    assert.deepEqual([...f.files].sort(), before, 'Failed edit preserves original files');
    f.sqlite.close();
  }
  {
    const f = fixture({ failThumbnail: true });
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [f.photo('a')] }), /thumbnail failure/);
    assert.equal(f.files.size, 0);
    assert.equal(f.tempFiles.size, 0, 'Thumbnail failure cleans up its prepared main image');
    assert.equal(f.count('photos'), 0);
    f.sqlite.close();
  }
  for (const [width, height] of [[200, 100], [1200, 1600]]) {
    const f = fixture({ width, height });
    await f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [f.photo('a')] });
    for (const [index, size] of f.renderedSizes.entries()) {
      assert.ok(Math.max(size.width, size.height) <= (index === 0 ? 1200 : 720));
      assert.ok(size.width <= width && size.height <= height, 'Small images are never upscaled');
    }
    f.sqlite.exec('UPDATE photos SET thumb_uri = NULL');
    f.sqlite.exec("INSERT INTO day_faces VALUES ('2026-09-19', 'a', 1)");
    assert.equal((await f.profileQueries.facesForMonth('2026-09'))[f.hangout.date].thumbUri, undefined, 'Legacy photos remain readable');
    f.sqlite.close();
  }
  {
    const f = fixture();
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [f.photo('a'), { kind: 'new', id: 'b', uri: 'fail' }] }), /image failure/);
    assert.equal(f.files.size, 0);
    assert.equal(f.count('hangouts'), 0);
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: Array.from({ length: 6 }, (_, i) => f.photo(String(i))) }), /up to 5/);
    const saved = await f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [f.photo('a')] });
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'edit', hangout: { ...f.hangout, date: '2026-09-20' }, photos: [] }), /date cannot/);
    await assert.rejects(f.api.saveHangoutWithPhotos({ mode: 'edit', hangout: f.hangout, photos: [{ kind: 'existing', id: 'foreign' }] }), /no longer belongs/);
    f.lockedFiles.add(saved.photos[0].uri);
    await f.api.deleteHangout('hangout');
    assert.equal(f.count('pending_photo_deletions'), 1, 'Failed file deletion is durably queued');
    f.lockedFiles.clear();
    await f.api.flushPhotoCleanup();
    assert.equal(f.files.size, 0);
    assert.equal(f.count('pending_photo_deletions'), 0);
    const empty = await f.api.saveHangoutWithPhotos({ mode: 'create', hangout: f.hangout, photos: [] });
    assert.equal(empty.photos.length, 0, 'Photos remain optional');
    f.sqlite.close();
  }
  console.log('Hangout persistence checks passed: create/edit/delete, rollback, retries, order, cleanup, limits, fixed dates.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
