# Wealthfolio 类投资组合管理系统技术架构方案

## 1. 项目背景

当前系统采用以下架构：

```text
Frontend (Next.js)
        ↓
Vercel Serverless API
        ↓
Neon PostgreSQL
```

在本地开发环境中，由于应用与数据库均部署在本机，接口响应时间通常低于 100ms，用户体验流畅。

然而在生产环境中，用户操作需要经过：

```text
Browser
↓
Vercel Function
↓
Neon PostgreSQL
↓
Response
```

整体响应时间通常达到：

- 平均：500ms ~ 1500ms
- 峰值：2000ms ~ 4000ms

导致用户在新增交易、编辑持仓、更新资产等操作时出现明显等待感。

因此需要设计一套更符合现代 SaaS 应用的架构方案，以提升用户体验。

---

# 2. 设计目标

## 功能目标

- 用户操作立即生效
- 数据最终一致
- 支持网络波动
- 支持离线缓存
- 支持未来移动端扩展

## 性能目标

| 指标         | 目标     |
| ------------ | -------- |
| 用户操作反馈 | <50ms    |
| 页面状态更新 | 实时     |
| 数据持久化   | 异步     |
| 数据同步失败 | 自动重试 |

---

# 3. 架构设计

## 总体架构

```text
┌──────────────────┐
│      React       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│     Zustand      │
│   Local State    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   IndexedDB      │
│ Local Database   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│   Sync Queue     │
│ Background Task  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Vercel API       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Neon PostgreSQL  │
└──────────────────┘
```

---

# 4. 核心思想

## Local First

系统优先操作本地状态。

用户的每一次修改：

```text
用户
↓
本地状态更新
↓
界面刷新
↓
后台同步数据库
```

而不是：

```text
用户
↓
数据库写入
↓
等待
↓
界面刷新
```

---

# 5. Optimistic Update

## 传统方案

```text
点击新增交易
↓
发送请求
↓
等待2秒
↓
数据库成功
↓
更新UI
```

体验较差。

---

## Optimistic Update方案

```text
点击新增交易
↓
立即更新UI
↓
后台提交数据库
↓
成功结束
```

用户感知延迟：

```text
≈ 0ms
```

---

## 示例流程

```typescript
const tx = createTransaction();

setTransactions((prev) => [tx, ...prev]);

syncToServer(tx);
```

如果同步失败：

```typescript
rollback();
```

或者：

```typescript
toast.error("同步失败");
```

---

# 6. IndexedDB 本地持久化

## 引入原因

如果用户刷新页面：

```text
Local State
↓
丢失
```

因此需要浏览器级数据库。

推荐：

```text
IndexedDB
```

存储内容：

- 用户资产
- 持仓记录
- 交易记录
- WatchList
- 用户配置

---

## 数据读取顺序

```text
页面加载
↓
IndexedDB
↓
立即展示数据
↓
后台同步最新数据
```

用户无需等待数据库响应。

---

# 7. 同步队列（Sync Queue）

## 问题

用户连续执行：

```text
新增交易
修改交易
删除交易
修改备注
```

如果全部立即同步：

```text
4 次 API 请求
```

---

## 方案

维护同步队列：

```typescript
[action1, action2, action3, action4];
```

后台定时同步：

```typescript
setInterval(sync, 5000);
```

或者：

```typescript
debounce(sync, 3000);
```

统一发送：

```typescript
POST / api / sync;
```

减少数据库压力。

---

# 8. 自动重试机制

同步失败时：

```text
Neon故障
网络异常
Vercel超时
```

不影响用户继续操作。

数据进入：

```text
Pending Queue
```

后台自动重试：

```text
30秒
↓
60秒
↓
120秒
↓
300秒
```

指数退避策略。

---

# 9. 数据一致性策略

采用：

```text
Eventual Consistency
（最终一致性）
```

原则：

- UI状态优先
- 本地数据优先
- 数据库作为最终存储

允许：

```text
本地领先数据库数秒
```

但最终保持一致。

---

# 10. 技术选型

## 状态管理

推荐：

```text
Zustand
```

原因：

- 轻量
- 学习成本低
- 与 Next.js 配合良好

---

## 数据缓存

推荐：

```text
TanStack Query
```

负责：

- 请求缓存
- 自动刷新
- 数据失效管理

---

## 本地数据库

推荐：

```text
IndexedDB
```

封装库：

```text
Dexie.js
```

原因：

- API友好
- TypeScript支持完善

---

## 数据同步

推荐：

```text
Custom Sync Engine
```

自行实现：

```text
Queue
+
Retry
+
Conflict Resolve
```

即可满足需求。

---

# 11. 未来扩展

未来可以增加：

## Redis缓存

```text
Upstash Redis
```

缓存：

- 用户资产汇总
- Dashboard统计
- 股票行情

减少数据库查询。

---

## 实时同步

后续可接入：

```text
WebSocket
```

实现：

```text
多设备同步
```

例如：

```text
手机新增交易
↓
电脑实时更新
```

---

# 12. 最终架构

```text
React
↓
Zustand
↓
IndexedDB
↓
Optimistic Update
↓
Sync Queue
↓
Vercel API
↓
Neon PostgreSQL
```

核心原则：

1. UI响应速度优先
2. 本地状态优先
3. 数据库负责持久化
4. 同步失败可重试
5. 保证最终一致性

通过该架构，即使 Neon 数据库响应时间达到 2~4 秒，用户仍然能够获得接近桌面应用的操作体验。

# 13. 资产快照设计

如果是我来做这个项目，我还会进一步加一个架构决策：

**不要把 Portfolio Snapshot（资产快照）实时算出来，而是预计算。**

很多财富管理系统慢，不是慢在交易记录写入，而是：

```
transactions
→ positions
→ pnl
→ allocation
→ dashboard
```

每次打开页面都重新聚合。

更好的方式是：

```
transactions （事实表）
        ↓
background job
        ↓
portfolio_snapshots （快照表）
```

Dashboard 直接查快照。

这样即使用户以后有：

- 1万笔交易
- 多账户
- 多币种
- 实时收益率

Neon 依然能保持很快的查询速度。

对于 Wealthfolio 这种产品，我会把 **Local First + Event Sourcing + Snapshot Table** 作为最终架构，而不仅仅是简单的 CRUD。这样后面接 AI 分析、投资报告、多设备同步时几乎不用推翻重构。
