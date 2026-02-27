## Context

当前市场概览页使用 `yahoo-finance2` npm 包获取指数行情，该 API 已完全失效。持仓股价只能手动更新。`cost` 字段在 shares 模式下存储总成本金额，语义不够清晰。

现有架构：前端 → `/api/market` → `yahoo-finance2` → Yahoo Finance（已挂）。持仓价格更新：纯手动（batch-update 页面或编辑对话框）。

## Goals / Non-Goals

**Goals:**

- 用 Stooq 免费 CSV API 替换 Yahoo Finance，恢复市场指数数据
- 为有 Stooq 格式 ticker 的持仓提供自动报价能力
- 将 shares 模式的 `cost` 语义从"总成本"改为"平均每股成本"，使成本价/现价分离更清晰
- 在 batch-update 和 Dashboard 提供一键获取报价入口

**Non-Goals:**

- 不实现 A 股/港股个股报价（Stooq 不支持，留扩展空间）
- 不实现 cron 定时拉取或 DB 缓存层（后续优化）
- 不改变 amount 模式的任何逻辑
- 不新增数据库字段（复用现有 cost/shares/price/marketValue）

## Decisions

### D1: 数据源选择 Stooq CSV API

**选择**: Stooq（`https://stooq.com/q/l/?s=<symbol>&f=sd2t2ohlcv&h&e=csv`）

**理由**: 完全免费、无需 API Key、纯 HTTP CSV 响应、延迟 ≤ 24h（收盘后更新）、接口稳定。

**替代方案**:

- Alpha Vantage: 需要 API Key，免费版限 25 次/天
- 东方财富/新浪: 非官方接口，不稳定
- Yahoo Finance v2: 已失效

**覆盖范围**:
| Stooq 符号 | 指数 | 状态 |
|---|---|---|
| `^spx` | S&P 500 | ✅ |
| `^ndq` | 纳斯达克100 | ✅ |
| `^dji` | 道琼斯 | ✅ |
| `^nkx` | 日经225 | ✅ |
| `^vix` | VIX | ✅ |
| `^hsi` | 恒生指数 | ✅ |
| A股 4 个 + 恒生科技 + 东证 | — | ❌ 不支持 |

### D2: 不新增 DB 字段，复用 cost 语义变更

**选择**: `cost` 字段在 shares 模式下语义从"总成本"改为"平均每股成本"，不改字段名。

**理由**:

- 零 schema 变更，amount 模式不受影响
- 只需数据迁移：`cost = cost / shares`（shares > 0 时）
- 代码中通过注释明确区分两种模式下的含义

**替代方案**:

- 新增 `avgCost` 字段: 更清晰但需要 schema 迁移，且 amount 模式下该字段无意义

### D3: Stooq 个股 ticker 格式约定

**选择**: 用户在 ticker 字段直接填写 Stooq 格式（如 `aapl.us`、`7203.jp`），系统通过后缀识别可自动拉取的持仓。

**格式规则**:

- `*.us` → 美股
- `*.jp` → 日股
- 无后缀或其他后缀 → 跳过自动拉取，继续手动更新

**理由**: 零 schema 改动，向后兼容，用户只需在新建/编辑时按提示填写。

### D4: 自动报价 API 设计

**选择**: 新增 `POST /api/holdings/fetch-prices` 端点。

**流程**:

```
POST /api/holdings/fetch-prices
  → 查询当前用户所有 shares 模式持仓
  → 筛选 ticker 匹配 *.us / *.jp 的持仓
  → 批量请求 Stooq CSV（逐个请求，避免并发限制）
  → 解析 close 价格
  → 更新 price 和 marketValue（= shares × price）
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

保持 `market-config.ts` 的 isomorphic 设计（客户端/服务端共用），将 `yahoo` 字段改为 `stooq`，不支持的指数 `stooq` 设为 `null`。

```ts
export const INDEX_CONFIG = [
  { stooq: "^spx", name: "S&P 500", tradingView: "FOREXCOM:SPXUSD", group: "🇺🇸 美股" },
  { stooq: null, name: "沪深300", tradingView: "SSE:000300", group: "🇨🇳 A股" }, // 暂不支持
  // ...
];
```

## Risks / Trade-offs

- **[Stooq 无 SLA]** → 免费服务无保障，但有兜底机制（失败时显示 `--`），后续可加 DB 缓存层
- **[A 股/港股数据缺失]** → 暂时显示为无数据，TradingView 图表不受影响，留出扩展空间接入其他数据源
- **[数据迁移风险]** → `cost / shares` 可能因 shares=0 导致除零 → 迁移脚本加 `WHERE shares > 0` 条件
- **[Stooq 并发限制]** → 个股报价逐个请求而非并发，避免被限流，但会增加总耗时 → 可接受（个人工具，持仓数量有限）
- **[ticker 格式依赖用户输入]** → 用户可能填错格式 → UI 提示 + 拉取失败时返回 failed 列表

## Migration Plan

1. 数据迁移脚本：将 shares 模式持仓的 `cost` 从总成本转为平均每股成本
   ```sql
   UPDATE holdings SET cost = cost / shares WHERE shares > 0 AND valuationMode = 'shares';
   ```
2. 部署新代码（交易逻辑、盈亏计算、市场数据源同步更新）
3. 移除 `yahoo-finance2` 依赖
4. 回滚策略：反向迁移 `cost = cost × shares`，恢复旧代码

## Open Questions

- 无（所有关键决策已在 explore 阶段确认）
