## 1. 乐观更新封装

- [x] 1.1 扩展 `useMutationJson`，新增可选 `optimistic` 配置：`onMutate` 取消进行中的相关查询、快照旧值、即时 `setQueryData` 应用预期结果。
- [x] 1.2 `onError` 用快照回滚所有被乐观修改的查询缓存，并触发现有失败通知条（`emitSyncFailure`）。
- [x] 1.3 `onSettled` 按现有 `MUTATION_INVALIDATES` 映射失效相关查询，确保以服务端数据最终校准。
- [x] 1.4 兼容未提供 `optimistic` 配置的调用点：退化为当前 `onSuccess` 失效行为，保持向后兼容。

## 2. 写操作乐观更新器

- [x] 2.1 交易创建/删除：在 transactions 列表缓存中即时插入/移除条目，并预估更新关联持仓/账户缓存。
- [x] 2.2 持仓新增/编辑/删除：即时更新 holdings 与所属账户聚合缓存。
- [x] 2.3 账户新增/编辑/删除：即时更新 accounts 缓存。
- [x] 2.4 为乐观更新器统一处理临时 ID（本地生成）与服务端返回真实 ID 的替换（在 `onSettled` 失效中自然完成）。

## 3. 交互反馈

- [x] 3.1 写操作进行中显示轻量 pending 态（按现有组件风格，不打断布局）。
- [x] 3.2 失败回滚后复用"更新数据失败"通知条，明确告知用户该操作未保存。

## 4. Specs、文档与验证

- [x] 4.1 同步实现行为到主 OpenSpec `client-cache-layer` 规格。
- [x] 4.2 更新 `project_overview.md` 进展日志。
- [x] 4.3 添加聚焦测试：乐观应用、失败回滚到旧值、最终一致校准、临时 ID 替换。
- [x] 4.4 运行 typecheck/lint 与相关回归测试。
