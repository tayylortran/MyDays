/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the hook with deterministic state and native picker substitutes.
const slots = [];
let cursor = 0, nextId = 0, granted = true, canceled = false, cameraFailure = false;
let cameraCalls = 0, cameraPermissions = 0, libraryPermissions = 0, saved;
let resolveCamera;
const native = { Platform: { OS: 'ios' }, Keyboard: { dismiss() {} }, Alert: { alert() {} } };
const picker = {
  requestCameraPermissionsAsync: async () => { cameraPermissions++; return { granted }; },
  requestMediaLibraryPermissionsAsync: async () => { libraryPermissions++; return { granted }; },
  launchCameraAsync: async (options) => {
    cameraCalls++;
    assert.deepEqual(options.mediaTypes, ['images']);
    if (cameraFailure) throw new Error('Camera unavailable');
    if (resolveCamera === 'pending') return new Promise((resolve) => { resolveCamera = resolve; });
    return canceled ? { canceled: true } : { canceled: false, assets: [{ uri: 'file:///camera.jpg' }] };
  },
  launchImageLibraryAsync: async (options) => {
    assert.equal(options.selectionLimit, 2);
    return { canceled: false, assets: [{ uri: 'file:///library.jpg' }] };
  },
};
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useRef(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useEffect() {},
};
const loaded = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/hangouts/useHangoutEditor.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', code)((name) => {
  if (name === 'react') return react;
  if (name === 'react-native') return native;
  if (name === 'expo-image-picker') return picker;
  if (name === '@/src/lib/id') return { newId: () => `id-${++nextId}` };
  if (name === '@/src/data/types') return { MAX_HANGOUT_PHOTOS: 3 };
  if (name === '@/src/data/RepositoryProvider') return { useRepo: () => ({
    saveHangoutWithPhotos: async (input) => { saved = input; return { hangout: input.hangout, photos: input.photos }; },
  }) };
  throw new Error(`Unexpected import ${name}`);
}, loaded, loaded.exports);
const render = () => { cursor = 0; return loaded.exports.useHangoutEditor([{ id: 'circle' }], () => {}, () => {}); };
async function main() {
  render().openCreate('2026-09-20');
  granted = false;
  await render().pickPhotos('camera');
  assert.match(render().error, /Camera access is off/);
  assert.equal(cameraCalls, 0);
  assert.equal(render().working, null);
  granted = true; canceled = true;
  await render().pickPhotos('camera');
  assert.equal(render().state.draft.photos.length, 0);
  assert.equal(render().error, '');
  canceled = false; cameraFailure = true;
  await render().pickPhotos('camera');
  assert.equal(render().error, 'Camera unavailable');
  assert.equal(render().working, null);
  cameraFailure = false; resolveCamera = 'pending';
  const pending = render().pickPhotos('camera');
  await new Promise((resolve) => setImmediate(resolve));
  const count = cameraCalls;
  await render().pickPhotos('camera');
  assert.equal(cameraCalls, count, 'Duplicate tap does not open a second camera');
  resolveCamera({ canceled: false, assets: [{ uri: 'file:///camera.jpg' }] });
  resolveCamera = undefined;
  await pending;
  assert.equal(render().state.draft.photos[0].kind, 'new');
  assert.equal(libraryPermissions, 0, 'Camera never asks for library permission');
  await render().pickPhotos();
  assert.equal(libraryPermissions, 1);
  native.Platform.OS = 'web';
  const permissions = cameraPermissions;
  await render().pickPhotos('camera');
  assert.equal(cameraPermissions, permissions, 'Web launches without awaiting native permissions');
  const fullCount = cameraCalls;
  await render().pickPhotos('camera');
  assert.equal(cameraCalls, fullCount, 'Full hangout cannot open camera');
  render().change('title', 'A day out');
  await render().save();
  assert.equal(saved.photos.length, 3);
  assert.equal(saved.photos[0].uri, 'file:///camera.jpg');
  assert.equal(saved.photos[1].uri, 'file:///library.jpg');
  console.log('PASS: camera permission, cancel, errors, duplicate taps, photo limit, library, and shared save flow');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
