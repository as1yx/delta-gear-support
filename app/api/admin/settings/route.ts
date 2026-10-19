import { readSettings,writeSettings } from '../../../../lib/support-settings';
import { json,readJson,requireApiUser } from '../../../../lib/http-api';
export async function GET(request:Request){const denied=await requireApiUser(request,false,true);if(denied)return denied;try{return json(await readSettings());}catch{return json({error:'客服配置暂时无法读取。'},503);}}
export async function PUT(request:Request){const denied=await requireApiUser(request,true,true);if(denied)return denied;try{const body=await readJson(request,15000);return json(await writeSettings(body.settings,body.revision));}catch(error){const conflict=error instanceof Error&&error.message==='SETTINGS_CONFLICT';return json({error:conflict?'配置已在其他页面修改，请重新读取。':'配置保存失败，请检查模型列表和路由。'},conflict?409:400);}}
