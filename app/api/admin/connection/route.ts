import { env } from 'cloudflare:workers';
import { json,requireApiUser } from '../../../../lib/http-api';
import { readSettings } from '../../../../lib/support-settings';
import { routingReadiness,STARTER_MODEL } from '../../../../lib/model-routing.mjs';
export async function GET(request:Request){
  const denied=await requireApiUser(request,false,true);if(denied)return denied;
  try{
    const {settings}=await readSettings();
    const staff=routingReadiness(settings,'staff'),customer=routingReadiness(settings,'customer');
    const keyConfigured=!!env.OPENROUTER_API_KEY;
    return json({keyConfigured,staff,customer,ready:keyConfigured&&staff.ready&&customer.ready,verified:false,starterModel:STARTER_MODEL});
  }catch{return json({error:'无法读取接入配置，请稍后重试。'},503);}
}
