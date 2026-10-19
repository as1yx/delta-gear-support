export const EMPTY_SETTINGS={allowedModels:[],staff:{mode:'manual',defaultModel:'',simpleModel:'',complexModel:''},customer:{mode:'manual',defaultModel:'',simpleModel:'',complexModel:''}};
export const STARTER_MODEL='openrouter/free';
export const STARTER_SETTINGS={allowedModels:[STARTER_MODEL],staff:{mode:'manual',defaultModel:STARTER_MODEL,simpleModel:'',complexModel:''},customer:{mode:'manual',defaultModel:STARTER_MODEL,simpleModel:'',complexModel:''}};
// One-time setup of an unconfigured store. Explicitly saved empty settings stay empty.
export function initialSettings(value){
  const settings=validateSettings(value);
  const empty=settings.allowedModels.length===0&&['staff','customer'].every(role=>['defaultModel','simpleModel','complexModel'].every(key=>!settings[role][key]));
  return {...(value.setup_version!==1&&empty?structuredClone(STARTER_SETTINGS):settings),setup_version:1};
}
export function routingReadiness(settings,role){
  try{return {ready:true,simple:selectModel(settings,role,'库存多少').model,complex:selectModel(settings,role,'比较推荐').model};}
  catch{return {ready:false,simple:'',complex:''};}
}
export function validateSettings(input){
  if(!input||!Array.isArray(input.allowedModels)||input.allowedModels.length>20)throw new Error('最多允许 20 个模型。');
  const allowedModels=[...new Set(input.allowedModels.map(id=>String(id).trim()).filter(Boolean))];
  if(allowedModels.some(id=>id.length>160||!/^[-a-zA-Z0-9_.:]+\/[-a-zA-Z0-9_.:/]+$/.test(id)))throw new Error('模型 ID 格式不正确。');
  const result={allowedModels};
  for(const audience of ['staff','customer']){
    const rule=input[audience];if(!rule||!['manual','auto'].includes(rule.mode))throw new Error('路由模式不正确。');
    const target={mode:rule.mode};
    for(const key of ['defaultModel','simpleModel','complexModel']){const value=String(rule[key]||'').trim();if(value&&!allowedModels.includes(value))throw new Error('路由模型必须在允许列表中。');target[key]=value;}
    result[audience]=target;
  }
  return result;
}
export function selectModel(settings,role,question,requestedModel=''){
  const staff=['admin','staff'].includes(role);
  if(requestedModel){if(!staff)throw new Error('MODEL_OVERRIDE_FORBIDDEN');if(!settings.allowedModels.includes(requestedModel))throw new Error('MODEL_NOT_ALLOWED');return {model:requestedModel,route:'staff_override'};}
  const rule=settings[staff?'staff':'customer'];
  const complex=/对比|比较|区别|推荐|搭配|预算|方案|性价比|合计|总价|compare|recommend|budget/i.test(question);
  const model=rule.mode==='auto'?(complex?rule.complexModel:rule.simpleModel)||rule.defaultModel:rule.defaultModel;
  if(!model||!settings.allowedModels.includes(model))throw new Error('MODEL_NOT_CONFIGURED');
  return {model,route:rule.mode==='auto'?(complex?'complex':'simple'):'default'};
}
