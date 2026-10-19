import { json, readJson, requireApiUser } from '../../../../../lib/http-api';
import { readContact, writeContact } from '../../../../../lib/human-support';
export async function GET(request: Request) {
  const denied = await requireApiUser(request, false, true); if (denied) return denied;
  try { return json(await readContact()); }
  catch { return json({ error: '联系方式暂时无法读取。' }, 503); }
}
export async function PUT(request: Request) {
  const denied = await requireApiUser(request, true, true); if (denied) return denied;
  try { const body = await readJson(request, 3000); return json(await writeContact(body.contact, body.revision)); }
  catch (error) {
    const conflict = error instanceof Error && error.message === 'CONTACT_CONFLICT';
    return json({ error: conflict ? '联系方式已被修改，请重新读取后保存。' : '请输入有效的电话号码和完整邮箱地址（包含 @）；暂不配置可留空。' }, conflict ? 409 : 400);
  }
}
