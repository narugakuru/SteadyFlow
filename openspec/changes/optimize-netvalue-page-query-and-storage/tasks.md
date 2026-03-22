## 1. 净值读取接口

- [ ] 1.1 抽取净值历史读取服务，封装列表分页查询、图表区间解析与周/月期末值聚合逻辑
- [ ] 1.2 新增 `GET /api/netvalue/list`，返回按日期倒序的分页记录与 `page/pageSize/total/hasMore` 元数据
- [ ] 1.3 新增 `GET /api/netvalue/chart`，支持 `range=30d|90d|1y|3y|all` 并返回实际 `grain`、总资产趋势与资产占比趋势数据

## 2. 净值快照瘦身与兼容迁移

- [ ] 2.1 调整 `recordTodayNetvalue` 写入结构，仅持久化 `allocation` 与 `rates`
- [ ] 2.2 为净值读取链路补齐新旧 `dataJson` 兼容解析，确保历史带 `accounts` 的记录仍可用于列表和图表
- [ ] 2.3 提供历史 `netvalue.dataJson` 回填任务或脚本，按批移除旧记录中的 `accounts` 字段

## 3. 客户端缓存与净值页接线

- [ ] 3.1 在客户端缓存层新增 `netvalue-list` 与 `netvalue-chart` 查询名、参数化 query key 和 `staleTime=60m` 覆盖策略
- [ ] 3.2 更新净值相关写操作的缓存失效映射，使其同时失效 `netvalue-list` 与 `netvalue-chart`
- [ ] 3.3 重构净值页，接入图表区间切换、列表分页读取和独立 loading/error 状态
- [ ] 3.4 重构净值图表组件，使其消费服务端聚合后的 `chart` 响应而不是全量历史列表

## 4. 验证与文档

- [ ] 4.1 验证分页列表、图表区间聚合、周/月期末值口径和新旧 `dataJson` 兼容行为
- [ ] 4.2 验证 `netvalue-list` 与 `netvalue-chart` 的本地缓存命中、60 分钟 stale 和写后失效行为
- [ ] 4.3 更新 `project_overview.md`、相关主 specs 与必要运维说明，记录净值页接口拆分、缓存策略和历史回填方案
