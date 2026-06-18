## Context

自动报价目前由统一的持仓价格同步服务驱动，手动刷新、Dashboard 静默刷新和每日 Cron 净值前置刷新都复用该服务。美股主链路使用 Yahoo Finance，回退到 EODHD；亚洲市场使用腾讯，回退到 EODHD 和 Twelve Data。

当前实现存在两个会让价格滞后的行为：

- Yahoo 封装只解析 `regularMarketPrice`，没有根据 `marketState` 优先选择盘前或盘后价格。
- EODHD 与 Twelve Data 在实时字段不可用时会把 `previous_close` 或 EOD 历史收盘价作为成功报价写回持仓。

这会导致用户在美股盘前/盘后或供应商实时接口暂不可用时看到前一交易日收盘价，无法反映当前趋势。

## Goals / Non-Goals

**Goals:**

- 自动报价成功更新时必须来自实时/准实时字段，不主动写入上一交易日收盘价。
- Yahoo Finance 按市场状态选择 `preMarketPrice`、`postMarketPrice` 或 `regularMarketPrice`；盘前/盘后缺少对应扩展交易价格时进入回退，不使用常规收盘价顶替。
- EODHD 回退仅接受 realtime 批量接口返回的当前价；Twelve Data 仅接受 `close` 或 `price` 当前字段。
- 失败时保留旧持仓价格，并在失败原因中说明未返回实时价格。
- 用轻量单元测试覆盖价格字段选择和前收拒绝逻辑。

**Non-Goals:**

- 不引入新的付费行情供应商或 WebSocket/流式行情。
- 不保证所有供应商都覆盖真正 24 小时成交价；系统只消费供应商当前可提供的实时/准实时字段。
- 不变更数据库结构、持仓模型或用户设置。
- 不调整净值计算口径；净值继续读取持仓最新已同步价格。

## Decisions

1. **在数据源层拒绝 previous close，而不是在服务层过滤。**

   数据源封装最清楚哪些字段来自实时接口、哪些字段来自前收或历史 EOD。把过滤放在 Yahoo/EODHD/Twelve Data 封装中，可以让所有调用方共享同一口径，避免服务层误把不同供应商字段混同。

   Alternative: 在 `holding-price-sync-service` 只接受 `source === "realtime"`。这能兜底，但 EODHD 的历史 EOD 请求仍会发生，浪费请求并让错误原因不清晰。

2. **Yahoo 使用市场状态选择当前价格字段。**

   当 `marketState` 为 `PRE` / `PREPRE` 时只接受 `preMarketPrice`，为 `POST` / `POSTPOST` 时只接受 `postMarketPrice`，为 `REGULAR` 时接受 `regularMarketPrice`，为 `CLOSED` 时只接受仍可用的 `postMarketPrice` / `preMarketPrice`。若状态未知，则按 `postMarketPrice`、`preMarketPrice`、`regularMarketPrice` 的顺序寻找可用正数价格。系统仍不使用 `regularMarketPreviousClose`、`previousClose` 等前收字段；盘前、盘后或 CLOSED 缺少对应当前价格时进入 EODHD 回退或失败结果。

   Alternative: 永远按 `regularMarketPrice`。实现简单，但盘前盘后仍会显示滞后价格。

3. **EODHD 回退不再调用历史 EOD 接口。**

   EODHD 继续批量调用 realtime 接口。某个 symbol 未返回当前价时，该 symbol 进入失败结果，错误为未返回实时价格，而不是继续请求 `/api/eod`。

   Alternative: 保留 EOD 请求并标记为 `previous_close`。这能提高“成功”数量，但违背用户对当前趋势的需求。

4. **Twelve Data 不再用 `previous_close` 字段补价。**

   Twelve Data 仅在 `close` 或 `price` 为正数时返回报价；只有 `previous_close` 时返回失败。

   Alternative: 继续把 `previous_close` 当最低优先级报价。该行为正是本次要修复的问题。

## Risks / Trade-offs

- [Risk] 实时字段短暂不可用时，更新成功数量会下降。→ Mitigation: 保留旧持仓价格不写入滞后值，并透传失败原因，用户可稍后重试或配置其他供应商。
- [Risk] Yahoo 不同市场状态字段在库版本中可能存在命名差异。→ Mitigation: 字段解析使用宽松 `Record<string, unknown>`，只依赖常见字段并增加单元测试覆盖。
- [Risk] UI 仍保留“昨收”展示分支，可能误导维护者以为仍会返回前收。→ Mitigation: 本次可保持响应结构向后兼容，但规格明确新的更新结果不得返回 `previous_close`；后续可单独清理 UI 文案。

## Migration Plan

无需数据库迁移。部署后新一轮手动、静默或 Cron 报价同步会按实时价格优先口径更新；已有持仓价格不会被批量回滚或重算。
