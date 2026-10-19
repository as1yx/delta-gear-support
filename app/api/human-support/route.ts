import { getMember } from '../../../lib/permissions';
import { json, readJson, requireApiUser } from '../../../lib/http-api';
import { ownThread, messagesFor, readContact, messageContent, sendCustomerMessage } from '../../../lib/human-support';

export async function GET(request: Request) {
  const denied = await requireApiUser(request); if (denied) return denied;
  try {
    const member = await getMember();
    const thread = await ownThread(member!.userId);
    const { contact } = await readContact();
    return json({ thread: thread ? { id: thread.id, status: thread.status } : null, messages: thread ? await messagesFor(thread.id) : [], contact });
  } catch { return json({ error: '人工留言暂时无法读取，请稍后重试。' }, 503); }
}
export async function POST(request: Request) {
  const denied = await requireApiUser(request, true); if (denied) return denied;
  let content: string;
  try { const body = await readJson(request, 12000); content = messageContent(body.message); }
  catch { return json({ error: '请填写 1–2000 字的问题。' }, 400); }
  try {
    const member = await getMember();
    // Never accept a browser-provided user ID, thread ID, or staff role.
    await sendCustomerMessage(member!.userId, content);
    return json({ ok: true }, 201);
  } catch { return json({ error: '留言未能提交，请稍后重试。' }, 503); }
}
