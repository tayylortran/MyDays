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
  replies.push({ status: 201, body: row });
  const saved = await api.saveHangout({ mode: 'create', hangout: { ...hangout, user_id: 'spoofed' } });
  assert.deepEqual(saved, { ...hangout, title: 'Dinner', note: 'Diary', updatedAt: 123 });
  assert.equal(last().method, 'POST');
  assert.equal(last().url.pathname, '/rest/v1/hangouts');
  assert.deepEqual(Object.keys(last().body).sort(), ['id', 'date', 'title', 'note', 'circle_id', 'updated_at'].sort());
  assert.equal(last().body.id, hangout.id);
  assert.equal(last().body.date, hangout.date);
  assert.equal(last().body.title, 'Dinner');
  assert.equal(last().body.note, 'Diary');
  assert.ok(last().body.updated_at > hangout.updatedAt);
  assert.ok(!last().headers.get('Prefer').includes('resolution=merge-duplicates'), 'Create must not overwrite an existing hangout');

  replies.push({ body: { ...row, title: 'Edited' } });
  await api.saveHangout({ mode: 'edit', hangout: { ...hangout, title: 'Edited' } });
  assert.equal(last().method, 'PATCH');
  assert.deepEqual(Object.keys(last().body).sort(), ['title', 'note', 'circle_id', 'updated_at'].sort());
  assert.equal(last().url.searchParams.get('id'), `eq.${hangout.id}`);
  assert.equal(last().url.searchParams.get('date'), `eq.${hangout.date}`);

  reject('PGRST116', 'No row returned', 406);
  await assert.rejects(api.saveHangout({ mode: 'edit', hangout: { ...hangout, date: '2026-09-20' } }), /unavailable or its date/);
  assert.equal(last().url.searchParams.get('date'), 'eq.2026-09-20');
  assert.ok(!('date' in last().body), 'A changed date is a filter, never an update');

  for (const [mode, code] of [['create', '23505'], ['create', '23503'], ['edit', '23503'], ['edit', '42501']]) {
    reject(code, 'Database rejected request');
    await assert.rejects(api.saveHangout({ mode, hangout }), (error) => error.code === code);
  }

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
  for (const changes of [{ title: ' ' }, { circleId: '' }, { date: '09/19/2026' }]) {
    await assert.rejects(api.saveHangout({ mode: 'create', hangout: { ...hangout, ...changes } }));
  }
  assert.equal(requests.length, beforeValidation, 'Invalid input does not send a request');
  assert.equal(replies.length, 0);
  console.log('Supabase hangout checks passed: field mapping, create/edit separation, fixed-date filter, errors, month boundaries, pagination. Live RLS is not tested here.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
