/* global __dirname */
// Exercise the panel's real gesture callbacks without a native device.
// Native touch delivery and spring rendering still need device testing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const gestures = [];
const states = [];
const animations = [];
let context;
function shared(initial) {
  let value = initial;
  let generation = 0;
  return {
    get: () => value,
    set(next) {
      const current = ++generation;
      if (next && next.animation) {
        animations.push(() => {
          if (generation !== current) return;
          value = next.target;
          next.done?.(true);
        });
      } else value = next;
    },
  };
}
function pan() {
  const callbacks = {};
  const gesture = new Proxy({ callbacks }, {
    get(target, name) {
      if (name === 'callbacks') return callbacks;
      return (...args) => { callbacks[name] = args[0]; return gesture; };
    },
  });
  gestures.push(gesture);
  return gesture;
}
const jsx = (type, props) => ({ type, props });
const mocks = {
  '@/src/theme/ThemeProvider': {
    useTheme: () => ({ colors: {} }),
    useThemedStyles: (createStyles) => createStyles({}),
  },
  '@/src/theme/primitives': { Text: 'Text' },
  react: {
    createContext: () => ({ Provider: 'Provider' }),
    useContext: () => context,
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect: () => {},
    useState: (initial) => {
      const index = states.length;
      states.push(initial);
      return [initial, (next) => { states[index] = next; }];
    },
  },
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'react-native': {
    StyleSheet: { create: (value) => value, absoluteFill: {} },
    useWindowDimensions: () => ({ height: 800 }),
  },
  'react-native-gesture-handler': { Gesture: { Pan: pan }, State: { BEGAN: 2, ACTIVE: 4 } },
  'react-native-reanimated': {
    __esModule: true,
    default: { View: 'AnimatedView' },
    useSharedValue: shared,
    useAnimatedStyle: (fn) => fn(),
    withSpring: (target, config, done) => ({ animation: true, target, config, done }),
  },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
  'react-native-worklets': { scheduleOnRN: (fn, ...args) => fn(...args) },
  './PicturesScreen': { default: () => null },
};
const file = path.join(__dirname, '../src/features/pictures/PicturesPanel.tsx');
const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  assert.ok(name in mocks, `Unexpected dependency: ${name}`);
  return mocks[name];
}, loaded, loaded.exports);
const tree = loaded.exports.PicturesPanelProvider({ children: null });
context = tree.props.value;
const { gesture: opening, handleGesture: openingHandle } = loaded.exports.useCalendarPicturesGesture(true);
const closing = gestures[0];
const closingHandle = gestures[1];
const flush = () => { while (animations.length) animations.shift()(); };
const update = (gesture, translationY) => gesture.callbacks.onUpdate({ translationY });
const finish = (gesture, success, velocityY = 0) => gesture.callbacks.onFinalize({ oldState: 2, velocityY }, success);

opening.callbacks.onStart();
update(opening, -320);
assert.equal(context.progress.get(), 0.4);
assert.deepEqual(states, [true, false], 'Pictures must remain untouchable during opening');
closingHandle.callbacks.onStart();
update(closingHandle, 200);
finish(closingHandle, true, 1000);
assert.equal(context.progress.get(), 0.4, 'A competing gesture must not move the panel');
finish(opening, true);
update(opening, -120);
assert.equal(context.progress.get(), 0.4, 'Late updates must not interrupt the settling animation');
flush();
assert.equal(context.progress.get(), 1);
assert.deepEqual(states, [true, true]);

closing.callbacks.onStart();
update(closing, 320);
finish(closing, false);
flush();
assert.equal(context.progress.get(), 1, 'Cancelled dismissal must reopen even without oldState ACTIVE');

closingHandle.callbacks.onStart();
update(closingHandle, 320);
finish(closingHandle, true);
flush();
assert.equal(context.progress.get(), 0);
assert.deepEqual(states, [false, false]);

openingHandle.callbacks.onStart();
update(openingHandle, -240);
finish(openingHandle, false);
flush();
assert.equal(context.progress.get(), 0, 'Cancelled opening must close even without oldState ACTIVE');
assert.deepEqual(states, [false, false]);

opening.callbacks.onStart();
update(opening, -40);
finish(opening, true);
flush();
assert.equal(context.progress.get(), 0, 'A short swipe must snap closed');
assert.equal(context.locked.get(), false);

opening.callbacks.onStart();
update(opening, -35);
finish(opening, true, -1500);
assert.equal(context.locked.get(), true, 'Keep ownership while the snap animation is running');
openingHandle.callbacks.onStart();
update(openingHandle, -600);
finish(openingHandle, false);
flush();
assert.equal(context.progress.get(), 1, 'A second swipe must not interrupt a flick-open animation');
assert.deepEqual(states, [true, true]);
console.log('Pictures panel regression checks passed.');
