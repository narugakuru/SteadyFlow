## Purpose

定义用户级行情供应商 API Key 配置能力的业务约束与验收标准。

## Requirements

### Requirement: 用户可配置报价供应商 API Key

系统 SHALL 允许登录用户在设置中配置并保存 `EODHD API Key` 与 `Twelve Data API Key`，并按用户维度独立存储在 `settings` 键值中（`quote_api.eodhd_key`、`quote_api.twelvedata_key`）。  
系统 MUST 将上述 key 视为可选回退供应商凭证，而非自动报价主链路的必填项。
系统 MAY 支持部署环境变量 `EODHD_API_KEY` 作为全局 EODHD 回退凭证；当用户已保存 `quote_api.eodhd_key` 时，用户级配置 MUST 优先于全局环境变量。

#### Scenario: 保存两个 API Key

- **WHEN** 用户在设置中填写 EODHD 与 Twelve Data 的 API Key 并保存
- **THEN** 系统保存对应键值，并在后续读取设置时返回该用户的最新配置

#### Scenario: 仅保存一个 API Key

- **WHEN** 用户仅填写 EODHD 或仅填写 Twelve Data 并保存
- **THEN** 系统仅更新已填写的供应商 key，不要求另一个 key 必填

#### Scenario: 清空 API Key

- **WHEN** 用户将某个供应商的 API Key 清空并保存
- **THEN** 系统删除该用户对应 settings 键或返回空值，不继续使用旧 key

### Requirement: 自动报价接口按用户读取 API Key

系统 SHALL 在执行 `POST /api/holdings/fetch-prices` 时读取当前登录用户的供应商 key，并将 EODHD key 用于美股 Yahoo 失败后的回退流程，以及亚洲市场腾讯主链路失败后的回退流程；Twelve Data 仅用于亚洲市场的最低权重备份。系统 MUST NOT 读取其他用户 key。EODHD 回退 MUST 优先使用 realtime 批量请求，并在单组待回退 symbol 数量不超过 10 时以一次 HTTP 请求提交。

#### Scenario: A 用户与 B 用户使用不同 key

- **WHEN** A 用户和 B 用户分别配置不同的供应商 API Key 并分别触发自动报价
- **THEN** 每个请求只使用当前用户自己的 key

#### Scenario: 未配置 key 仍可执行腾讯主链路

- **WHEN** 用户未配置 EODHD 与 Twelve Data key，且其亚洲市场持仓可由腾讯接口返回价格
- **THEN** 自动报价请求仍成功更新对应持仓，不因缺少回退 key 被拒绝

#### Scenario: 使用全局 EODHD 环境变量回退

- **WHEN** 用户未配置 EODHD key，但部署环境配置了 `EODHD_API_KEY`，且美股 Yahoo 或亚洲腾讯未返回可用价格
- **THEN** 系统使用全局 EODHD key 尝试回退，不要求用户在设置中重复保存 key

#### Scenario: EODHD key 用于批量回退

- **WHEN** 当前用户配置了 EODHD key，且多个持仓同时进入 EODHD 回退路径
- **THEN** 系统复用该 key 发起批量 realtime 请求，而不是对每个持仓独立发起 realtime 请求
