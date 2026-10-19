import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export async function getMember(){
  const user=await getChatGPTUser();if(!user)return null;
  if(!env.DB)throw new Error('DATABASE_UNAVAILABLE');
  let row=await env.DB.prepare('SELECT user_id, email, role FROM site_members WHERE user_id = ?').bind(user.userId).first<{user_id:string;email:string;role:string}>();
  if(!row){
    const owner=!!env.BOOTSTRAP_OWNER_EMAIL&&user.email.toLowerCase()===env.BOOTSTRAP_OWNER_EMAIL.toLowerCase();
    await env.DB.prepare('INSERT OR IGNORE INTO site_members (user_id, email, role) VALUES (?, ?, ?)').bind(user.userId,user.email,owner?'admin':'customer').run();
    row=await env.DB.prepare('SELECT user_id, email, role FROM site_members WHERE user_id = ?').bind(user.userId).first<{user_id:string;email:string;role:string}>();
  }
  if(!row)throw new Error('DATABASE_UNAVAILABLE');
  return {...user,role:row.role,canManage:['admin','staff'].includes(row.role),canAssignRoles:row.role==='admin'};
}
