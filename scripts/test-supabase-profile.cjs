/* global __dirname */
// Installed Supabase client with mocked HTTP; database rules are tested in test-combined-save.sql.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
const replies = [], requests = [], signed = [];
let signedIn = true;
const supabase = createClient('https://test.invalid', 'test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: async (url, options) => {
    requests.push({ url: new URL(url), method: options.method, body: options.body && JSON.parse(options.body) });
    const reply = replies.shift();
    assert.ok(reply, 'Unexpected request');
    return new Response(options.method === 'HEAD' ? null : JSON.stringify(reply.body), {
      status: reply.status ?? 200, headers: { 'Content-Type': 'application/json', ...reply.headers },
    });
  } },
});
supabase.auth.getSession = async () => ({ data: { session: signedIn ? { user: { id: 'owner' } } : null }, error: null });
const loaded = { exports: {} };
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/data/supabase/profile.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', compiled)((name) => {
  if (name === '@/src/lib/supabase') return { supabase };
  assert.equal(name, './photos');
  return { photosFromRows: async (rows) => { signed.push(rows); return rows.map((row) => ({ id: row.id, uri: 'signed' })); } };
}, loaded, loaded.exports);
const api = loaded.exports;
async function main() {
  replies.push({ body: null });
  assert.equal(await api.getUsername(), '');
  assert.equal(requests.at(-1).url.searchParams.get('user_id'), 'eq.owner');
  replies.push({ body: null });
  await api.saveUsername('  Sam_1.2  ');
  assert.equal(requests.at(-1).body.username, 'Sam_1.2');
  assert.equal(requests.at(-1).body.user_id, 'owner');
  assert.equal(requests.at(-1).url.searchParams.get('on_conflict'), 'user_id');
  replies.push({ status: 409, body: { code: '23505', message: 'duplicate' } });
  await assert.rejects(api.saveUsername('sam_1.2'), /already taken/);
  const beforeInvalid = requests.length;
  for (const value of ['', 'ab', 'a'.repeat(31), 'has spaces', 'emoji🙂']) await assert.rejects(api.saveUsername(value), /3–30/);
  await assert.rejects(api.facesForMonth('2026-13'), /YYYY-MM/);
  assert.equal(requests.length, beforeInvalid);
  replies.push({ body: null });
  assert.equal(await api.getDayFace('2026-09-15'), null);
  replies.push({ body: null });
  await api.setDayFace('2026-09-15', 'photo');
  assert.equal(requests.at(-1).url.searchParams.get('on_conflict'), 'user_id,date');
  assert.equal(requests.at(-1).body.photo_id, 'photo');
  replies.push({ body: [{ date: '2026-12-31', photos: { id: 'photo' } }] });
  assert.deepEqual(await api.facesForMonth('2026-12'), { '2026-12-31': { id: 'photo', uri: 'signed' } });
  assert.deepEqual(signed, [[{ id: 'photo' }]]);
  assert.deepEqual(requests.at(-1).url.searchParams.getAll('date'), ['gte.2026-12-01', 'lt.2027-01-01']);
  replies.push({ body: null, headers: { 'Content-Range': '*/17' } });
  assert.equal(await api.countProfilePhotos(), 17);
  assert.equal(requests.at(-1).method, 'HEAD');
  replies.push({ status: 400, body: { code: 'P0001', message: 'Wrong date' } });
  await assert.rejects(api.setDayFace('2026-09-16', 'photo'), /Wrong date/);
  signedIn = false;
  await assert.rejects(api.getUsername(), /Sign in/);
  assert.equal(replies.length, 0);
  console.log('PASS: username validation/conflicts, owner filters, daily upserts, monthly mapping, counts, and errors.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
