/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let availability = [], signupResult, signupCalls = [];
const supabase = {
  rpc: async (name, args) => {
    assert.equal(name, 'is_username_available');
    assert.equal(args.candidate, 'Alice');
    assert.ok(availability.length, 'Unexpected availability request');
    return availability.shift();
  },
  auth: {
    signUp: async (args) => { signupCalls.push(args); return signupResult; },
    signInWithPassword: async () => ({ error: null }),
  },
};
const loaded = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/features/auth/authService.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
new Function('require', 'module', 'exports', code)((name) => {
  if (name === '@/src/lib/supabase') return { supabase };
  assert.equal(name, 'react-native');
  return { Platform: { OS: 'web' }, AppState: {} };
}, loaded, loaded.exports);
const api = loaded.exports;
async function main() {
  assert.equal((await api.signUp('a@test.com', 'password', 'ab')).ok, false);
  assert.equal(signupCalls.length, 0);
  availability.push({ data: false, error: null });
  assert.match((await api.signUp('a@test.com', 'password', 'Alice')).message, /already taken/);
  assert.equal(signupCalls.length, 0);
  availability.push({ data: null, error: { message: 'offline' } });
  assert.match((await api.signUp('a@test.com', 'password', 'Alice')).message, /Unable to check/);
  for (const session of [null, { user: { id: 'new-user' } }]) {
    availability.push({ data: true, error: null });
    signupResult = { data: { session }, error: null };
    const result = await api.signUp('a@test.com', 'password', ' Alice ');
    assert.equal(result.status, session ? 'signedIn' : 'confirmationRequired');
    assert.deepEqual(signupCalls.at(-1), { email: 'a@test.com', password: 'password', options: { data: { username: 'Alice' } } });
  }
  availability.push({ data: true, error: null }, { data: false, error: null });
  signupResult = { data: null, error: { code: 'unexpected_failure', message: 'Database error saving new user' } };
  assert.match((await api.signUp('a@test.com', 'password', 'Alice')).message, /already taken/);
  availability.push({ data: true, error: null });
  signupResult = { data: null, error: { code: 'weak_password', message: 'Weak password' } };
  assert.equal((await api.signUp('a@test.com', 'password', 'Alice')).message, 'Weak password');
  assert.equal((await api.signIn('a@test.com', 'password')).status, 'signedIn');
  assert.equal(availability.length, 0);
  console.log('PASS: signup validation, availability, metadata, email confirmation, and errors');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
