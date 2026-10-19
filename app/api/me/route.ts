import { getMember } from '../../../lib/permissions';
import { json } from '../../../lib/http-api';
export async function GET(){try{const member=await getMember();return member?json({userId:member.userId,role:member.role,canManage:member.canManage,canAssignRoles:member.canAssignRoles}):json({role:'anonymous',canManage:false},401);}catch{return json({error:'数据库暂时不可用。'},503);}}
