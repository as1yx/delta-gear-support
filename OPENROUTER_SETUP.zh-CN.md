# OpenRouter：可选的服务端模型连接

目录、配装清单和后台不需要模型 Key。当前版本尚未执行真实模型验收。

1. 在 [OpenRouter](https://openrouter.ai/settings/keys) 创建自己的 Key，不要发送到聊天或写入源码。
2. 本地开发时在被 Git 忽略的 `.dev.vars` 中设置 `OPENROUTER_API_KEY`，然后重启开发服务器。`.env.example` 仅列出变量名；不要将真实 Key 写入示例文件。
3. 在本地管理员界面查看允许模型与路由。首次默认使用 `openrouter/free`；管理员可以改用自己选定且支持工具调用的模型。路由配置存在不表示模型可用。
4. “检查接入准备”只检查配置，不验证 Key 或模型输出。使用默认示例物品，例如“示例防弹衣 A 多少钱？”，实际运行并核对工具结果。

服务端请求地址为 `https://openrouter.ai/api/v1/chat/completions`。顾客不能覆盖模型，后台只能选允许列表中的模型。

独立生产部署须自行提供 Workers/D1 配置、可信认证、secret 管理、用户限流和费用预算。GitHub 上传不会自动部署网站，也不会自动同步任何本地 Key。不要将现有身份请求头或本地模拟管理员原样暴露到公网。

已知限制：工具调用后模型仍可能生成错误正文；真实模型正确性、延迟、工具兼容性和费用尚未评测。默认路由、免费额度与具体可用模型可能变化，以供应商实际返回为准。

参考：[工具调用](https://openrouter.ai/docs/guides/features/tool-calling)、[快速接入](https://openrouter.ai/docs/quickstart)。
