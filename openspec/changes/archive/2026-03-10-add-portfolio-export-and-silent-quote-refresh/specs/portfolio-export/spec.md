## ADDED Requirements

### Requirement: 完整投资组合导出 API

系统 SHALL 提供 `GET /api/export/portfolio` 端点，为当前登录用户返回一个完整的投资组合 JSON 快照。该快照 MUST 在单次响应中包含当前用户的账户、持仓、资产类别、汇率、总资产摘要、资产配置派生结果以及报价同步元数据，避免调用方再拼装多个接口。

#### Scenario: 已登录用户获取完整快照

- **WHEN** 已登录用户请求 `GET /api/export/portfolio`
- **THEN** 系统返回 200 JSON，并在同一响应中包含 `meta`、`summary`、`raw`、`derived` 四个顶层对象

#### Scenario: 数据只包含当前用户

- **WHEN** 用户 A 请求 `GET /api/export/portfolio`
- **THEN** 返回的数据只包含用户 A 的账户、持仓、资产类别、设置与派生汇总，不包含其他用户数据

#### Scenario: 未登录用户请求导出

- **WHEN** 未登录用户请求 `GET /api/export/portfolio`
- **THEN** 系统返回 401

### Requirement: 导出快照协议稳定且过滤敏感信息

导出响应 MUST 包含稳定的协议元数据：至少包括 `schemaVersion`、`generatedAt` 与标准化的 `quoteSync` 对象。系统 MUST 仅导出白名单范围内的非敏感设置项，MUST NOT 导出任何报价供应商 API Key、认证信息、会话信息或其他敏感字段。

#### Scenario: 返回版本与生成时间

- **WHEN** 用户成功获取投资组合导出
- **THEN** 响应中的 `meta` 包含非空的 `schemaVersion` 与 `generatedAt`

#### Scenario: 过滤敏感设置

- **WHEN** 用户已在 settings 中保存 `quote_api.eodhd_key` 与 `quote_api.twelvedata_key`
- **THEN** 导出响应不包含这些 key 的明文值，只保留允许公开的非敏感设置字段

#### Scenario: 首次从未同步过报价

- **WHEN** 用户从未触发过任何报价同步
- **THEN** 响应中的 `meta.quoteSync` 仍返回标准化对象，未产生的数据字段使用 `null` 或约定的默认值表达

### Requirement: 导出接口支持手动下载验证

系统 SHALL 支持以下载方式返回投资组合 JSON 快照，用于人工验证导出内容。用户在手动导出场景下获取的文件内容 MUST 与直接访问导出接口的 JSON 语义一致。

#### Scenario: 下载导出文件

- **WHEN** 已登录用户请求 `GET /api/export/portfolio?download=1`
- **THEN** 系统以 JSON 文件下载形式返回完整投资组合快照，并附带可识别的文件名

#### Scenario: 下载内容与接口内容一致

- **WHEN** 用户分别访问 `GET /api/export/portfolio` 和 `GET /api/export/portfolio?download=1`
- **THEN** 两个响应承载的导出数据语义一致，只是返回方式不同
