# Delta Gear Support

A store-support and loadout-list prototype with server-side catalog storage, role-based administration, read-only AI tools, and a human-support inbox.

**Status: prototype.** The current release supports manual item selection and totals. Automatic constrained loadout optimization is planned, not implemented. Default items and all their numerical values are fictional project-authored fixtures, not game-market data. This is an unofficial project with no real transactions.

## What works

- Search, category and condition filters, per-item price ceilings, and a browser-local loadout list with totals.
- Cloudflare D1 catalog persistence and revision checks for conflicting updates.
- Server-side customer, staff and admin roles.
- `list_items` and `get_item` read-only model tools; four tool calls and three model rounds per question, with a model-request time budget.
- OpenRouter configuration and role-based model routing; the key stays on the server.
- Persistent human-support messages and staff replies, separate from AI tools.

The public source release contains 8 fictional equipment groups and 16 item variants. No third-party website dataset or earlier private project history is included. The original hosted site is a separate deployment and is not a verified demo of this public snapshot.

## Run locally

Requires Node.js >= 22.13 and npm. Local sign-in is a loopback-only development simulation, not production authentication.

```bash
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_parched_photon.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_charming_captain_universe.sql
```

Create an ignored `.dev.vars` file containing the development owner setting. The model key is optional for catalog, administration and list calculations:

```dotenv
BOOTSTRAP_OWNER_EMAIL=seedy@sites.test
OPENROUTER_API_KEY=
SUPPORT_CONTACT=
```

```bash
npm run dev
```

Open `http://127.0.0.1:5173/signin-with-chatgpt?return_to=/store/index.html`. Apply each migration once per database. Production data and local data are separate.

## Verify

```bash
npm test
npm run typecheck
npm run build
```

Unit checks use scripted model responses and make no provider requests. Two fact-verification cases are explicitly marked TODO; they are not reported as passing real-model evaluations. Optional `tests/*-local.mjs` scripts require a running local server and may modify local fixtures; see their source before running them.

## Important limitations

- A tool call does not guarantee that subsequent model prose matches its result. Conflicting facts and fabricated answers after empty queries are known gaps. Use item cards and catalog records as the numerical reference; do not deploy this prototype as a trusted autonomous adviser.
- Item search returns up to 12 records without complete-coverage metadata. It cannot prove store-wide optimality or availability.
- Real OpenRouter model quality, latency and cost have not been evaluated. Model availability and tool support must be checked separately.
- There is no order, payment or refund execution and no automatic market-data collection.
- Authentication relies on a trusted hosting identity boundary. Independent production deployments must implement verified sessions or a trusted gateway that strips untrusted identity headers. Do not expose the development identity mechanism publicly.
- Per-user rate limits, aggregate spend controls and production monitoring are not implemented.

GitHub hosts this source repository. GitHub Pages alone cannot run its Workers/D1 backend. `.openai/hosting.json` only declares generic local bindings; it contains no deployed Site identity. See [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), [data provenance](docs/DATA_PROVENANCE.md), and [OpenRouter setup](OPENROUTER_SETUP.zh-CN.md).

## License

Project-authored code and synthetic fixtures are MIT licensed. Retained third-party notices are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Dependencies retain their own licenses. This project is not affiliated with or endorsed by a game publisher.

---

## 中文说明

这是一个装备目录、配装清单和商品客服原型，包含服务端数据库、角色权限、只读模型工具及人工留言回复。

**当前已实现手动选装备与合计；自动约束配装求解尚未实现。** 公开版默认包含 8 组、16 条自行生成的虚构示例物品，不包含第三方网站摘录行情。价格、战备、状态和库存只用于程序演示，不代表游戏市场、个人库存或官方结算规则。原有托管网站与本仓库快照分开维护，不能用原网站证明此版本已部署。

按上方命令安装、构建并依次初始化两个本地迁移，在 `.dev.vars` 设置本地模拟管理员邮箱，运行 `npm run dev` 后从给出的登录地址进入。未配置 API Key 时仍可使用目录与配装清单，模型客服显示待启用。密钥只在服务端使用，不能提交环境文件。

测试使用脚本模型，不请求供应商。两项回答事实核验测试保留为 TODO，不能写成真实模型评测已通过。已知问题包括模型正文与商品事实可能矛盾、空查询后仍可能编造、候选截断，以及缺少生产限流和费用预算。

后续重点是用户自有数据导入、预算与槽位约束求解、无解解释、替换比较和方案保存。程序负责计算，AI 负责解释；不依赖爬取第三方行情。独立公网部署前须完成真实认证及费用控制，本项目不能直接作为可信的生产客服或商业交易平台。
