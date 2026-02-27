## Context

当前市场概览页使用 `yahoo-finance2` npm 包获取指数行情，本地完全失效，但服务器端部分生效（A 股指数、恒生科技可用，东证指数不可用）。持仓股价只能手动更新。`cost` 字段在 shares 模式下存储总成本金额，语义不够清晰。

现有架构：前端 → `/api/market` → `yahoo-finance2` → Yahoo Finance（本地挂，服务器部分可用）。持仓价格更新：纯手动（batch-update 页面或编辑对话框）。

## Goals / Non-Goals

**Goals:**

- 用 Stooq + Yahoo 双数据源互补，恢复市场指数数据（11/12 覆盖）
- 为有合法 ticker 的持仓提供双源自动报价能力（美股/日股用 Stooq，A 股/港股用 Yahoo）
- 将 shares 模式的 `cost` 语义从"总成本"改为"平均每股成本"，使成本价/现价分离更清晰
- 在 batch-update 和 Dashboard 提供一键获取报价入口

**Non-Goals:**

- 不实现 cron 定时拉取或 DB 缓存层（后续优化）
- 不改变 amount 模式的任何逻辑
- 不新增数据库字段（复用现有 cost/shares/price/marketValue）

## Decisions

### D1: 双数据源互补架构

**选择**: Stooq（主力，美股/日股/VIX/HSI）+ Yahoo Finance（补充，A 股/港股）

**理由**: Stooq 完全免费、无需 API Key、纯 HTTP CSV、接口稳定，但不覆盖 A 股。Yahoo Finance（yahoo-finance2）在服务器端对 A 股/港股部分生效，两者互补可覆盖 11/12 个指数。

**覆盖范围**:
| 符号 | 指数 | 数据源 | 状态 |
|---|---|---|---|
| `^spx` | S&P 500 | Stooq | ✅ |
| `^ndq` | 纳斯达克100 | Stooq | ✅ |
| `^dji` | 道琼斯 | Stooq | ✅ |
| `^nkx` | 日经225 | Stooq | ✅ |
| `^vix` | VIX | Stooq | ✅ |
| `^hsi` | 恒生指数 | Stooq | ✅ |
| `000300.SS` | 沪深300 | Yahoo | ✅ |
| `000001.SS` | 上证指数 | Yahoo | ✅ |
| `399006.SZ` | 创业板指 | Yahoo | ✅ |
| `000905.SS` | 中证500 | Yahoo | ✅ |
| `^HSTECH` | 恒生科技 | Yahoo | ✅ |
| 东证指数 | — | 无 | ❌ 两边都不支持 |

### D2: 不新增 DB 字段，复用 cost 语义变更

**选择**: `cost` 字段在 shares 模式下语义从"总成本"改为"平均每股成本"，不改字段名。

**理由**:

- 零 schema 变更，amount 模式不受影响
- 只需数据迁移：`cost = cost / shares`（shares > 0 时）
- 代码中通过注释明确区分两种模式下的含义

**替代方案**:

- 新增 `avgCost` 字段: 更清晰但需要 schema 迁移，且 amount 模式下该字段无意义

### D3: 个股 ticker 格式约定（双数据源）

**选择**: 用户在 ticker 字段填写带后缀的格式，系统通过后缀识别数据源和可自动拉取的持仓。

**格式规则**:

- `*.us` → 美股（Stooq）
- `*.jp` → 日股（Stooq）
- `*.SS` → 上交所 A 股（Yahoo）
- `*.SZ` → 深交所 A 股（Yahoo）
- `*.HK` → 港股（Yahoo）
- 无后缀或其他后缀 → 跳过自动拉取，继续手动更新

**理由**: 零 schema 改动，向后兼容，用户只需在新建/编辑时按提示填写。Stooq 后缀小写（`.us`/`.jp`），Yahoo 后缀大写（`.SS`/`.SZ`/`.HK`），天然区分数据源。

### D4: 自动报价 API 设计

**选择**: 新增 `POST /api/holdings/fetch-prices` 端点。

**流程**:

```
POST /api/holdings/fetch-prices
  → 查询当前用户所有 shares 模式持仓
  → 按 ticker 后缀分组：
    - .us / .jp → Stooq 批量拉取
    - .SS / .SZ / .HK → Yahoo 批量拉取（yf.quote）
    - 其他 → 跳过
  → 解析价格（Stooq: CSV close, Yahoo: regularMarketPrice）
  → 拉取失败的持仓不修改 price/marketValue
  → 成功的更新 price 和 marketValue（= shares × price）
  → 返回 { updated: [...], failed: [...], skipped: [...] }
```

### D5: 交易副作用逻辑（shares 模式）

**买入**:

```
newCost = (oldCost × oldShares + txPrice × txShares) / (oldShares + txShares)
newShares = oldShares + txShares
newPrice = txPrice
newMarketValue = newShares × newPrice
```

**卖出**:

```
newCost = oldCost（不变）
newShares = oldShares - txShares
newPrice = txPrice
newMarketValue = newShares × newPrice
```

**第一笔买入**（oldShares = 0）:

```
newCost = txPrice（成交价即为初始成本价）
```

### D6: 盈亏计算公式变更

**旧公式**: `pnl = marketValue - cost`（cost 是总成本）
**新公式**: `totalCost = cost × shares; pnl = marketValue - totalCost`

影响位置：HoldingRow、asset-allocation API、discipline-table 等所有计算盈亏的地方。

### D7: 市场指数配置架构

保持 `market-config.ts` 的 isomorphic 设计（客户端/服务端共用），将 `yahoo` 字段改为 `source`（数据源标识）+ `sourceSymbol`（对应数据源的符号），不支持的指数 source 设为 `null`。

```ts
export const INDEX_CONFIG = [
  // Stooq 数据源
  {
    source: "stooq",
    sourceSymbol: "^spx",
    name: "S&P 500",
    tradingView: "FOREXCOM:SPXUSD",
    group: "🇺🇸 美股",
  },
  {
    source: "stooq",
    sourceSymbol: "^ndq",
    name: "纳斯达克100",
    tradingView: "NASDAQ:NDX",
    group: "🇺🇸 美股",
  },
  // Yahoo 数据源
  {
    source: "yahoo",
    sourceSymbol: "000300.SS",
    name: "沪深300",
    tradingView: "SSE:000300",
    group: "🇨🇳 A股",
  },
  {
    source: "yahoo",
    sourceSymbol: "^HSTECH",
    name: "恒生科技",
    tradingView: "TVC:HSTECH",
    group: "🇭🇰 港股",
  },
  // 无可用源
  {
    source: null,
    sourceSymbol: null,
    name: "东证指数",
    tradingView: "TSE:TOPIX",
    group: "🇯🇵 日股",
  },
  // ...
];
```

## Risks / Trade-offs

- **[Stooq 无 SLA]** → 免费服务无保障，但有兜底机制（失败时显示 `--`），后续可加 DB 缓存层
- **[Yahoo 服务器端不稳定]** → A 股/港股数据依赖 Yahoo 在服务器端的可用性，失败时同样兜底显示 `--`，不影响其他指数
- **[数据迁移风险]** → `cost / shares` 可能因 shares=0 导致除零 → 迁移脚本加 `WHERE shares > 0` 条件
- **[拉取失败安全]** → 自动报价拉取失败时不修改 price/marketValue，确保不会因数据源异常导致错误数据
- **[Stooq 并发限制]** → 个股报价逐个请求而非并发，避免被限流，但会增加总耗时 → 可接受（个人工具，持仓数量有限）
- **[ticker 格式依赖用户输入]** → 用户可能填错格式 → UI 提示 + 拉取失败时返回 failed 列表

## Migration Plan

1. 数据迁移脚本：将 shares 模式持仓的 `cost` 从总成本转为平均每股成本
   ```sql
   UPDATE holdings SET cost = cost / shares WHERE shares > 0 AND valuationMode = 'shares';
   ```
2. 部署新代码（交易逻辑、盈亏计算、市场数据源同步更新）
3. 回滚策略：反向迁移 `cost = cost × shares`，恢复旧代码

## Open Questions

- 无（所有关键决策已在 explore 阶段确认）
