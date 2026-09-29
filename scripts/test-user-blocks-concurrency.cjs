// Run after test-user-blocks.sql in the disposable local test database.
const assert = require('node:assert/strict');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const executeFile = promisify(execFile);
const database = process.argv[2] || 'mydays_blocks_test';
const port = process.argv[3] || '55439';
assert.match(database, /^mydays_blocks_test(?:_\w+)?$/, 'Only disposable block-test databases are allowed');
assert.match(port, /^\d+$/);
const args = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-d', database];
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const pair = `least(requester_id, recipient_id) = '${a}' and greatest(requester_id, recipient_id) = '${b}'`;
const actor = (id) => `set role authenticated; set request.jwt.claim.sub = '${id}';`;
const run = (sql, name = 'mydays-block-test') => executeFile('psql', [...args, '-c', sql], {
  windowsHide: true, timeout: 10000, env: { ...process.env, PGAPPNAME: name },
});
const reset = () => run(`delete from public.friendships where ${pair};
  delete from public.user_blocks where (blocker_id = '${a}' and blocked_id = '${b}')
    or (blocker_id = '${b}' and blocked_id = '${a}');`);

async function hold(sql) {
  const child = spawn('psql', args, { windowsHide: true, env: { ...process.env, PGAPPNAME: 'mydays-block-holder' } });
  let output = '', errors = '';
  child.stderr.on('data', (chunk) => { errors += chunk; });
  const completion = new Promise((resolve) => {
    child.on('error', (error) => resolve({ code: -1, errors: error.message }));
    child.on('close', (code) => resolve({ code, errors }));
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Holder did not acquire lock: ' + errors)); }, 10000);
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.includes('LOCK_HELD')) { clearTimeout(timer); resolve(); }
    });
    child.stdin.write(`begin; ${sql}\n\\echo LOCK_HELD\n`);
  });
  return async (commit = true) => {
    child.stdin.end(`${commit ? 'commit' : 'rollback'};\n\\q\n`);
    const result = await completion;
    assert.equal(result.code, 0, result.errors);
  };
}

async function race(holderSql, contenderSql, { expectedError, rollback = false } = {}) {
  const release = await hold(holderSql);
  const contender = run(contenderSql, 'mydays-block-racer').then(
    (result) => ({ ok: true, ...result }), (error) => ({ ok: false, stderr: error.stderr || error.message }),
  );
  let observedWait = false;
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      const result = await run("select count(*) from pg_stat_activity where application_name = 'mydays-block-racer' and wait_event = 'advisory';");
      if (result.stdout.trim() === '1') { observedWait = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  } finally { await release(!rollback); }
  const result = await contender;
  assert.ok(observedWait, 'The competing operation must wait on the pair lock');
  if (expectedError) { assert.equal(result.ok, false); assert.match(result.stderr, expectedError); }
  else assert.equal(result.ok, true, result.stderr);
}

async function assertBlocked() {
  const result = await run(`select
    (select count(*) from public.user_blocks where blocker_id = '${a}' and blocked_id = '${b}') || ':' ||
    (select count(*) from public.friendships where ${pair});`);
  assert.equal(result.stdout.trim(), '1:0', 'A committed block must leave no pending or accepted friendship');
}

async function main() {
  await reset();
  await race(`${actor(a)} select public.block_user('${b}');`, `${actor(b)} select public.send_friend_request('${a}');`,
    { expectedError: /This user is unavailable/ });
  await assertBlocked();
  await reset();
  await race(`${actor(b)} select public.send_friend_request('${a}');`, `${actor(a)} select public.block_user('${b}');`);
  await assertBlocked();

  await reset();
  let request = (await run(`${actor(a)} select public.send_friend_request('${b}');`)).stdout.trim();
  await race(`${actor(a)} select public.block_user('${b}');`, `${actor(b)} select public.accept_friend_request('${request}');`,
    { expectedError: /This incoming request is unavailable/ });
  await assertBlocked();
  await reset();
  request = (await run(`${actor(a)} select public.send_friend_request('${b}');`)).stdout.trim();
  await race(`${actor(b)} select public.accept_friend_request('${request}');`, `${actor(a)} select public.block_user('${b}');`);
  await assertBlocked();

  await reset();
  await race(`${actor(a)} select public.block_user('${b}');`, `${actor(b)} select public.send_friend_request('${a}');`, { rollback: true });
  assert.equal((await run(`select count(*) from public.friendships where ${pair};`)).stdout.trim(), '1',
    'Rolled-back block must not prevent a new request');
  await reset();
  console.log('PASS: concurrent block/send and block/accept in both orders, plus block rollback.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
