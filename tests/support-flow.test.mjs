import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { runSupport, TOOLS } from '../lib/support-agent.mjs';
import { validateCatalog, listItems } from '../lib/catalog-domain.mjs';
const rawCatalog=JSON.parse(fs.readFileSync(new URL('../lib/catalog-seed.json',import.meta.url),'utf8'));
const catalog=validateCatalog(rawCatalog);
const readCatalog=async()=>({catalog:structuredClone(catalog),revision:1});
const messages=[{role:'user',content:'查询示例头盔 A 的价格'}];
const tool=(name,args)=>({tool_calls:[{id:'check-1',type:'function',function:{name,arguments:JSON.stringify(args)}}]});
test('default fixtures are synthetic and embedded data stays in sync',()=>{
  assert.equal(catalog.items.length,16);
  assert.ok(catalog.items.every(x=>x.is_synthetic&&x.stock===200));
  const html=fs.readFileSync(new URL('../public/store/index.html',import.meta.url),'utf8');
  const embedded=JSON.parse(html.match(/window\.INITIAL_CATALOG=([\s\S]*?);<\/script>/)[1]);
  assert.deepEqual(embedded.items,rawCatalog.items);
  assert.deepEqual(validateCatalog(embedded).items,catalog.items);
  assert.deepEqual(TOOLS.map(x=>x.function.name),['list_items','get_item']);
});
test('item query obeys category, condition and price filters',()=>{
  const rows=listItems(catalog,{category:'头盔',condition:'破损',max_price:1500});
  assert.ok(rows.length>0);
  assert.ok(rows.every(x=>x.category==='头盔'&&x.condition==='破损'&&x.price<=1500));
});
test('scripted normal flow returns the queried record',async()=>{
  let calls=0;
  const result=await runSupport({messages,readCatalog,requestModel:async thread=>++calls===1?tool('get_item',{id:catalog.items[0].id}):{content:`价格 ${JSON.parse(thread.at(-1).content).item.price}`}});
  assert.deepEqual(result.tools,['get_item']);
  assert.equal(result.items[0].price,catalog.items[0].price);
  assert.equal(result.answer,`价格 ${catalog.items[0].price}`);
});
test('database failure stops before any model request',async()=>{
  let calls=0;
  const result=await runSupport({messages,readCatalog:async()=>{throw new Error('injected');},requestModel:async()=>{calls++;}});
  assert.equal(result.error,'CATALOG_UNAVAILABLE');assert.equal(calls,0);
});
test('refund requests go to a person without provider calls',async()=>{
  const result=await runSupport({messages:[{role:'user',content:'请给我退款'}],readCatalog,requestModel:async()=>{throw new Error('not allowed');}});
  assert.equal(result.handoff,true);assert.deepEqual(result.tools,[]);
});
test('unknown write tools are not executed',async()=>{
  const result=await runSupport({messages,readCatalog,requestModel:async()=>tool('set_stock',{stock:999})});
  assert.equal(result.handoff,true);assert.deepEqual(result.tools,[]);
});
test('tool-call budget is enforced',async()=>{
  const result=await runSupport({messages,readCatalog,requestModel:async()=>({tool_calls:Array.from({length:5},(_,i)=>({...tool('get_item',{id:catalog.items[0].id}).tool_calls[0],id:`call-${i}`}))})});
  assert.equal(result.error,'TOOL_LIMIT');assert.equal(result.tools.length,4);
});
test('an answer without a tool call is blocked',async()=>{
  const result=await runSupport({messages,readCatalog,requestModel:async()=>({content:'虚构价格'})});
  assert.equal(result.error,'NO_EVIDENCE');
});
test.todo('reject model prose that conflicts with retrieved prices and stock');
test.todo('reject fabricated item facts after an empty item query');
