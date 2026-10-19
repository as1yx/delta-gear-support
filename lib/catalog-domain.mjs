import './catalog-rules.js';
const RULES = globalThis.CatalogRules;
export function validateCatalog(input) {
  const catalog = RULES.normalize(input);
  for (const item of catalog.items) {
    for (const key of ['id','name','base_name','category','product_group_id']) if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 160) throw new Error('商品文字字段不合法。');
    for (const key of ['price','combat_value']) if (!Number.isSafeInteger(item[key]) || item[key] < 0 || item[key] > 1e9) throw new Error('价格与战备值必须为 0–10 亿的整数。');
    if (!Number.isSafeInteger(item.stock) || item.stock < 0 || item.stock > 999999) throw new Error('库存必须为 0–999999 的整数。');
  }
  if (JSON.stringify(catalog).length > 1_500_000) throw new Error('商品目录过大。');
  return catalog;
}
export function publicItem(item) {
  return {id:item.id,name:item.name,base_name:item.base_name,category:item.category,...(item.condition?{condition:item.condition}:{}),price:item.price,combat_value:item.combat_value,stock:item.stock,price_note:item.demo_completed&&!item.manual_updated_at?'缺失状态的演示补齐价格':'商店固定价格'};
}
export function listItems(catalog, args={}) {
  const query=String(args.query||'').toLowerCase().trim();
  return catalog.items.filter(i=>(!query||`${i.name} ${i.id}`.toLowerCase().includes(query))&&(!args.category||i.category===args.category)&&(!args.condition||i.condition===args.condition)&&(!Number.isFinite(args.max_price)||i.price<=args.max_price)).sort((a,b)=>a.price-b.price).slice(0,12).map(publicItem);
}
