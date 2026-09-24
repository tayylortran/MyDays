/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/color.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { hexToHsv, hsvToHex, wheelPosition, colorText } = loaded.exports;
for (let r = 0; r <= 255; r += 17) {
  for (let g = 0; g <= 255; g += 17) {
    for (let b = 0; b <= 255; b += 17) {
      const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('').toUpperCase();
      assert.equal(hsvToHex(hexToHsv(hex)), hex, 'Opening a saved color must preserve it');
    }
  }
}
assert.equal(hsvToHex({ ...wheelPosition(240, 120, 240), v: 1 }), '#FF0000');
assert.equal(hsvToHex({ ...wheelPosition(120, 120, 240), v: 1 }), '#FFFFFF');
assert.equal(hsvToHex({ h: 120, s: 1, v: 0 }), '#000000');
assert.equal(hsvToHex({ h: 120, s: 1, v: 1 }), '#00FF00');
assert.equal(wheelPosition(1000, 120, 240).s, 1, 'Dragging beyond the wheel clamps saturation');
assert.equal(colorText('#FFFFFF'), '#171717');
assert.equal(colorText('#000000'), '#FFFFFF');
assert.equal(colorText('#FFFF00'), '#171717');
console.log('Color round trips (4,096 colors), wheel coordinates, brightness, and text contrast passed.');
