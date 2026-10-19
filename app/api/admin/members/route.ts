import { env } from 'cloudflare:workers';
import { getMember } from '../../../../lib/permissions';
import { json,readJson,requireApiUser } from '../../../../lib/http-api';
export async function GET(request:Request){
  const denied=await requireApiUser(request,false,true);if(denied)return denied;
  const member=await getMember();if(!member?.canAssignRoles)return json({error:'需要管理员权限。'},403);
  return json({members:(await env.DB!.prepare('SELECT user_id, email, role FROM site_members').all()).results});
}
export async function PATCH(request:Request){
  const denied=await requireApiUser(request,true,true);if(denied)return denied;
  const member=await getMember();if(!member?.canAssignRoles)return json({error:'需要管理员权限。'},403);
  try{const body=await readJson(request,2000);if(body.userId===member.userId||!['staff','customer'].includes(body.role)||typeof body.userId!=='string')return json({error:'只能调整其他已登录成员的后台或顾客权限。'},400);
    const result=await env.DB!.prepare('UPDATE site_members SET role = ? WHERE user_id = ? AND role != ?').bind(body.role,body.userId,'admin').run();
    return result.meta.changes===1?json({ok:true}):json({error:'成员不存在或角色不可修改。'},404);
  }catch{return json({error:'权限保存失败。'},400);}
}