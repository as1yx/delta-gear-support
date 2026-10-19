import { getMember } from './permissions';
export function json(value:unknown,status=200) { return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
export async function requireApiUser(request:Request,write=false,staffOnly=false) {
  let member;try{member=await getMember();}catch{return json({error:'数据库暂时不可用。'},503);}
  if(!member)return json({error:'请先登录。',code:'AUTH_REQUIRED'},401);
  if(staffOnly&&!member.canManage)return json({error:'需要后台人员权限。'},403);
  if(write&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'请求来源不受支持。'},403);
  return null;
}
export async function readJson(request:Request,maxBytes=1_600_000) {
  if(Number(request.headers.get('content-length')||0)>maxBytes)throw new Error('REQUEST_TOO_LARGE');
  const reader=request.body?.getReader();if(!reader)throw new Error('INVALID_BODY');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('REQUEST_TOO_LARGE');}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder().decode(bytes));
}
