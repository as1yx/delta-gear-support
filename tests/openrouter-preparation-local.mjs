import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const base = 'http://127.0.0.1:5173';
const sign = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
const cookie = sign.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
async function request(path, method = 'GET', body) {
  const response = await fetch(base + path, { method, headers: { Cookie: cookie, ...(body ? { Origin: base, 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, data: await response.json() };
}
function sql(command) {
  const result = spawnSync(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'dist/server/wrangler.json', '--persist-to', '.wrangler/state', '--command', command], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Local fixture failed');
}
const me = await request('/api/me'); assert.equal(me.status, 200); assert.equal(me.data.role, 'admin');
const uid = me.data.userId.replaceAll("'", "''");
const role = value => sql(`UPDATE site_members SET role = '${value}' WHERE user_id = '${uid}'`);
const settings = await request('/api/admin/settings'); assert.equal(settings.status, 200);
let revision = settings.data.revision;
try {
  const connection = await request('/api/admin/connection');
  assert.equal(connection.status, 200);
  assert.deepEqual(Object.keys(connection.data).sort(), ['keyConfigured', 'staff', 'customer', 'ready', 'verified', 'starterModel'].sort());
  assert.equal(connection.data.verified, false);
  assert.equal(connection.data.starterModel, 'openrouter/free');
  const disable = await request('/api/admin/settings', 'PUT', { settings: { allowedModels: [], staff: { mode: 'manual' }, customer: { mode: 'manual' } }, revision });
  assert.equal(disable.status, 200); revision = disable.data.revision;
  const disabled = await request('/api/admin/connection');
  assert.equal(disabled.data.customer.ready, false);
  assert.equal(disabled.data.staff.ready, false);
  assert.equal((await request('/api/admin/settings')).data.settings.allowedModels.length, 0);
  const restore = await request('/api/admin/settings', 'PUT', { settings: settings.data.settings, revision });
  assert.equal(restore.status, 200); revision = restore.data.revision;
  role('customer');
  assert.equal((await request('/api/admin/connection')).status, 403);
  const publicStatus = await request('/api/chat'); assert.equal(publicStatus.status, 200);
  assert.deepEqual(publicStatus.data.allowedModels, []);
  if (!connection.data.keyConfigured) {
    assert.equal(publicStatus.data.configured, false);
    // Safe to test only while no model key exists: this request must stop before contacting OpenRouter.
    const answer = await request('/api/chat', 'POST', { messages: [{ role: 'user', content: '示例防弹衣 A多少钱？' }] });
    assert.equal(answer.status, 503);
    assert.match(answer.data.answer, /尚未启用/);
  }
  console.log('PASS: real local D1 setup status, explicit-disable persistence, restore, customer privacy, and safe missing-key behavior. No model calls made.');
} finally {
  role('admin');
  const latest = await request('/api/admin/settings');
  await request('/api/admin/settings', 'PUT', { settings: settings.data.settings, revision: latest.data.revision });
}