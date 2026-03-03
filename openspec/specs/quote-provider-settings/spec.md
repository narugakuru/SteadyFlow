## Purpose

定义用户级行情供应商 API Key 配置能力的业务约束与验收标准。

## Requirements

### Requirement: 用户可配置报价供应商 API Key

系统 SHALL 允许登录用户在设置中配置并保存 `Twelve Data API Key` 与 `EODHD API Key`，并按用户维度独立存储在 `settings` 键值中（`quote_api.twelvedata_key`、`quote_api.eodhd_key`）。

#### Scenario: 保存两个 API Key

- **WHEN** 用户在设置中填写 Twelve Data 与 EODHD 的 API Key 并保存
- **THEN** 系统保存对应键值，并在后续读取设置时返回该用户的最新配置

#### Scenario: 仅保存一个 API Key

- **WHEN** 用户仅填写 Twelve Data 或仅填写 EODHD 并保存
- **THEN** 系统仅更新已填写的供应商 key，不要求另一个 key 必填

#### Scenario: 清空 API Key

- **WHEN** 用户将某个供应商的 API Key 清空并保存
- **THEN** 系统删除该用户对应 settings 键或返回空值，不继续使用旧 key

### Requirement: 自动报价接口按用户读取 API Key

系统 SHALL 在执行 `POST /api/holdings/fetch-prices` 时读取当前登录用户的供应商 key，MUST NOT 读取其他用户 key。

#### Scenario: A 用户与 B 用户使用不同 key

- **WHEN** A 用户和 B 用户分别配置不同的供应商 API Key 并分别触发自动报价
- **THEN** 每个请求只使用当前用户自己的 key
