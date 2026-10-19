import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const base = 'http://127.0.0.1:5173';
const result = await fetch(base + '/signin-with-chatgpt?return_to=/', { redirect: 'manual' });
const cookie = result.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
async function request(path, method = 'GET', body, origin = base) {
  const response = await fetch(base + path, { method, headers: { Cookie: cookie, ...(body ? { Origin: origin, 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await response.text(); let data; try { data = JSON.parse(text); } catch { data = { error: text }; } return { status: response.status, data };
}
function sql(command) {
  const result = spawnSync(process.execPath, ['--import', './scripts/sites-env.mjs', './node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--local', '--config', 'dist/server/wrangler.json', '--persist-to', '.wrangler/state', '--command', command], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error('Local SQL fixture failed: ' + result.stderr);
}
const literal = value => "'" + value.replaceAll("'", "''") + "'";
const me = await request('/api/me');
assert.equal(me.status, 200); assert.equal(me.data.role, 'admin');
const uid = me.data.userId;
const originalContact = await request('/api/admin/human-support/contact');
assert.equal(originalContact.status, 200);
const originalOwn = await request('/api/human-support');
const originalThread = originalOwn.data.thread;
const prefix = 'HUMAN_EVAL_' + Date.now();
const otherId = prefix + '_other';
const asRole = role => sql(`UPDATE site_members SET role = ${literal(role)} WHERE user_id = ${literal(uid)}`);
let ownId;
try {
  assert.equal((await fetch(base + '/api/human-support')).status, 401);
  sql(`INSERT INTO human_threads (id, user_id, status, updated_at) VALUES (${literal(otherId)}, ${literal(otherId)}, 'waiting', '2026-10-18T00:00:00.000Z')`);
  sql(`INSERT INTO human_messages (thread_id, sender_id, sender_role, content, created_at) VALUES (${literal(otherId)}, ${literal(otherId)}, 'customer', ${literal(prefix + '_private')}, '2026-10-18T00:00:00.000Z')`);
  asRole('customer');
  assert.equal((await request('/api/admin/human-support')).status, 403);
  assert.equal((await request('/api/admin/human-support', 'POST', { threadId: otherId, message: 'spoof reply' })).status, 403);
  assert.equal((await request('/api/admin/human-support/contact')).status, 403);
  assert.equal((await request('/api/admin/human-support/contact', 'PUT', { contact: { phone: '', email: '' }, revision: 1 })).status, 403);
  assert.equal((await request('/api/human-support', 'POST', { message: '' })).status, 400);
  assert.equal((await request('/api/human-support', 'POST', { message: 'x'.repeat(2001) })).status, 400);
  assert.equal((await request('/api/human-support', 'POST', { message: prefix }, 'https://untrusted.example')).status, 403);
  assert.equal((await request('/api/human-support', 'POST', { message: prefix + '_question', userId: otherId, threadId: otherId, role: 'staff' })).status, 201);
  let own = await request('/api/human-support?threadId=' + otherId);
  assert.equal(own.status, 200); ownId = own.data.thread.id;
  assert.notEqual(ownId, otherId);
  assert.ok(own.data.messages.some(message => message.content === prefix + '_question' && message.sender_role === 'customer'));
  assert.ok(!own.data.messages.some(message => message.content === prefix + '_private'));
  assert.equal(own.data.thread.status, 'waiting');
  asRole('staff');
  assert.equal((await request('/api/admin/human-support')).status, 200);
  assert.equal((await request('/api/admin/human-support?threadId=' + ownId)).status, 200);
  assert.equal((await request('/api/admin/human-support', 'POST', { threadId: 'missing', message: prefix })).status, 404);
  assert.equal((await request('/api/admin/human-support', 'POST', { threadId: ownId, message: prefix + '_reply' })).status, 201);
  const updated = await request('/api/admin/human-support/contact', 'PUT', { contact: { phone: '', email: '' }, revision: originalContact.data.revision });
  assert.equal(updated.status, 200);
  assert.equal((await request('/api/admin/human-support/contact', 'PUT', { contact: { phone: '', email: '' }, revision: originalContact.data.revision })).status, 409);
  assert.equal((await request('/api/admin/human-support/contact', 'PUT', { contact: { phone: '', email: '演示.com' }, revision: updated.data.revision })).status, 400);
  assert.equal((await request('/api/admin/human-support/contact', 'PUT', { contact: { phone: 'javascript:alert(1)', email: '' }, revision: updated.data.revision })).status, 400);
  assert.equal((await request('/api/admin/human-support/contact', 'PUT', { contact: originalContact.data.contact, revision: updated.data.revision })).status, 200);
  asRole('customer');
  own = await request('/api/human-support');
  assert.equal(own.data.thread.status, 'replied');
  assert.ok(own.data.messages.some(message => message.content === prefix + '_reply' && message.sender_role === 'staff'));
  console.log('PASS: real local D1 customer message -> staff inbox -> staff reply -> customer refresh; authentication, ownership isolation, role/CSRF/input checks, contact revision conflicts. No model API requests.');
} finally {
  asRole('admin');
  const current = await request('/api/admin/human-support/contact');
  if (current.status === 200) await request('/api/admin/human-support/contact', 'PUT', { contact: originalContact.data.contact, revision: current.data.revision });
  sql(`DELETE FROM human_messages WHERE substr(content, 1, ${prefix.length}) = ${literal(prefix)}`);
  sql(`DELETE FROM human_threads WHERE id = ${literal(otherId)}`);
  if (!originalThread && ownId) sql(`DELETE FROM human_threads WHERE id = ${literal(ownId)} AND NOT EXISTS (SELECT 1 FROM human_messages WHERE thread_id = ${literal(ownId)})`);
  else if (originalThread) sql(`UPDATE human_threads SET status = ${literal(originalThread.status)} WHERE id = ${literal(originalThread.id)}`);
}