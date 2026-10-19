(() => {
  'use strict';
  const RULES = window.CatalogRules;
  const INITIAL = window.INITIAL_CATALOG;
  const KEY = 'delta-store-catalog-v3';
  const LEGACY_KEY = 'delta-store-catalog-v2';
  const CART_KEY = 'delta-store-cart-v1';
  let catalogLoaded=false, revision=0, member={canManage:false,canAssignRoles:false,role:'customer'};
  const $ = id => document.getElementById(id);
  const clone = v => JSON.parse(JSON.stringify(v));
  const number = n => new Intl.NumberFormat('zh-CN').format(n);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let catalog = clone(INITIAL), cart = {}, persistence = true, selected = INITIAL.items[0].id, dirty = false;
  let category = '全部', view = 'shop', toastTimer, migrated = false;
  const variantChoices = new Map();
  const quantities = new Map();
  function validate(value) {
    if (!value || !Array.isArray(value.items) || !value.items.length || value.items.length > 500) throw new Error('商品必须为 1–500 条。');
    const ids = new Set();
    for (const item of value.items) {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('商品编号缺失或重复。');
      ids.add(item.id);
      for (const key of ['name','base_name','category','product_group_id']) if (typeof item[key] !== 'string' || !item[key].trim() || item[key].length > 160) throw new Error('商品名称、分类或分组格式错误。');
      if (RULES.hasCondition(item) ? !RULES.CONDITIONS.includes(item.condition) : Object.hasOwn(item, 'condition')) throw new Error('状态仅适用于头盔和防弹衣，且只能是破损、几乎全新、全新。');
      for (const key of ['price','combat_value']) if (!Number.isSafeInteger(item[key]) || item[key] < 0 || item[key] > 1e9) throw new Error('价格和战备值必须为 0–10 亿的整数。');
      if (!Number.isSafeInteger(item.stock) || item.stock < 0 || item.stock > 999999) throw new Error('库存必须为 0–999999 的整数。');
    }
    return value;
  }
  try { const value=JSON.parse(localStorage.getItem(CART_KEY)||'{}');if(value&&typeof value==='object'&&!Array.isArray(value))cart=Object.fromEntries(Object.entries(value).filter(([id,q])=>catalog.items.some(i=>i.id===id)&&Number.isInteger(q)&&q>0&&q<=999)); } catch {}
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
function save(){try{localStorage.setItem(CART_KEY,JSON.stringify(cart));persistence=true;}catch{persistence=false;}$('save-status').textContent=catalogLoaded?'商品保存在数据库':'正在读取商品数据库';}
  async function persistCatalog(next){
  if(!member.canManage||!catalogLoaded)throw new Error('没有保存商品的权限。');
  const response=await fetch('/api/catalog',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({catalog:next,revision})});
  const body=await response.json();if(!response.ok)throw new Error(body.error||'数据库保存失败。');
  catalog=validate(body.catalog);revision=body.revision;catalogLoaded=true;reconcileCart();save();renderFilters();renderConditionFilter();renderShop();renderCart();loadEditor();
}
  async function startDatabase(){
  if(dirty){toast('请先保存或撤销当前修改。');return;}
  try{
    const [meResponse,dataResponse]=await Promise.all([fetch('/api/me'),fetch('/api/catalog')]);
    if(!meResponse.ok||!dataResponse.ok)throw new Error('数据库暂时无法读取，请稍后点击重新读取。');
    member=await meResponse.json();const result=await dataResponse.json();catalog=validate(result.catalog);revision=result.revision;catalogLoaded=true;
    $('storage-warning').hidden=true;document.querySelector('[data-view="admin"]').hidden=!member.canManage;
    $('catalog-fields').disabled=!member.canManage;$('import-local-data').hidden=!member.canManage||!(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY));
    window.DELTA_MEMBER=member;window.dispatchEvent(new CustomEvent('delta-member',{detail:member}));
    reconcileCart();save();renderFilters();renderConditionFilter();renderShop();renderCart();loadEditor();
  }catch(error){catalogLoaded=false;$('save-status').textContent='数据库连接失败';$('storage-warning').hidden=false;$('storage-warning').textContent=error.message;renderShop();}
}
  function conditionLabel(item) { return RULES.hasCondition(item) ? item.condition : ''; }
  function conditionSelectorVisible() { return category === '全部' || RULES.hasCondition({category}); }
  function stockLabel(item) { return item.stock === null ? '库存未知' : item.stock === 0 ? '暂无库存' : `演示库存 ${number(item.stock)} 件`; }
  function maxQuantity(item) { return item.stock === null ? 999 : Math.min(999, item.stock); }
  function reconcileCart() {
    for (const id of Object.keys(cart)) {
      const item = catalog.items.find(i => i.id === id);
      if (!item || maxQuantity(item) === 0) delete cart[id];
      else cart[id] = Math.min(cart[id], maxQuantity(item));
    }
  }
  function icon(category) {
    const paths = {'头盔':'M8 29v-6a16 16 0 0 1 32 0v6M8 29h32v6H27l-5-6M12 17h24M16 35v7h6','护甲':'M16 5l8 5 8-5 9 10-6 8v20H13V23l-6-8zM18 22h12v13H18z','胸挂':'M13 5h7v10h8V5h7v12l6 4v22H7V21l6-4zM12 25h9v12h-9zM27 25h9v12h-9z','背包':'M15 10V6h18v4M11 12h26v31H11zM11 22h26M17 29h14v9H17z','配件':'M8 19h32v10H8zM19 29v14h10V29M13 13v6M35 13v6'};
    return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${paths[category] || paths['配件']}"/></svg>`;
  }
  function groups() {
    const result = new Map();
    for (const item of catalog.items) { if (!result.has(item.product_group_id)) result.set(item.product_group_id, []); result.get(item.product_group_id).push(item); }
    return [...result.entries()];
  }
  function renderFilters() {
    const categories = ['全部', ...new Set(catalog.items.map(i => i.category))];
    if (!categories.includes(category)) category = '全部';
    $('condition-filter').hidden = !conditionSelectorVisible();
    if (!conditionSelectorVisible()) $('condition-filter').value = 'all';
    $('filters').innerHTML = categories.map(c => `<button class="chip ${category===c?'active':''}" data-category="${esc(c)}" aria-pressed="${category===c}">${esc(c)}</button>`).join('');
  }
  function renderShop() {
    if(!catalogLoaded){$("products").innerHTML="<div class=\"empty\">正在读取数据库商品。读取成功后即可选购。</div>";return;}
    const query = $('search').value.trim().toLowerCase(), filter = $('condition-filter').value, max = $('budget').value === '' ? Infinity : Number($('budget').value);
    const sort = $('sort').value;
    let entries = groups().map(([groupId, variants]) => {
      const choices = variants.filter(i => (category==='全部'||i.category===category) && (!query || `${i.base_name} ${i.name} ${i.id}`.toLowerCase().includes(query)) && (filter==='all'||i.condition===filter) && i.price<=max);
      if (!choices.length) return null;
      const item = choices.find(i => i.id === variantChoices.get(groupId)) || choices[0];
      return {groupId, variants: choices, item};
    }).filter(Boolean);
    if (sort==='price') entries.sort((a,b)=>a.item.price-b.item.price);
    if (sort==='combat') entries.sort((a,b)=>b.item.combat_value-a.item.combat_value);
    $('result-count').textContent = `${entries.length} 种装备 · ${catalog.items.length} 条商品记录`;
    $('products').innerHTML = entries.length ? entries.map(({groupId, variants, item}) => {
      const q = Math.min(quantities.get(groupId)||1, Math.max(1,maxQuantity(item)));
      const hasCondition = RULES.hasCondition(item);
      const stateControl = hasCondition ? `<label class="variant-label" for="variant-${esc(groupId)}"><span>装备状态</span></label><select class="variant" id="variant-${esc(groupId)}" data-variant="${esc(groupId)}">${variants.map(i=>`<option value="${esc(i.id)}" ${i.id===item.id?'selected':''}>${esc(conditionLabel(i))} · ${number(i.price)}</option>`).join('')}</select>` : '';
      const annotation = item.manual_updated_at ? ' · 已手动修改' : item.demo_completed ? ' · 演示补齐价格' : '';
      return `<article class="product" data-group="${esc(groupId)}"><div class="product-top"><div class="item-symbol">${icon(item.category)}<span>${esc(item.category)}</span></div>${hasCondition?`<span class="badge">${variants.length} 个状态</span>`:''}</div><h3>${esc(item.base_name)}</h3>${stateControl}<dl class="numbers"><div><dt>购买价格</dt><dd class="price">${number(item.price)}</dd></div><div><dt>战备值</dt><dd>${number(item.combat_value)}</dd></div></dl><p class="stock">${stockLabel(item)}${annotation}</p><div class="product-bottom"><input class="qty" type="number" min="1" max="${Math.max(1,maxQuantity(item))}" step="1" value="${q}" aria-label="${esc(item.base_name)}数量" data-quantity="${esc(groupId)}"><button class="add" data-add="${esc(item.id)}" ${maxQuantity(item)===0?'disabled':''}>加入清单 +</button></div></article>`;
    }).join('') : '<div class="empty">没有符合条件的装备。请调整搜索、状态或价格上限。</div>';
  }
  function renderCart() {
    let price=0,combat=0,count=0,unknown=false;
    const entries=Object.entries(cart).map(([id,q])=>({item:catalog.items.find(i=>i.id===id),q})).filter(e=>e.item);
    $('cart-items').innerHTML = entries.length ? entries.map(({item,q})=>{
      price+=item.price*q;combat+=item.combat_value*q;count+=q;if(item.stock===null)unknown=true;
      return `<div class="cart-item"><div class="cart-name">${esc(item.base_name)}</div>${RULES.hasCondition(item)?`<div class="muted" style="font-size:11px;margin-top:4px">${esc(conditionLabel(item))}</div>`:''}<div class="cart-controls"><input type="number" min="1" max="${maxQuantity(item)}" step="1" value="${q}" data-cart-quantity="${esc(item.id)}" aria-label="清单中${esc(item.name)}数量"><span>${number(item.price*q)}</span><button data-remove="${esc(item.id)}" aria-label="移除${esc(item.name)}">移除</button></div></div>`;
    }).join(''):'<div class="cart-empty">选择装备和状态，加入配装清单。<br>价格与战备值会在这里合计。</div>';
    $('cart-count').textContent=`${count} 件`;$('total-price').textContent=number(price);$('total-combat').textContent=number(combat);$('clear-cart').disabled=!entries.length;
    window.DELTA_CART=Object.entries(cart).map(([id,quantity])=>({id,quantity}));
    $('cart-note').textContent=unknown?'部分装备库存未知，当前仅计算配装费用，不能确认可购买数量。':'配装清单仅用于比较和计算，不会创建订单或扣款。';
  }
  function renderConditionFilter() {
    const previous=$('condition-filter').value;
    const conditions=RULES.CONDITIONS;
    $('condition-filter').innerHTML='<option value="all">全部状态</option>'+conditions.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
    if ([...$('condition-filter').options].some(o=>o.value===previous)) $('condition-filter').value=previous;
  }
  function renderAdminList() {
    const q=$('admin-search').value.trim().toLowerCase();
    const entries=catalog.items.filter(i=>`${i.name} ${i.id}`.toLowerCase().includes(q));
    $('admin-items').innerHTML=entries.length?entries.map(i=>`<button class="admin-item ${selected===i.id?'active':''}" data-edit="${esc(i.id)}"><span>${esc(i.name)}</span><small>${esc(i.id)} · ${number(i.price)}${i.manual_updated_at?' · 已修改':''}</small></button>`).join(''):'<p class="muted">没有匹配的商品。</p>';
  }
  function loadEditor() {
    if(!catalogLoaded)return;
    const item=catalog.items.find(i=>i.id===selected)||catalog.items[0];selected=item.id;
    $('edit-heading').textContent=item.base_name;$('edit-id').textContent=`${item.id} / ${item.product_group_id}`;
    $('edit-price').value=item.price;$('edit-combat').value=item.combat_value;$('edit-stock').value=item.stock===null?'':item.stock;
    const options=RULES.CONDITIONS;
    $('edit-condition').closest('label').hidden = !RULES.hasCondition(item);
    $('edit-condition').disabled = !RULES.hasCondition(item);
    $('edit-condition').innerHTML=options.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');$('edit-condition').value=item.condition||'';
    $('edit-error').textContent='';dirty=false;updateDirty();renderAdminList();
  }
  function updateDirty() { $('dirty-indicator').textContent=dirty?'有未保存的修改':''; }
  function setView(next) {
    if(next==="admin"&&!member.canManage){toast("需要后台人员权限。");return;}
    if(dirty&&next!==view){toast('请先保存或撤销当前修改。');return;}
    view=next;$('shop-view').hidden=next!=='shop';$('admin-view').hidden=next!=='admin';
    document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.view===next)));
    $('page-title').textContent=next==='shop'?'选择装备，算清每一笔战备。':'商品数据，由你维护。';
    $('page-description').textContent=next==='shop'?'同一装备，不同状态。选择版本、调整数量，即时查看配装费用与战备合计。':'价格、战备值和演示库存手动保存后，选购页面与清单会立即更新。';
    if(next==='admin')loadEditor();
  }
  $('filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){category=b.dataset.category;renderFilters();renderShop();}});
  for(const id of ['search','budget'])$(id).addEventListener('input',renderShop);
  for(const id of ['condition-filter','sort'])$(id).addEventListener('change',renderShop);
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  $('products').addEventListener('change',e=>{
    if(e.target.dataset.variant){variantChoices.set(e.target.dataset.variant,e.target.value);renderShop();}
    if(e.target.dataset.quantity)quantities.set(e.target.dataset.quantity,Math.max(1,Math.floor(Number(e.target.value)||1)));
  });
  $('products').addEventListener('click',e=>{
    const b=e.target.closest('[data-add]');if(!b)return;
    const item=catalog.items.find(i=>i.id===b.dataset.add),input=b.parentElement.querySelector('input');
    if(!input.checkValidity()){input.reportValidity();return;}
    const q=Number(input.value),next=(cart[item.id]||0)+q;
    if(next>maxQuantity(item)){toast(item.stock===null?'单条清单最多 999 件。':'加入数量超过演示库存。');return;}
    cart[item.id]=next;save();renderCart();toast('已加入配装清单');
  });
  $('cart-items').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(b){delete cart[b.dataset.remove];save();renderCart();}});
  $('cart-items').addEventListener('change',e=>{const id=e.target.dataset.cartQuantity;if(!id)return;const item=catalog.items.find(i=>i.id===id);if(!e.target.checkValidity()){toast('数量须为范围内的正整数。');renderCart();return;}cart[id]=Math.min(Number(e.target.value),maxQuantity(item));save();renderCart();});
  $('clear-cart').addEventListener('click',()=>{cart={};save();renderCart();});
  $('admin-search').addEventListener('input',renderAdminList);
  $('admin-items').addEventListener('click',e=>{const b=e.target.closest('[data-edit]');if(!b)return;if(dirty){toast('请先保存或撤销当前修改。');return;}selected=b.dataset.edit;loadEditor();});
  $('edit-form').addEventListener('input',()=>{dirty=true;updateDirty();});
  $('undo-edit').addEventListener('click',loadEditor);
async function submitCatalogEdit(e){
  e.preventDefault();if(!member.canManage||!catalogLoaded)return;
  const next=clone(catalog),target=next.items.find(i=>i.id===selected);
  target.price=Number($('edit-price').value);target.combat_value=Number($('edit-combat').value);target.stock=Number($('edit-stock').value);
  if(RULES.hasCondition(target))target.condition=$('edit-condition').value;else delete target.condition;
  target.name=target.base_name+(target.condition?' ('+target.condition+')':'');
  if(next.items.some(i=>i.id!==target.id&&i.product_group_id===target.product_group_id&&i.condition===target.condition)){$('edit-error').textContent='同一装备已存在这个状态，请编辑对应商品。';return;}
  const button=e.submitter;button.disabled=true;
  try{validate(next);target.manual_updated_at=new Date().toISOString();await persistCatalog(next);toast('已保存到数据库，商店和客服将使用新数据。');}
  catch(error){$('edit-error').textContent=error.message;}
  finally{button.disabled=false;}
}
  $('edit-form').addEventListener('submit',submitCatalogEdit);
  $('export-data').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(catalog,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='delta-force-products-edited.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('已导出当前商品目录');
  });
  $('import-data').addEventListener('click',()=>{if(dirty){toast('请先保存或撤销当前修改。');return;}$('import-file').click();});
  let pendingImport=null;
  $('import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try{if(file.size>2e6)throw new Error('文件不能超过 2 MB。');pendingImport=validate(RULES.normalize(JSON.parse(await file.text())));$('confirm-text').textContent=`将用文件中的 ${pendingImport.items.length} 条商品替换当前目录，清单将清空。建议先导出当前目录。`;$('confirm-action').dataset.action='import';$('confirm-dialog').showModal();}
    catch(err){toast('导入失败：'+err.message);}
  });
  $('reset-data').addEventListener('click',()=>{$('confirm-text').textContent=`恢复初始的 ${INITIAL.items.length} 条商品记录（库存均为 200），覆盖本地修改并清空配装清单。建议先导出备份。`;$('confirm-action').dataset.action='reset';$('confirm-dialog').showModal();});
  $('cancel-confirm').addEventListener('click',()=>{$('confirm-dialog').close();pendingImport=null;});
async function confirmCatalogReplacement(){
  const button=$('confirm-action');button.disabled=true;
  try{await persistCatalog(button.dataset.action==='import'?clone(pendingImport):clone(INITIAL));cart={};variantChoices.clear();quantities.clear();selected=catalog.items[0].id;save();loadEditor();renderShop();renderCart();$('confirm-dialog').close();pendingImport=null;toast('数据库商品目录已更新');}
  catch(error){toast(error.message);}
  finally{button.disabled=false;}
}
  $('confirm-action').addEventListener('click',confirmCatalogReplacement);
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  $('reload-data').addEventListener('click',startDatabase);
  $('import-local-data').addEventListener('click',()=>{try{pendingImport=validate(RULES.normalize(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY_KEY))));$('confirm-text').textContent='将旧的本机商品目录写入数据库，覆盖当前数据库目录并清空清单。';$('confirm-action').dataset.action='import';$('confirm-dialog').showModal();}catch{toast('本机旧目录无法读取。');}});
  
  reconcileCart();renderFilters();renderConditionFilter();renderShop();renderCart();loadEditor();
  $('save-status').textContent='当前浏览器本地保存';
  $('catalog-fields').disabled=true;
  startDatabase();
})();