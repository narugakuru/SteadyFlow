## Why

生产环境下写操作（新增/编辑交易、持仓、账户）需经过 Browser → Vercel Function → Neon PostgreSQL 的跨洲往返，平均 500ms~1500ms、峰值 2~4s。当前 `useMutationJson` 在 `onSuccess` 之后才失效缓存并重新拉取，用户在整个往返期间无反馈，操作体感差。

读路径已通过 TanStack Query + IndexedDB 持久化实现缓存优先，但写路径仍是"等待服务端确认"模式。引入乐观更新（Optimistic Update）可让写操作即时反映到 UI，把感知延迟降到接近 0，而无需引入新的状态库（Zustand）或本地主数据库（Dexie/IndexedDB 主库）。

## What Changes

- 扩展统一 mutation 封装，支持乐观更新：在 `onMutate` 阶段即时写入受影响查询的缓存（`setQueryData`），并快照旧值。
- 失败时 `onError` 回滚到快照旧值；无论成败 `onSettled` 按现有失效映射重新校准，保证最终一致。
- 为每类写操作定义"乐观更新器"（optimistic updater），描述如何在本地缓存上即时应用该 mutation 的预期结果（新增/编辑/删除）。
- 写操作进行中显示轻量 pending 态（如行级 saving 标记），失败时复用现有"更新数据失败"通知条并回滚。
- 保持服务端为最终权威：乐观结果仅为本地预测，`onSettled` 失效后以服务端数据为准。
- 不引入 Zustand、Dexie 或自建 Sync Queue；不改变 API 契约与数据库结构。

## Capabilities

### Modified Capabilities

- `client-cache-layer`: 写操作支持乐观更新——即时本地应用、失败回滚、最终一致校准。

## Impact

- 修改 `src/lib/cache/hooks.ts` 的 `useMutationJson`，新增 `onMutate/onError/onSettled` 乐观更新生命周期。
- 各写操作调用点提供乐观更新器（accounts/holdings/transactions 等）。
- 复用现有失效映射（`MUTATION_INVALIDATES`）与失败通知条（`emitSyncFailure`）。
- OpenSpec `client-cache-layer` 规格与 `project_overview.md` 同步。

## Non-goals

- 不引入 Zustand 或新的全局状态库。
- 不引入 IndexedDB 主库或自建 Sync Queue / 离线写队列。
- 不改 API 契约、不改数据库 schema。
- 不处理服务端部署拓扑/Neon region/驱动优化（属于另一独立延迟优化范畴，本 change 仅覆盖前端乐观更新）。
