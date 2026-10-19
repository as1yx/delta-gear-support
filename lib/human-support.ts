import { env } from 'cloudflare:workers';

type Thread = { id: string; user_id: string; status: string; updated_at: string };
export type Contact = { phone: string; email: string };
const EMPTY_CONTACT: Contact = { phone: '', email: '' };

export function validateContact(value: unknown): Contact {
  if (!value || typeof value !== 'object') throw new Error('INVALID_CONTACT');
  const input = value as Record<string, unknown>;
  if (typeof input.phone !== 'string' || typeof input.email !== 'string') throw new Error('INVALID_CONTACT');
  const phone = input.phone.trim(), email = input.email.trim();
  if (phone && (!/^\+?[\d ()-]{5,32}$/.test(phone) || phone.replace(/\D/g, '').length < 5)) throw new Error('INVALID_PHONE');
  if (email && (email.length > 254 || !/^[^\s@<>?&#:]+@[^\s@<>?&#:]+\.[^\s@<>?&#:]+$/.test(email))) throw new Error('INVALID_EMAIL');
  return { phone, email };
}
export async function readContact() {
  await env.DB!.prepare('INSERT OR IGNORE INTO support_settings (id, data, revision) VALUES (?, ?, ?)').bind('human_contact', JSON.stringify(EMPTY_CONTACT), 1).run();
  const row = await env.DB!.prepare('SELECT data, revision FROM support_settings WHERE id = ?').bind('human_contact').first<{ data: string; revision: number }>();
  if (!row) throw new Error('DATABASE_UNAVAILABLE');
  return { contact: validateContact(JSON.parse(row.data)), revision: row.revision };
}
export async function writeContact(value: unknown, revision: number) {
  const contact = validateContact(value);
  if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('INVALID_REVISION');
  const result = await env.DB!.prepare('UPDATE support_settings SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(contact), 'human_contact', revision).run();
  if (result.meta.changes !== 1) throw new Error('CONTACT_CONFLICT');
  return readContact();
}
export async function ownThread(userId: string) {
  return env.DB!.prepare('SELECT id, user_id, status, updated_at FROM human_threads WHERE user_id = ?').bind(userId).first<Thread>();
}
export async function findThread(threadId: string) {
  return env.DB!.prepare('SELECT id, user_id, status, updated_at FROM human_threads WHERE id = ?').bind(threadId).first<Thread>();
}
export async function messagesFor(threadId: string) {
  const result = await env.DB!.prepare('SELECT id, sender_role, content, created_at FROM human_messages WHERE thread_id = ? ORDER BY id DESC LIMIT 100').bind(threadId).all();
  return result.results.reverse();
}
export function messageContent(input: unknown) {
  if (typeof input !== 'string' || !input.trim() || input.trim().length > 2000) throw new Error('INVALID_MESSAGE');
  return input.trim();
}
export async function sendHumanMessage(thread: Thread, userId: string, role: 'customer' | 'staff', content: string) {
  const now = new Date().toISOString();
  await env.DB!.batch([
    env.DB!.prepare('INSERT INTO human_messages (thread_id, sender_id, sender_role, content, created_at) VALUES (?, ?, ?, ?, ?)').bind(thread.id, userId, role, content, now),
    env.DB!.prepare('UPDATE human_threads SET status = ?, updated_at = ? WHERE id = ?').bind(role === 'staff' ? 'replied' : 'waiting', now, thread.id),
  ]);
}
export async function sendCustomerMessage(userId: string, content: string) {
  await env.DB!.prepare('INSERT OR IGNORE INTO human_threads (id, user_id, status, updated_at) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), userId, 'waiting', new Date().toISOString()).run();
  const thread = await ownThread(userId);
  if (!thread) throw new Error('DATABASE_UNAVAILABLE');
  await sendHumanMessage(thread, userId, 'customer', content);
}
export async function inbox() {
  const result = await env.DB!.prepare('SELECT t.id, t.status, t.updated_at, m.email FROM human_threads t LEFT JOIN site_members m ON m.user_id = t.user_id ORDER BY t.updated_at DESC LIMIT 50').all();
  return result.results;
}
