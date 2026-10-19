import { getMember } from '../../../../lib/permissions';
import { json, readJson, requireApiUser } from '../../../../lib/http-api';
import { inbox, findThread, messagesFor, messageContent, sendHumanMessage } from '../../../../lib/human-support';

export async function GET(request: Request) {
  const denied = await requireApiUser(request, false, true); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get('threadId');
    if (!id) return json({ threads: await inbox() });
    const thread = await findThread(id);
    if (!thread) return json({ error: '留言会话不存在。' }, 404);
    return json({ thread: { id: thread.id, status: thread.status }, messages: await messagesFor(id) });
  } catch { return json({ error: '人工收件箱暂时不可用。' }, 503); }
}
export async function POST(request: Request) {
  const denied = await requireApiUser(request, true, true); if (denied) return denied;
  let content: string, threadId: string;
  try {
    const body = await readJson(request, 12000);
    content = messageContent(body.message);
    if (typeof body.threadId !== 'string' || body.threadId.length > 100) throw new Error('INVALID_THREAD');
    threadId = body.threadId;
  } catch { return json({ error: '请选择留言并填写 1–2000 字的回复。' }, 400); }
  try {
    const member = await getMember(); const thread = await findThread(threadId);
    if (!thread) return json({ error: '留言会话不存在。' }, 404);
    await sendHumanMessage(thread, member!.userId, 'staff', content);
    return json({ ok: true }, 201);
  } catch { return json({ error: '人工回复未能保存，请稍后重试。' }, 503); }
}
