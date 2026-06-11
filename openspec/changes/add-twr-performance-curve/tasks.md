## 1. 业绩计算服务

- [x] 1.1 新增 `performance-service`：实现外部现金流按日聚合（`deposit/withdraw`，join 账户币种后 `convertToCNY` 折算）。
- [x] 1.2 实现净值市值点序列读取（复用 `netvalue-history-service` 的 range/grain 采样）。
- [x] 1.3 实现 TWR 链式累乘：现金流归并到相邻市值点右端点，`r_t=(V_t-V_{t-1}-F_t)/V_{t-1}`，累计 `∏(1+r_t)-1`。
- [x] 1.4 实现区间业绩摘要：累计 TWR、年化 TWR（区间 < 1 年返回 null）、days。
- [x] 1.5 实现业绩起算日解析：`startDate = max(performance.start_date 设置, 最早净值快照日)`。

## 2. 业绩起算日设置

- [x] 2.1 新增 `performance.start_date` 设置读写（复用 settings 服务，按 userId 隔离）。
- [x] 2.2 起算日校验：必须是有效日期且不早于最早净值快照日，非法值回退默认。

## 3. API 端点

- [x] 3.1 新增 `GET /api/netvalue/performance`，支持 `range` 与 `grain` 参数，返回 series + summary + startDate。
- [x] 3.2 未登录返回 401；按当前用户隔离数据。
- [x] 3.3 空数据/单点场景返回安全空序列，不产生 NaN/Infinity。

## 4. 前端收益率曲线

- [x] 4.1 净值页/总览页新增"净值 / 收益率"视图切换。
- [x] 4.2 收益率折线图：Y 轴百分比，渲染 0% 基准线，统一百分比格式化。
- [x] 4.3 Tooltip 显示日期、累计 TWR%、当日组合市值。
- [x] 4.4 摘要区显示区间累计 TWR；区间 >= 1 年时显示年化 TWR。
- [x] 4.5 复用现有 range/grain 选择器与 LoadingSpinner/错误态。

## 5. 缓存接入

- [x] 5.1 缓存策略新增 `netvalue-performance` 查询键（同 LONG_HISTORY_POLICY）。
- [x] 5.2 写操作失效映射追加 `netvalue-performance`：transactions/accounts/holdings/batch-update/fetch-prices/settings。

## 6. Specs、文档与验证

- [x] 6.1 同步实现行为到主 OpenSpec specs（performance-return-curve / daily-netvalue / visualization-charts / transaction-management）。
- [x] 6.2 更新 `project_overview.md` 进展日志与 `openspec/project.md` 技术栈/目录/数据流。
- [x] 6.3 为 TWR 计算与现金流对齐添加聚焦单测（含零现金流、含 deposit/withdraw、稀疏快照、起算日截断、单点边界）。
- [x] 6.4 运行 typecheck/lint 与相关回归测试。
