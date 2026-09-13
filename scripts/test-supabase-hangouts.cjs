/* global __dirname */
// Uses the installed Supabase client with mocked HTTP responses; no live database changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

const requests = [];
const replies = [];
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    requests.push({ url: new URL(url), method: options.method, body: options.body && JSON.parse(options.body), headers: new Headers(options.headers) });
    const reply = replies.shift();
    assert.ok(reply, 'Unexpected HTTP request');
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
  } },
});
const source = fs.readFileSync(path.join(__dirname, '../src/data/supabase/hangouts.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)((name) => {
  assert.equal(name, '@/src/lib/supabase');
  return { supabase };
}, loaded, loaded.exports);
const api = loaded.exports;

const hangout = {
  id: '11111111-1111-4111-8111-111111111111', date: '2026-09-19',
  title: ' Dinner ', note: ' Diary ', circleId: '22222222-2222-4222-8222-222222222222', updatedAt: 1,
};
const row = {
  id: hangout.id, date: hangout.date, title: 'Dinner', note: 'Diary', circle_id: hangout.circleId, updated_at: 123,
};
const last = () => requests.at(-1);
function reject(code, message, status = 403) { replies.push({ status, body: { code, message, details: null, hint: null } }); }

async function main() {
  for (const [month, nextMonth] of [['2026-12', '2027-01'], ['2024-02', '2024-03'], ['0099-12', '0100-01']]) {
    replies.push({ body: [], headers: { 'Content-Range': '*/0' } });
    assert.deepEqual(await api.listHangouts(month), []);
    assert.deepEqual(last().url.searchParams.getAll('date'), [`gte.${month}-01`, `lt.${nextMonth}-01`]);
    assert.equal(last().url.searchParams.get('order'), 'date.asc,id.asc');
  }
  // A server limit lower than the requested page size must not silently truncate the month.
  replies.push({ body: [row], headers: { 'Content-Range': '0-0/2' } });
  replies.push({ body: [{ ...row, id: 'second' }], headers: { 'Content-Range': '1-1/2' } });
  assert.equal((await api.listHangouts('2026-09')).length, 2);
  assert.equal(last().url.searchParams.get('offset'), '1');

  reject('42501', 'Permission denied');
  await assert.rejects(api.listHangouts('2026-09'), (error) => error.code === '42501');
  const beforeValidation = requests.length;
  for (const month of ['2026-13', '2026-00', '2026-9', '0000-01', 'bad']) {
    await assert.rejects(api.listHangouts(month), /YYYY-MM/);
  }
  assert.equal(requests.length, beforeValidation, 'Invalid input does not send a request');
  assert.equal(replies.length, 0);
  console.log('Supabase hangout checks passed: errors, month boundaries, pagination. Live RLS is not tested here.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
