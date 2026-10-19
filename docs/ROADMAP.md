# Roadmap / 后续方向

These are proposed features, not completed capabilities.

1. **Own-data workspace:** CSV/JSON import with validation, source and timestamp fields, and clear separation of synthetic examples and personal input.
2. **Deterministic loadout solver:** total budget, readiness target, slot limits, compatibility, locked items and exclusion rules. Prove optimality only when the candidate search is complete; explain infeasible constraints.
3. **Compare and save:** replacement deltas, saved configurations, export and explicit snapshot versions.
4. **Verified AI explanation:** structured references and deterministic numeric rendering; reject claims inconsistent with evidence, including answers following an empty query.
5. **Public deployment readiness:** verified authentication, rate/concurrency limits, aggregate spend caps and error/latency telemetry.
6. **Real-user and real-model validation:** record whether actual users complete their tasks and whether actual model responses agree with data. Scripted tests do not substitute for either.

## Known gaps

- Model prose is not checked against retrieved facts after a tool call.
- An empty tool result still satisfies the current “tool was called” gate.
- Item search is limited to 12 candidates without pagination or coverage metadata.
- There is no optimizer, order execution, automated market feed or demonstrated production reliability.

## 中文

优先做“用户数据 → 明确条件 → 确定性求解 → 约束检查 → 替换比较 → 保存”的完整闭环；AI 用来解释已经计算的结果。先验证一个实际任务是否省时，再考虑扩大数据来源。不把爬虫、支付、多租户收费或更多模型作为当前主线。

验收建议：陌生人能从干净环境运行，不填 API Key 也能完成核心规划；用小目录穷举对照验证算法；实际玩家用自己的数据复现任务。当前版本尚未达到全部目标。
