/* global __dirname */
// Exercise preference restoration and switching without a native runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relative, dependencies, storage) {
  const filename = path.join(__dirname, '..', relative);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', 'localStorage', code)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports, storage);
  return loaded.exports;
}

const palette = load('src/theme/palette.ts', {});
function mount(saved = null, failWrites = false) {
  let cursor = 0;
  let stored = saved;
  let effects = [];
  const slots = [];
  const overrides = [];
  const jsx = (type, props) => ({ type, props });
  const storage = {
    getItem: () => stored,
    setItem: (key, value) => {
      if (failWrites) throw new Error('Storage unavailable');
      stored = value;
    },
  };
  const api = load('src/theme/ThemeProvider.tsx', {
    'expo-sqlite/localStorage/install': {},
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-system-ui': { setBackgroundColorAsync: () => Promise.resolve() },
    './palette': palette,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Platform: { OS: 'ios' }, Appearance: { setColorScheme: (mode) => overrides.push(mode) } },
    react: {
      createContext: () => ({ Provider: 'Provider' }),
      useState: (initial) => {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (value) => { slots[index] = value; }];
      },
      useEffect: (effect, deps) => {
        const index = cursor++;
        if (!slots[index] || deps.some((value, i) => value !== slots[index][i])) effects.push(effect);
        slots[index] = deps;
      },
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
    },
  }, storage);
  function render() {
    cursor = 0;
    const result = api.ThemeProvider({ children: 'app' });
    const pending = effects;
    effects = [];
    pending.forEach((effect) => effect());
    return result;
  }
  return { render, overrides, saved: () => stored };
}

const fresh = mount();
assert.equal(fresh.render().props.children.props.children[1], null, 'Wait for saved appearance before showing screens');
let tree = fresh.render();
assert.equal(tree.props.value.mode, 'light');
tree.props.value.setMode('dark');
tree = fresh.render();
assert.equal(tree.props.value.colors, palette.darkColors);
assert.equal(tree.props.children.props.children[0].props.style, 'light', 'Dark mode uses light status bar icons');
assert.equal(fresh.saved(), 'dark');
assert.equal(fresh.overrides.at(-1), 'dark');
const reopened = mount(fresh.saved());
reopened.render();
tree = reopened.render();
assert.equal(tree.props.value.mode, 'dark', 'Restore appearance on restart');
tree.props.value.setMode('light');
tree = reopened.render();
assert.equal(tree.props.value.colors, palette.lightColors);
assert.equal(reopened.saved(), 'light');
assert.equal(reopened.overrides.at(-1), 'light');
const invalid = mount('system');
invalid.render();
assert.equal(invalid.render().props.value.mode, 'light', 'Unknown preferences never enable system mode');
const unavailable = mount(null, true);
unavailable.render();
unavailable.render().props.value.setMode('dark');
tree = unavailable.render();
assert.equal(tree.props.value.mode, 'dark', 'Switch still works when saving fails');
assert.ok(tree.props.value.saveError);
console.log('Theme preference, restart, status bar, and storage failure checks passed.');
