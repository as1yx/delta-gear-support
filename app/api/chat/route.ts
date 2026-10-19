import { env } from 'cloudflare:workers';
import { readCatalog } from '../../../lib/catalog-db';
import { runSupport, handoffFor } from '../../../lib/support-agent.mjs';
import { json,readJson,requireApiUser } from '../../../lib/http-api';
import { getMember } from '../../../lib/permissions';
import { readSettings } from '../../../lib/support-settings';
import { selectModel,routingReadiness } from '../../../lib/model-routing.mjs';
export async function GET(request:Request){
  const denied=await requireApiUser(request);if(denied)return denied;
  try{const member=await getMember();const{settings}=await readSettings();return json({configured:!!env.OPENROUTER_API_KEY&&routingReadiness(settings,member!.role).ready,canChooseModel:member!.canManage,allowedModels:member!.canManage?settings.allowedModels:[],provider:'OpenRouter'});}
  catch{return json({configured:false,canChooseModel:false},503);}
}
export async function POST(request:Request){
  const denied=await requireApiUser(request,true);if(denied)return denied;
  let body;
  try{body=await readJson(request,24000);}catch{return json({answer:'问题格式不正确或内容过长。'},400);}
  if(!Array.isArray(body.messages)||!body.messages.length||body.messages.length>12||body.messages.some((m:Record<string,unknown>)=>!m||typeof m!=='object'||!['user','assistant'].includes(String(m.role))||typeof m.content!=='string'||m.content.length>2000)||body.messages.at(-1).role!=='user'||(body.model!==undefined&&typeof body.model!=='string'))return json({answer:'请发送有效的问题，每条不超过 2000 字。'},400);
  const member=await getMember();
  if(body.model&&!member!.canManage)return json({answer:'顾客不能指定模型。'},403);
  const question=body.messages.at(-1).content;
  const handoff=handoffFor(question,env.SUPPORT_CONTACT||'');if(handoff)return json(handoff);
  let selection;
  try{const{settings}=await readSettings();selection=selectModel(settings,member!.role,question,body.model||'');}
  catch(error){const forbidden=error instanceof Error&&['MODEL_NOT_ALLOWED','MODEL_OVERRIDE_FORBIDDEN'].includes(error.message);return json({answer:forbidden?'这个模型没有获得使用授权。':'商品客服尚未启用，请联系店铺管理员完成模型配置。'},forbidden?403:503);}
  if(!env.OPENROUTER_API_KEY)return json({answer:'商品客服尚未启用，请联系店铺管理员完成连接配置。'},503);
  const deadline=Date.now()+35000;
  const result=await runSupport({messages:body.messages,readCatalog,contact:env.SUPPORT_CONTACT||'',cart:Array.isArray(body.cart)?body.cart:[],requestModel:async(messages:unknown,tools:unknown,required:boolean)=>{
    const remaining=deadline-Date.now();if(remaining<=0)throw new Error('DEADLINE');
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${env.OPENROUTER_API_KEY}`,'Content-Type':'application/json','X-OpenRouter-Title':'Delta Store Support'},body:JSON.stringify({model:selection.model,messages,tools,tool_choice:required?'required':'auto',provider:{require_parameters:true},max_tokens:700,temperature:0.2}),signal:AbortSignal.timeout(remaining)});
    if(!response.ok)throw new Error('MODEL_UNAVAILABLE');const result=await response.json() as {choices?:{message:unknown}[]};if(!result.choices?.[0]?.message)throw new Error('EMPTY_RESPONSE');return result.choices[0].message;
  }});
  return json(member!.canManage?{...result,model:selection.model,route:selection.route}:result);
}
