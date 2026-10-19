(function (scope) {
  'use strict';
  const CONDITIONS = ['破损', '几乎全新', '全新'];
  const hasCondition = item => ['头盔', '护甲', '防弹衣'].includes(item.category);
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalize(input) {
    const value = clone(input);
    if (!value || !Array.isArray(value.items) || !value.items.length || value.items.length > 500) throw new Error('商品必须为 1–500 条。');
    const upgrading = !(Number(value.schema_version) >= 3);
    const groups = new Map(), ids = new Set();
    for (const item of value.items) {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) throw new Error('商品编号缺失或重复。');
      ids.add(item.id);
      for (const key of ['base_name', 'category', 'product_group_id']) if (typeof item[key] !== 'string' || !item[key].trim()) throw new Error('商品名称、分类或分组缺失。');
      if (!groups.has(item.product_group_id)) groups.set(item.product_group_id, []);
      groups.get(item.product_group_id).push(item);
      if (upgrading) item.stock = 200;
      if (!item.source_name && !item.demo_completed) item.source_name = item.name;
    }
    const result = [];
    for (const variants of groups.values()) {
      if (variants.some(item => item.base_name !== variants[0].base_name || item.category !== variants[0].category)) throw new Error('同一分组的装备名称和分类必须一致。');
      if (!hasCondition(variants[0])) {
        if (variants.length !== 1) throw new Error('没有状态的装备每种只保留一条商品。');
        const item = variants[0];
        delete item.condition;
        delete item.condition_origin;
        item.name = item.base_name;
        result.push(item);
        continue;
      }
      if (variants.length > 3) throw new Error('头盔或防弹衣每种最多三个状态。');
      const byCondition = new Map();
      for (const item of variants) {
        if (!CONDITIONS.includes(item.condition)) continue;
        if (byCondition.has(item.condition)) throw new Error('同一装备不能有重复状态。');
        item.condition_origin ||= 'source_label';
        byCondition.set(item.condition, item);
      }
      for (const item of variants.filter(item => !CONDITIONS.includes(item.condition))) {
        item.original_condition = item.condition ?? null;
        item.condition = CONDITIONS.find(condition => !byCondition.has(condition));
        item.condition_origin = 'user_order_rule';
        byCondition.set(item.condition, item);
      }
      for (const condition of CONDITIONS) {
        if (byCondition.has(condition)) continue;
        const index = CONDITIONS.indexOf(condition);
        const donor = [...CONDITIONS.slice(0, index).reverse(), ...CONDITIONS.slice(index + 1)].map(key => byCondition.get(key)).find(Boolean);
        const item = clone(donor);
        let id = `${item.product_group_id}-condition-${index + 1}`;
        for (let n = 2; ids.has(id); n++) id = `${item.product_group_id}-condition-${index + 1}-${n}`;
        ids.add(id);
        item.id = id;
        item.condition = condition;
        item.condition_origin = 'demo_completion';
        item.demo_completed = true;
        item.price_origin = 'copied_from_existing_variant';
        item.derived_from_id = donor.derived_from_id || donor.id;
        item.stock = 200;
        delete item.manual_updated_at;
        byCondition.set(condition, item);
      }
      for (const condition of CONDITIONS) {
        const item = byCondition.get(condition);
        item.name = `${item.base_name} (${condition})`;
        result.push(item);
      }
    }
    if (result.length > 500) throw new Error('补齐后商品不能超过 500 条。');
    value.items = result;
    value.schema_version = 3;
    value.update_policy = 'manual_only';
    value.live_sync_enabled = false;
    value.field_notes = {...value.field_notes,
      condition: '仅头盔和防弹衣存在，取值为破损、几乎全新、全新；其他商品不设置此字段。',
      condition_origin: 'source_label 为来源标注；user_order_rule 为来源未知时按破损、几乎全新、全新依次填空；demo_completion 为补出的演示版本。',
      stock: '按用户要求，目录升级时全部设为 200；后续可以在管理页面手动修改。',
      demo_completed: '缺少的状态通过复制已有版本补齐，价格和战备值沿用参考版本；不是该状态的真实行情。',
      source_name: '摘录时的原始名称，保留用于追溯，不作为状态展示。'
    };
    value.usage_rules = (value.usage_rules || []).filter(rule => !rule.includes('对库存和'));
    const rule = '补齐状态使用演示数据；来源未知的状态按从低到高填入缺位；价格保持固定并可手动修改。';
    if (!value.usage_rules.includes(rule)) value.usage_rules.push(rule);
    return value;
  }
  scope.CatalogRules = {CONDITIONS, hasCondition, normalize};
})(typeof window === 'undefined' ? globalThis : window);
