## Why

当前各页面在进入时普遍需要等待远端接口返回后才能渲染，页面切换存在 1-2 秒空窗，影响核心操作流畅度。需要引入统一的浏览器本地缓存与后台刷新机制，在保证用户隔离和数据一致性的前提下，优先展示可用数据，再异步拉取云端最新数据。

## What Changes

- 新增全局客户端缓存层：采用内存缓存 + IndexedDB 持久化缓存的两级读取策略，所有核心业务页面统一接入。
- 新增统一缓存策略配置入口：将 `staleTime`、`persistTime`、刷新触发策略、写操作失效映射集中到单一配置文件维护。
- 统一缓存时效策略：
  - `staleTime = 60s`（60 秒内命中缓存不触发异步远端刷新）
  - `persistTime = 3d`（3 天内命中缓存均可先展示）
  - 缓存年龄 `>60s 且 <3d` 时，先展示缓存并异步刷新远端数据
- 新增全局后台刷新失败通知条：当异步刷新失败时显示顶部通知条，并以缓慢淡出方式自动消失；保留缓存内容不阻塞当前页面。
- 新增低侵入“数据新鲜度”显示规范：在页面不显眼位置以小字号展示“更新时间/缓存年龄”。
- 新增跨标签页缓存失效同步、登出清理、401 清理等安全一致性规则。

## Capabilities

### New Capabilities

- `client-cache-layer`: 定义全局本地缓存读取、后台刷新、统一失效与失败提示的行为规范，覆盖首页及其他业务页面的数据读取体验。

### Modified Capabilities

- `dashboard`: 首页加载行为从“等待远端完成再渲染”调整为“缓存优先渲染 + 按策略后台刷新”，并在异步刷新失败时展示全局通知条。

## Impact

- Affected code:
  - `src/app/page.tsx`
  - `src/app/accounts/page.tsx`
  - `src/app/transactions/page.tsx`
  - `src/app/batch-update/page.tsx`
  - `src/app/netvalue/page.tsx`
  - `src/app/market/page.tsx`
  - `src/components/account-list.tsx`
  - `src/components/discipline-table.tsx`
  - `src/lib/hooks.ts`
  - `src/components/navbar.tsx`
  - 新增缓存与策略配置目录（如 `src/lib/cache/*`）
- Affected APIs: 读接口调用时机与频率会变化（接口契约不变）。
- Dependencies: 可能新增客户端查询/持久化相关依赖（例如查询缓存与 IndexedDB 持久化插件）。
- Systems: 浏览器存储（IndexedDB）、跨标签页同步机制（BroadcastChannel）与全局通知 UI。
