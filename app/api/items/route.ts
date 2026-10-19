import { readCatalog } from '../../../lib/catalog-db';
import { listItems } from '../../../lib/catalog-domain.mjs';
import { json,requireApiUser } from '../../../lib/http-api';
export async function GET(request:Request){const denied=await requireApiUser(request);if(denied)return denied;try{const params=new URL(request.url).searchParams;const{catalog,revision}=await readCatalog();return json({items:listItems(catalog,{query:params.get('q')||'',category:params.get('category')||'',condition:params.get('condition')||'',...(params.has('max_price')?{max_price:Number(params.get('max_price'))}:{})}),revision});}catch{return json({error:'商品信息暂时无法查询。',code:'CATALOG_UNAVAILABLE'},503);}}
