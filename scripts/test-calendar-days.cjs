/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const jsx = (type, props) => ({ type, props });
const slots = [];
let cursor = 0;
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  },
  useMemo: (fn) => fn(),
  useRef(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
  useEffect() {},
};
const native = {
  View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', Modal: 'Modal',
  StyleSheet: { create: (styles) => styles },
  useWindowDimensions: () => ({ height: 844 }),
  Animated: {
    View: 'AnimatedView',
    Value: class {
      constructor(value) { this.value = value; }
      setValue(value) { this.value = value; }
      stopAnimation() {}
    },
    timing: (value, config) => ({ start: (done) => { value.setValue(config.toValue); done?.({ finished: true }); } }),
    spring: (value, config) => ({ start: () => value.setValue(config.toValue) }),
  },
  PanResponder: { create: (handlers) => ({ panHandlers: handlers }) },
};
const theme = { useTheme: () => ({ colors: {} }), useThemedStyles: (fn) => fn({}) };
function load(file, mocks = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  const dependencies = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native,
    '@/src/theme/ThemeProvider': theme, '@/src/theme/primitives': { Text: 'Text' },
    ...mocks,
  };
  new Function('require', 'module', 'exports', compiled)((name) => {
    assert.ok(name in dependencies, `Unexpected import: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}
function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}

const hangout = { id: 'h1', date: '2026-10-19', title: 'Lunch', circleId: 'c1' };
const created = [];
const opened = [];
const controller = { state: { mode: 'closed' }, openDetail: (h) => opened.push(h), close() {} };
const calendar = {
  hangoutEditor: controller, byDate: { [hangout.date]: [hangout] }, circles: [],
  openAdd: (date) => created.push(date), year: 2026, month: 9,
};
let gestureEnabled;
const home = load('app/(tabs)/index.tsx', {
  '@/src/features/calendar/CalendarGrid': { CalendarGrid: 'CalendarGrid' },
  '@/src/features/calendar/MonthHeader': { MonthHeader: 'MonthHeader' },
  '@/src/features/hangouts/HangoutFlowModal': { HangoutFlowModal: 'HangoutFlowModal' },
  '@/src/features/hangouts/EditCircleModal': { EditCircleModal: 'EditCircleModal' },
  '@/src/features/hangouts/useCalendarScreen': { useCalendarScreen: () => calendar },
  'react-native-gesture-handler': { GestureDetector: 'GestureDetector' },
  '@/src/features/pictures/PicturesPanel': { useCalendarPicturesGesture: (enabled) => {
    gestureEnabled = enabled;
    return { gesture: 'opening', handleGesture: 'handle' };
  } },
}).default;
function renderHome() { cursor = 0; return home(); }
let tree = renderHome();
nodes(tree, 'CalendarGrid')[0].props.onPressDay('2026-10-20');
assert.deepEqual(created, ['2026-10-20'], 'Empty day opens the existing add flow directly');
nodes(tree, 'CalendarGrid')[0].props.onPressDay(hangout.date);
tree = renderHome();
assert.equal(gestureEnabled, false, 'Pictures gesture is disabled while the day list is open');
let day = nodes(tree, 'HangoutFlowModal')[0].props.day;
assert.equal(day.date, hangout.date);
assert.deepEqual(day.hangouts, [hangout]);
day.onAdd();
assert.deepEqual(created, ['2026-10-20', hangout.date], 'Add uses the selected date');
calendar.byDate[hangout.date] = [];
tree = renderHome();
day = nodes(tree, 'HangoutFlowModal')[0].props.day;
assert.deepEqual(day.hangouts, [], 'The day list updates after deleting its last hangout');
day.onClose();
tree = renderHome();
assert.equal(nodes(tree, 'HangoutFlowModal')[0].props.day, undefined);
assert.equal(gestureEnabled, true);
nodes(tree, 'View').find((node) => node.props.onLayout)?.props.onLayout({ nativeEvent: { layout: { height: 250 } } });
tree = renderHome();
assert.equal(gestureEnabled, false, 'Short calendars reserve vertical swipes for scrolling');
assert.equal(nodes(tree, 'CalendarGrid')[0].props.openingGesture, undefined);

const { HangoutFlowModal } = load('src/features/hangouts/HangoutFlowModal.tsx', {
  '@/src/components/PhotoImage': { PhotoImage: 'PhotoImage' }, '@expo/vector-icons': {},
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
  './HangoutDetailView': { HangoutDetailView: 'HangoutDetailView' },
  './HangoutEditorForm': { HangoutEditorForm: 'HangoutEditorForm' },
  '@/src/features/calendar/CalendarDayView': { CalendarDayView: 'CalendarDayView' },
});
slots.length = 0;
let closed = false;
const dayProps = { date: hangout.date, hangouts: [hangout], onClose: () => { closed = true; }, onAdd() {} };
function renderFlow() { cursor = 0; return HangoutFlowModal({ controller, circles: [], day: dayProps }); }
tree = renderFlow();
assert.equal(tree.props.visible, true);
nodes(tree, 'CalendarDayView')[0].props.onPressHangout(hangout);
assert.deepEqual(opened, [hangout]);
controller.state = { mode: 'view' };
tree = renderFlow();
assert.equal(nodes(tree, 'CalendarDayView').length, 0, 'Details replace the list inside the same modal');
assert.equal(nodes(tree, 'HangoutDetailView')[0].props.backLabel, 'Back to day hangouts');
controller.state = { mode: 'closed' };
tree = renderFlow();
assert.equal(nodes(tree, 'CalendarDayView').length, 1, 'Closing details returns to the list');
tree.props.onRequestClose();
assert.equal(closed, true, 'Back from the list closes the selected day');

const dates = load('src/lib/dates.ts');
const { CalendarGrid } = load('src/features/calendar/CalendarGrid.tsx', {
  '@/src/lib/dates': dates,
  '@/src/features/hangouts/hangoutStyles': { hangoutDate: (date) => date, circleTint: () => '#eee' },
  'react-native-gesture-handler': { Gesture: { Native: () => ({}) }, GestureDetector: 'GestureDetector' },
});
for (const [width, height] of [[304, 200], [359, 500], [414, 600]]) {
  slots.length = 0;
  const props = { year: 2026, month: 9, byDate: { [hangout.date]: [hangout] }, circleById: {}, onPressDay() {} };
  cursor = 0;
  tree = CalendarGrid(props);
  tree.props.onLayout({ nativeEvent: { layout: { width, height } } });
  cursor = 0;
  tree = CalendarGrid(props);
  const horizontal = nodes(tree, 'ScrollView')[0];
  const gridWidth = horizontal.props.contentContainerStyle.width;
  const buttons = nodes(tree, 'Pressable');
  assert.equal(buttons.length, 31, 'One target per day; event previews have no nested buttons');
  assert.ok(gridWidth / 7 - 4 >= 44, 'Day width meets the iOS target even on narrow screens');
  const cells = nodes(tree, 'View').filter((node) => node.props.style?.height && node.props.style?.padding === 2);
  assert.ok(cells.every((cell) => cell.props.style.height - 4 >= 44), 'Day height meets the iOS target');
  assert.equal(horizontal.props.scrollEnabled, width < 336);
}
const { CalendarDayView } = load('src/features/calendar/CalendarDayView.tsx', {
  '@/src/features/hangouts/hangoutStyles': { hangoutDate: (date) => date, circleTint: () => '#eee' },
  '@expo/vector-icons': { Ionicons: 'Icon' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) },
});
slots.length = 0;
function renderDay() {
  cursor = 0;
  return CalendarDayView({ ...dayProps, circles: [{ id: 'c1', name: 'Friends' }], onPressHangout: controller.openDetail });
}
tree = renderDay();
for (const button of nodes(tree, 'Pressable').filter((button) => button.props.accessibilityLabel !== 'Dismiss day hangouts')) {
  const styles = button.props.style({ pressed: false }).filter(Boolean);
  const style = Object.assign({}, ...styles);
  assert.ok(style.minWidth >= 44 && style.minHeight >= 44, 'Every new day-screen control meets the iOS target');
}
const row = nodes(tree, 'Pressable').find((button) => button.props.accessibilityHint === 'Opens hangout details');
row.props.onPress();
assert.equal(opened.at(-1), hangout);
assert.equal(nodes(tree, 'ScrollView').length, 1, 'Day content can scroll for busy days and larger text');
assert.equal(nodes(tree, 'Text').find((node) => node.props.children === hangout.title).props.numberOfLines, undefined,
  'Hangout titles can wrap without truncation');
const heightOf = (value) => nodes(value, 'AnimatedView')[0].props.style[1].height;
const minimumHeight = heightOf(tree);
assert.ok(minimumHeight >= 360, 'One hangout still gets a substantial starting sheet height');
nodes(tree, 'ScrollView')[0].props.onContentSizeChange(350, 400);
tree = renderDay();
assert.ok(heightOf(tree) > minimumHeight, 'The sheet grows with measured list content');
nodes(tree, 'ScrollView')[0].props.onContentSizeChange(350, 2000);
tree = renderDay();
assert.equal(heightOf(tree), 844 - 59 - 24, 'Busy days cap below the safe area, keeping a dismissible backdrop');
const sheet = nodes(tree, 'AnimatedView')[0];
const gesture = (dy, dx = 0, vy = 0) => ({ dy, dx, vy });
assert.equal(sheet.props.onMoveShouldSetPanResponderCapture(null, gesture(30)), true);
assert.equal(sheet.props.onMoveShouldSetPanResponderCapture(null, gesture(-30)), false, 'Upward scrolling does not dismiss');
assert.equal(sheet.props.onMoveShouldSetPanResponderCapture(null, gesture(12, 30)), false, 'Horizontal movement does not dismiss');
const offset = sheet.props.style[1].transform[0].translateY;
sheet.props.onPanResponderMove(null, gesture(30));
assert.equal(offset.value, 30);
sheet.props.onPanResponderRelease(null, gesture(30));
assert.equal(offset.value, 0, 'A small drag springs back');
nodes(tree, 'ScrollView')[0].props.onScroll({ nativeEvent: { contentOffset: { y: 100 } } });
assert.equal(sheet.props.onMoveShouldSetPanResponderCapture(null, gesture(30)), false, 'A scrolled list keeps control of scrolling');
const header = nodes(tree, 'View').find((node) => node.props.onMoveShouldSetPanResponderCapture);
assert.equal(header.props.onMoveShouldSetPanResponderCapture(null, gesture(30)), true, 'The header can dismiss even when the list is scrolled');
closed = false;
header.props.onPanResponderRelease(null, gesture(120));
assert.equal(closed, true, 'A deliberate downward swipe closes the sheet');
for (const label of ['Close day hangouts', 'Dismiss day hangouts']) {
  slots.length = 0;
  closed = false;
  tree = renderDay();
  nodes(tree, 'Pressable').find((button) => button.props.accessibilityLabel === label).props.onPress();
  assert.equal(closed, true, `${label} closes the sheet`);
}
console.log('Calendar checks passed: navigation, targets, sheet sizing, backdrop/X dismissal, swipe thresholds, and scroll coordination.');
