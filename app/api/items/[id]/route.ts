import { readCatalog } from '../../../../lib/catalog-db';
import { publicItem } from '../../../../lib/catalog-domain.mjs';
import { json,requireApiUser } from '../../../../lib/http-api';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){const denied=await requireApiUser(request);if(denied)return denied;try{const{id}=await context.params;const{catalog,revision}=await readCatalog();const item=catalog.items.find((i:{id:string})=>i.id===id);return item?json({item:publicItem(item),revision}):json({error:'商品不存在。'},404);}catch{return json({error:'商品信息暂时无法查询。',code:'CATALOG_UNAVAILABLE'},503);}}
