## 1. 供应商与设置接入

- [x] 1.1 新增 Twelve Data 适配层，支持港股/A股多候选 symbol 尝试与批量分批请求
- [x] 1.2 新增 EODHD 适配层，支持 Twelve Data 失败后的备援报价获取
- [x] 1.3 扩展设置接口（`/api/settings`）读写 `quote_api.twelvedata_key` 与 `quote_api.eodhd_key`
- [x] 1.4 在设置弹窗增加 Twelve Data/EODHD API Key 输入与保存交互

## 2. 自动报价链路改造

- [x] 2.1 改造 `POST /api/holdings/fetch-prices`：美/日走 Stooq，港/A走 Twelve 主 + EODHD 备
- [x] 2.2 增加 ticker 规范化与映射兼容（`.SS/.SZ/.HK` 与 `BRK.B.US` 等）
- [x] 2.3 扩展返回结构：`updated` 增加 `provider` 与 `source` 字段
- [x] 2.4 透传供应商原始错误信息到 `failed.error`，用于区分格式/权限/限额问题

## 3. 前端结果可视化

- [x] 3.1 新增统一结果弹窗组件，支持逐条展示成功/失败/跳过明细
- [x] 3.2 将 Dashboard 的“更新股价”交互从摘要提示改为弹窗明细
- [x] 3.3 将 Batch Update 的“更新股价”交互从摘要提示改为弹窗明细
- [x] 3.4 成功项显示最新价与来源（provider + 实时/昨收），失败/跳过显示原因

## 4. 验证与文档同步

- [x] 4.1 运行 typecheck 与相关 lint，确认新增数据结构与页面状态类型通过
- [x] 4.2 更新项目协作文档（`project_overview.md`、`openspec/project.md`）记录能力变化
