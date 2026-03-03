## Context

当前自动报价接口 `POST /api/holdings/fetch-prices` 已按市场后缀分流，但亚洲市场主链路依赖需要 API Key 的供应商，导致用户首次接入和套餐受限场景下失败率偏高。项目已验证腾讯简易行情接口（`qt.gtimg.cn`）可覆盖本项目核心 A 股/港股/北交所代码格式，且无需用户配置 key，适合作为亚洲市场默认主路由。  
本次变更只调整报价路由优先级与映射规则，不改变前端交互结构和返回数据主结构。

## Goals / Non-Goals

**Goals:**

- 将 `.SS/.SZ/.HK/.BJ` 标的的默认报价主路由调整为腾讯简易接口，提升开箱可用性。
- 保留现有多供应商容错能力：腾讯失败时回退 EODHD，再回退 Twelve Data。
- 将 Twelve Data 明确降级为最低权重可选备份，不再作为亚洲主路径依赖。
- 保持结果明细可诊断性，返回中明确标注命中的 provider。

**Non-Goals:**

- 不改动 `.US/.JP` 的 Stooq 路由与现有逻辑。
- 不引入新的数据库表或新的 settings 键。
- 不在本次变更中改造前端按钮、弹窗或新增页面入口。

## Decisions

### 1) 亚洲市场主备链路改为 Tencent -> EODHD -> Twelve Data

- 选择：`.SS/.SZ/.HK/.BJ` 优先请求腾讯，失败再按用户配置回退到 EODHD，再回退 Twelve Data。
- 理由：腾讯接口无需 key，命中率与接入门槛更适合默认链路；EODHD 与 Twelve Data 保留为兜底。
- 备选方案：
- `Twelve Data -> EODHD -> Tencent`：延续旧设计，但无法解决“无 key/套餐限制”的首要问题。
- `Tencent only`：实现简单，但失去多供应商容错，不满足失败场景稳定性需求。

### 2) 统一腾讯代码映射层并纳入北交所

- 选择：新增统一映射函数，将内部 ticker 规范化后转换为腾讯 symbol：
- `xxxxxx.SS -> shxxxxxx`
- `xxxxxx.SZ -> szxxxxxx`
- `xxxxxx.BJ -> bjxxxxxx`
- `0700.HK / 700.HK -> hk00700`（港股强制 5 位补零）
- 理由：避免业务代码散落在路由内部，降低后续扩展复杂度；补齐北交所支持。
- 备选方案：在路由中临时拼接字符串。该方案短期可用，但维护成本高且容易出现格式分叉。

### 3) 腾讯批量请求采用分片与短重试

- 选择：腾讯请求使用逗号拼接批量拉取，单批设置固定上限；当返回 `v_pv_none_match=\"1\"` 或批次缺失标的时，对缺失标的做有限次短重试。
- 理由：实测可用但存在边缘风控返回，轻量重试可显著降低误判失败率。
- 备选方案：不重试直接失败。实现简单，但会把临时风控误判为供应商不可用，降低成功率。

### 4) 设置语义调整为“可选兜底 key”

- 选择：保留 `quote_api.eodhd_key` 与 `quote_api.twelvedata_key` 键，但语义改为“可选回退供应商凭证”。
- 理由：避免 schema 变更和迁移成本，同时明确默认路径已不依赖 Twelve Data。
- 备选方案：删除 Twelve Data 配置项。会影响已有用户配置与回退能力，且不利于渐进迁移。

## Risks / Trade-offs

- [腾讯接口无官方 SLA 文档] -> 保留 EODHD/Twelve Data 回退链路，并在失败明细透传供应商错误。
- [腾讯批量返回可能出现缺项或 `none_match`] -> 批次内按缺失 symbol 重试，超限后再进入回退链路。
- [不同供应商价格时间戳口径不一致] -> 维持现有 `source` 语义（realtime/previous_close）并在结果中标注 provider，避免误解数据来源。
- [新增 `.BJ` 支持可能暴露历史脏 ticker] -> 映射前统一规范化与格式校验，不合规 ticker 进入 skipped/failed 明确提示。

## Migration Plan

1. 在 `fetch-prices` 路由中抽出报价路由分发层，接入腾讯适配器。
2. 实现并接入腾讯 symbol 映射与解析逻辑，覆盖 `.SS/.SZ/.HK/.BJ`。
3. 调整亚洲链路优先级为 Tencent -> EODHD -> Twelve Data，并更新 provider 标记。
4. 回归测试：
   - 无任何 key 时 A/H/BJ 可更新；
   - 配置 EODHD/Twelve Data 时失败可继续回退；
   - US/JP 路由不回归。
5. 发布后观察失败明细中 provider 分布与异常类型，必要时微调批量分片和重试参数。

回滚策略：若腾讯链路出现系统性异常，可临时切回旧优先级（Twelve Data 主）并保留腾讯适配代码，以便后续灰度恢复。

## Open Questions

- 腾讯批量请求单批最佳上限（例如 20/50）是否需要按真实持仓规模再压测一次后固定。
- 是否需要在设置页增加“启用 Twelve Data 兜底”开关，或继续沿用“有 key 即启用”的隐式策略。
