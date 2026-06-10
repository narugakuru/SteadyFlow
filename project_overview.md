# InvestManage 项目概览（简版）

> 本文件用于多终端协作快速同步状态。历史完整版本见 `docs/project_overview.archive.md`。

## 项目定位

个人投资组合管理 Web 工具，替代 Excel 管理多平台资产，覆盖总览、洞察、账户、持仓、交易/活动、净值与纪律提醒。

## 当前状态（2026-06-10）

- 阶段：多用户平台化版本已落地（Auth.js + 用户隔离 + 管理后台）。
- 运行模式：`DB_TYPE=sqlite`（本地）或 `DB_TYPE=postgres`（Vercel + Neon）。
- 核心页面已调整为左侧边栏应用外壳：总览、洞察、账户、活动、净值、管理（admin only）与设置入口；登录/注册不渲染应用外壳。
- 独立“市场”和“股价更新”页面已下线，直接访问 `/market` 与 `/batch-update` 会重定向到总览；旧市场聚合 API 已移除，不再为市场页读取外部数据；报价 API、Dashboard 手动刷新、静默刷新与 Cron 刷新保留。
- 净值页已升级为独立列表/图表读取：历史清单默认每页 `30` 条，图表走固定 `range -> grain` 聚合接口（`7d/30d/90d -> day`，`1y -> week`，`3y/all -> month`），总览与净值图表默认 `30d`。
- 客户端缓存架构已接入：全站采用 Query Cache + IndexedDB 持久化（缓存优先展示，默认 `staleTime=60s` 条件后台刷新，`persist=3d`；净值 `list/chart` 例外统一为 `60m`）。
- 自动报价路由已升级：美股默认走 Yahoo Finance（yahoo-finance2，`quote` + `quoteSummary` 兜底）并以用户个人 EODHD key 兜底；港/A/北交所默认走腾讯简易行情接口，EODHD 次级回退，Twelve Data 最低权重可选备份；用户只能使用自己在设置中保存的报价供应商密钥，系统不再使用全局 `EODHD_API_KEY` 回退；EODHD 回退按最多 10 个 symbol 一组使用 realtime 批量请求，Stooq 适配已移除。
- 已提供参数化投资组合 JSON 导出接口（`/api/export/portfolio?detail=full|decision`）：设置面板可导出全部数据，Dashboard 资产配置纪律区可导出精简决策快照。
- 已落地“每日 Cron 保底 + Dashboard 静默兜底”的股价刷新策略，并在总资产卡片显示最近股价同步时间。
- 净值快照持久化已瘦身：新写入 `netvalue.dataJson` 仅保留 `allocation + rates`；历史旧记录通过运行时维护与脚本回填兼容清理，SQLite 与 PostgreSQL 双模式均覆盖。
- OpenSpec 流程在用：变更通过 `openspec/changes` 管理；功能变动已同步到 `openspec/specs`。

## 技术栈（摘要）

- 前端：Next.js 16 (App Router)、React 19、TypeScript、Tailwind CSS 4、shadcn/ui（主按钮默认样式由共享 Button 组件 + 全局 CSS 变量统一维护，基准为 Dashboard“更新股价”按钮）
- 客户端数据层：TanStack Query + Persist Client + Async Storage Persister + IndexedDB (`idb-keyval`)
- 后端：Next.js Route Handlers、Drizzle ORM
- 数据库：SQLite (`better-sqlite3`) / PostgreSQL (Neon serverless)
- 认证：Auth.js v5 (`next-auth@beta`) + Credentials + GitHub OAuth

## 目录结构（摘要）

```text
src/
  app/          # 页面与 API 路由
  components/   # UI 与业务组件
  db/           # schema、连接、迁移启动与 seed
  lib/          # 分层库代码（含 lib/cache、lib/auth、lib/services、lib/utils、lib/visualization、lib/data-source）
docs/           # 运维与说明文档
openspec/       # 需求规格与变更流程

```

## 数据模型（核心表）

- 认证与用户：`users`, `authAccounts`, `sessions`, `verificationTokens`
- 投资域：`accounts`（含原始资金 `principal`、累计了结盈亏 `realizedPnl` 与账户默认排序 `sortOrder`）, `holdings`, `transactions`（含费用扣除 `fee` 与副作用 delta）, `assetClasses`
- 指标与辅助：`exchangeRates`, `netvalue`, `disciplineNotes`, `settings`

## 关键文档入口

- 项目介绍与部署：`README.md`
- 数据库迁移手册：`docs/drizzle-operations-guide.md`
- OAuth 配置：`docs/github-oauth-setup.md`
- 历史完整概览：`docs/project_overview.archive.md`

## 当前待改进项（摘要）

- P2：历史收益率追踪，交易将持仓盈亏转为了结盈亏
- P2：外部 agent 认证（个人 token / 签名链接）与更细粒度导出授权
- P3：净值历史增强、可设置主要币种
- P3：CSV 导出与更多导出视图/字段筛选
- PO：新增信息：单只标的的历史最高净值，距离历史最高回撤了多少/目前创新高。

---

## 进展日志

进展日志按照**新到旧（最新在前）**的顺序排版，且描述适当精简。

- [2026-06-10] 新增账户原始资金与费用台账：账户可设置 `principal`，入金/出金自动增减本金，账户展开摘要新增累计盈亏金额/比例；交易新增费用扣除 `fee` 类型并计入 realizedPnl，交易写入记录现金/本金/持仓 delta，删除交易可按 delta 回滚副作用；SQLite/PG 均生成迁移，历史账户本金迁移为当前现金余额。同步更新 `account-principal-ledger`、`account-management`、`transaction-management`、`realized-pnl-ledger` 与 `dashboard` 主 spec。
- [2026-06-10] 统一账户页展开持仓表与 Dashboard 纪律表标的数据表：AccountHoldingTable 改为同款六列单行布局，标的名称/代码/账户标签同行展示，数值列右对齐并向右聚集；账户持仓表头支持降序、升序、默认三态排序且仅作用于当前账户明细。同步更新 `account-management` 主 spec。
- [2026-06-10] 微调 Dashboard 纪律表移动端持仓卡片与详情侧栏：移动端标的卡片明细首行改为左侧现价、右侧盈亏；双端点击标的打开的持仓详情 Drawer 关闭入口改为大号红色 X。同步更新 `dashboard` 与 `mobile-responsive` 主 spec。
- [2026-06-10] 纠偏 Dashboard 纪律表桌面布局：资产类别汇总条改为大行高两行结构，左侧显示大字类别、中间加大进度条、右侧显示大字市值与次行盈亏；展开标的行保持单行，股票名称/代码/账户标签同行展示，数值列右对齐并向右聚集。同步更新 `dashboard` 主 spec。
- [2026-06-10] 微调总览纪律表与账户页：账户展开详情恢复“编辑账户”入口；Dashboard 纪律表删除顶层表头，桌面展开明细改为六列持仓表，移动端展开明细恢复独立卡片布局并与桌面表格渲染分离。同步更新 `dashboard`、`account-management` 与 `mobile-responsive` 主 spec。
- [2026-06-09] 重构总览纪律表与账户页：纪律表桌面端简化为“资产类别 / 参考指标 / 市值 / 持仓盈亏”四列并移除状态操作列，标的点击进入详情 Drawer；账户页改为无表头极简账户列表，默认按折算总价值降序，展开后使用专用 AccountHoldingTable 展示单行持仓明细。同步更新 `dashboard`、`account-management` 与 `mobile-responsive` 主 spec。
- [2026-06-09] 重构共享持仓信息条：Dashboard 资产配置纪律表与账户页持仓明细统一改为桌面单行数据网格、移动端高密度信息卡片；买入/卖出/编辑收纳进 `...` 菜单，账户页删除继续保留独立垃圾桶入口。同步更新 `dashboard`、`account-management` 与 `mobile-responsive` 主 spec。
- [2026-06-09] 修复 EODHD 报价凭证安全边界：自动报价只读取当前用户设置中的 `quote_api.eodhd_key`，删除部署环境 `EODHD_API_KEY` 全局回退能力，并在设置文案、env 示例与主 specs 中明确用户只能使用自己设置的供应商密钥。
- [2026-06-09] 调整净值页总资产走势图：由纯绿色折线改为与总览一致的绿色渐变填充面积图，保留隐藏 Y 轴、无常驻数据点与 Tooltip 读数能力。同步更新 `visualization-charts` 主 spec。
- [2026-06-09] 优化 Yahoo/EODHD 报价兜底：Yahoo Finance 封装新增 `quoteSummary(price)` 内部兜底，减少偶发 `quote()` 失败后直接消耗 EODHD；EODHD 回退改为最多 10 个 symbol 一组走 realtime 批量请求，少量 symbol 可单次 HTTP 返回多只价格。同步更新主 specs。
- [2026-06-09] 调整美股自动报价数据源：移除 Stooq 适配与持仓报价路由，`.US` 改为 Yahoo Finance 优先、EODHD 回退；删除旧 `/api/market` 市场聚合入口及 Stooq/CBOE 市场读取模块，独立市场页不再触发外部市场数据读取。同步更新主 specs 与 `openspec/project.md`。
- [2026-06-09] 完成 `add-chart-range-persistence-and-netvalue-cards` 实装：总览/净值图表新增 `7D` 范围并默认 `30D`，总览范围选择持久化到本地；净值页两个图表改为浅色卡片风格，隐藏 Y 轴/轴线并移除总资产走势明显数据点。同步更新主 specs。
- [2026-06-09] 继续微调 `refactor-wealthfolio-style-ui` 图表配色：洞察占比图切换为更清透明亮的组合色，持仓热力图改为柔和红/绿三档强度；总览资产曲线仅加深绿色线条与填充，明确不加入收益 0 水平线。同步更新 OpenSpec change 与主 specs。
- [2026-06-08] 调整 `refactor-wealthfolio-style-ui` 配色策略：确认 Wealthfolio 仅作为布局/信息层级参考，应用外壳、总览和洞察页面回退为原有白色浅色主题与既有业务配色，仅保留绿色资产曲线与盈亏语义色。同步修正 change 设计/任务说明与主 specs。
- [2026-06-08] 完成 `refactor-wealthfolio-style-ui` 实装：全站业务页切换为左侧边栏 + 右主界面应用外壳，新增 `/insights` 洞察页与 `/api/insights` 当前快照读模型；总览改为绿色填充资产曲线 + 当前账户总盈亏快照 + 资产配置纪律 + 再平衡建议，Dashboard 默认移除资产分布饼图；`/market` 与 `/batch-update` 改为重定向到总览，报价 API/静默刷新/Cron 保留。同步更新 OpenSpec 主 specs 与 `openspec/project.md`。
- [2026-06-08] OpenSpec：新增 `refactor-wealthfolio-style-ui` 变更工件（proposal/design/specs/tasks），明确 Wealthfolio 风格 UI 重构范围：左侧边栏应用外壳、新增洞察页、总览改用资产曲线与纪律/再平衡布局、市场页与股价更新页下线，历史盈亏曲线暂缓。
- [2026-06-08] 股价更新范围收紧为当前仍持有的 shares 标的：`POST /api/holdings/fetch-prices` 仅对 `shares > 0` 的 shares 模式持仓请求外部报价，已清仓股票返回跳过且不更新 price/marketValue；Dashboard、批量更新页、静默刷新与 Cron 统一复用该口径。同步更新 `auto-quote-fetch` 与 `batch-update` 主 spec。
- [2026-04-18] Dashboard 货币下拉升级为全局本地持久化显示货币：主页切换后账户页与交易页金额同步按默认/USD/CNY/HKD 展示；账户页新增“显示未持仓标的”开关，默认隐藏零市值持仓并通过现有持仓接口按需显示。同步更新 `dashboard`、`account-management`、`transaction-management` 主 spec。
- [2026-03-27] Dashboard 资产配置纪律表新增类别内三态排序：展开明细支持按金额/持仓盈亏进行 `降序 -> 升序 -> 默认` 循环，排序比较统一使用折算后的同一货币基准且不打乱资产类别顺序；桌面端新增表头高亮箭头，移动端新增 sticky 排序辅助栏，排序偏好持久化到本地。同步更新 `dashboard` 与 `mobile-responsive` 主 spec。
- [2026-03-27] OpenSpec：新增 `add-discipline-table-sorting-controls` 变更工件（proposal/design/specs/tasks），明确 Dashboard 纪律表支持类别内金额/持仓盈亏三态排序、统一货币比较、本地持久化与移动端 sticky 排序辅助栏。
- [2026-03-27] 账户页新增账户默认排序与表头三态排序：支持通过排序按钮拖拽调整账户默认顺序并持久化；“总价值 / 持仓盈亏 / 现金 / 持仓数”支持大到小、小到大、默认顺序三态切换，移动端同步提供排序按钮。同步更新 `account-management` 主 spec 与 `openspec/project.md`。
- [2026-03-27] OpenSpec：新增 `add-account-sorting-controls` 变更工件（proposal/design/specs/tasks），明确账户页支持账户默认排序按钮，以及“总价值 / 持仓盈亏 / 现金 / 持仓数”表头三态排序。
- [2026-03-25] 继续收紧 Dashboard 资产分布图 legend 尺寸：图例文字与色块统一缩小为紧凑尺寸，减少图下注释与 legend 的视觉跳跃。同步更新 `portfolio-chart` 主 spec。
- [2026-03-25] 调整 Dashboard 资产分布图标签展示：外环类别/标的标签缩小到与图下注释一致的紧凑字号；按标的视角下 legend 中多个“XXX账户 现金”合并为单个“现金”，但图表与 Tooltip 仍保留账户级现金切片。同步更新 `portfolio-chart` 主 spec。
- [2026-03-25] Dashboard 新增临时货币视图与纪律区快捷交易按钮：总资产/再平衡可切换默认或账户币种展示；资产配置纪律表类别盈亏补充收益率，展开明细与账户页外币持仓默认仅显示原币金额；资产分布图百分比统一保留两位小数。同步更新 `asset-allocation`、`dashboard`、`account-management`、`rebalance-suggestion`、`transaction-management`、`portfolio-chart`、`visualization-charts` 主 spec。
- [2026-03-25] 纪律投资笔记弹窗移动端继续压缩底部便签列表：列表默认最多显示 2 条记录并缩小卡片尺寸，把更多高度让给正文；顶部状态提示文案统一改为“自动保存”；修复移动端经典句子区与正文挤压重叠，并同步收紧 quote 字号与边距。同步更新 `discipline-notes` 主 spec。
- [2026-03-25] 资产配置纪律零市值标的过滤前移到数据库查询阶段：新增纪律专用持仓查询口径，统一兼容 amount/shares 两种市值判定；Dashboard 展开明细与持仓排序弹窗均不再返回零市值标的，纪律排序保存仅校验当前可见持仓全集。同步更新 `asset-allocation` 与 `discipline-overview-sorting` 主 spec。
- [2026-03-25] 调整纪律投资笔记弹窗布局：PC 端移除主编辑区冗余说明标签、将经典句子下沉到底部并改为本地随机展示，删除操作改为红色垃圾桶图标；移动端改为上方标题/正文/句子、下方便签列表。同步更新 `discipline-notes` 主 spec，并将纪律笔记接口中的 `quote` 降为兼容字段。
- [2026-03-22] 统一全站业务页面与顶部导航的桌面容器宽度：新增共享 `PageContainer`（`max-w-5xl`），总览/市场/账户/交易/净值/股价更新/管理页统一复用，消除市场页与其他页面宽度不一致。同步更新 `navigation-layout` 主 spec 与 `openspec/project.md`。
- [2026-03-22] 完成 `optimize-netvalue-page-query-and-storage` 实装：净值页拆为 `/api/netvalue/list` 分页接口与 `/api/netvalue/chart` 固定区间聚合接口，历史清单默认每页 30 条；净值客户端缓存拆为 `netvalue-list/netvalue-chart` 且 staleTime 统一提升到 60 分钟；新写入 `netvalue.dataJson` 精简为 `allocation + rates`，并补充 SQLite/PG 双库运行时回填、手动回填脚本与 Vercel 部署期 PostgreSQL 自动迁移/回填说明。同步更新 `daily-netvalue`、`visualization-charts`、`client-cache-layer` 主 spec 与运维文档。
- [2026-03-22] OpenSpec：新增 `optimize-netvalue-page-query-and-storage` 变更工件（proposal/design/specs/tasks），明确净值页列表分页默认 30 条、图表改为独立 `range + grain` 聚合接口、净值本地缓存拆分为 list/chart 且 staleTime 提升到 60 分钟，以及 `netvalue.dataJson` 精简与历史回填方案。
- [2026-03-22] 完成 `refresh-market-page-vix-and-index-data` 实装：市场页移除内嵌 TradingView 图表，改为顶部 VIX 日线图（CBOE 历史 CSV）+ 单态区间说明；指数表数据源切换为 Stooq/Tencent 聚合；新增全球资产历史高点回撤列表。同步更新 `market-overview`、`market-chart-widget`、`market-ath-drawdown` 主 spec 与 `openspec/project.md`，并补充市场数据计算测试。
- [2026-03-21] 完成 `fix-note-dialog-and-quote-fx-sync` 实装：全局投资笔记弹窗改为桌面固定大尺寸/移动端全屏布局，正文与便签列表各自内部滚动，移除显式保存按钮并改为失焦自动保存；`POST /api/holdings/fetch-prices` 及其静默/Cron 复用链路显式联动汇率刷新，并在汇率实际更新时补记当日净值。同步更新 `discipline-notes`、`auto-quote-fetch`、`exchange-rate` 主 spec，并新增草稿/汇率缓存回归脚本。
- [2026-03-21] OpenSpec：新增 `refresh-market-page-vix-and-index-data` 变更工件（proposal/design/specs/tasks），明确市场页移除内嵌 TradingView 图表、改用 Stooq + Tencent 聚合指数数据、顶部 VIX 免费图表与简化说明，以及 VIX 下方的历史高点回撤列表。
- [2026-03-21] OpenSpec：新增 `fix-note-dialog-and-quote-fx-sync` 变更工件（proposal/design/specs/tasks），明确投资笔记弹窗在阅读/编辑模式下保持统一大尺寸、正文内部滚动、失焦自动保存，以及手动/静默/Cron 股价同步联动汇率刷新。
- [2026-03-10] 修复纪律排序弹窗移动端触摸拖拽：持仓排序与资产类别排序统一改为句柄级 `touch-action` 接管、鼠标/触屏分离传感器与纵向拖拽约束，避免与底部弹窗滚动冲突；同步补充 `discipline-overview-sorting`、`mobile-responsive` 主 spec 与回归测试。
- [2026-03-10] Dashboard 资产配置纪律区导出按钮改为主按钮样式并更名为“导出持仓”，与“更新股价”保持同一黑底白字配色。同步更新 `dashboard` 主 spec。
- [2026-03-10] 统一全局主按钮配色到 Dashboard“更新股价”样式：共享 `Button` 默认主按钮改为黑底白字、深灰 hover、轻微阴影与按压反馈；Dashboard/账户页/批量更新页的“更新股价”入口统一复用该来源。同步更新 `navigation-layout` 主 spec 与 `openspec/project.md`。
- [2026-03-10] 完成 `add-portfolio-export-and-silent-quote-refresh` 实装：新增 `GET /api/export/portfolio` 完整 JSON 快照导出与 Dashboard 导出按钮；股价同步链路新增 `quote_sync.*` 元数据、支持 `manual/silent-client/cron` 触发来源；首页总资产卡增加最近股价更新时间，并在数据过期时静默兜底刷新。同步更新 `portfolio-export`、`quote-sync-metadata`、`auto-quote-fetch`、`dashboard` 主 spec。
- [2026-03-10] 导出能力微调：`/api/export/portfolio` 改为通过 `detail=full|decision` 切换详细度；完整导出入口移动到设置面板并更名“导出全部数据”；Dashboard 资产配置纪律区新增“仅导出持仓”按钮；两种导出都过滤零市值持仓。同步更新 `portfolio-export` 与 `dashboard` 主 spec。
- [2026-03-05] 资产配置纪律移动端视图微调：将“持仓盈亏”移动到金额行右侧（小字号），将状态条固定到第三行右对齐；同时加宽移动端/桌面端排序弹窗的拖拽命中区域（持仓排序与资产类别排序），并约束句柄不越界。同步更新 `mobile-responsive`、`discipline-overview-sorting`、`asset-allocation` 主 spec。
- [2026-03-05] 完成 `optimize-allocation-mobile-layout-and-dnd` 实装：资产配置纪律展开明细默认隐藏金额为 0 的标的并按“0 金额末位”规则排序；移动端资产类别卡片重排为三行堆叠（标题+进度、核心金额、盈亏/状态+调仓）；修复移动端持仓拖拽释放回弹，改为本地即时落序、保存失败自动回滚并提示。同步更新 `asset-allocation`、`mobile-responsive`、`discipline-overview-sorting` 主 spec，并新增回归脚本测试（`scripts/tests/*.test.mjs`）。
- [2026-03-04] 交易记录页新增“盈亏”列（位于手续费后）：读取每笔卖出交易的 `realizedPnl` 展示，按全局 `colorMode`（A股正红负绿 / 美股正绿负红）着色；无盈亏口径的交易显示 `--`。同步更新 `transaction-management` 主 spec。
- [2026-03-04] 修复交易弹窗与了结盈亏口径：交易表单在切换买入/卖出/股息时不再清空已选账户/持仓，买卖自动带出持仓价格；交易写入链路新增股息 `realizedPnl=amount-fee`（受 `affectCash` 控制）并增量计入账户累计。同步更新 `transaction-management` 与 `realized-pnl-ledger` 主 spec，并新增 change `fix-transaction-dialog-dividend-pnl` 工件。
- [2026-03-04] 修复 `realized-pnl-tracking` 在 `DB_TYPE=postgres` 下的交易写入报错：针对 Neon HTTP 驱动不支持 `db.transaction` 的限制，将交易新增/删除链路改为 PG 使用 `db.batch` 原子批处理、SQLite 保持事务，避免卖出交易 500。
- [2026-03-04] 完成 `realized-pnl-tracking` 实装：为账户与交易新增了结盈亏字段（原币种），交易新增/删除改为事务执行并按 `sell + affectHolding=true` 增量维护累计了结盈亏；Dashboard 总资产区新增“账户总盈亏 / 持仓盈亏 / 了结盈亏”三项展示。
- [2026-03-04] OpenSpec：新增 `realized-pnl-tracking` 变更草案（proposal/design/specs/tasks），明确了结盈亏双层存储、交易新增/删除事务化、`affectHolding=false` 排除规则与 Dashboard 三项收益拆解展示口径。
- [2026-03-03] 完成 `daily-cron-prequote-netvalue-batch` 实装：`/api/cron/netvalue` 升级为按用户“先价后值”宽松模式，新增 `quoteSyncStatus` 与失败摘要；接入批次大小/时间预算控制和 `cron.netvalue.cursor` 游标续跑；并将股价同步逻辑抽取为可复用服务供 cron 直接调用。
- [2026-03-03] OpenSpec 补同步（无 change 提案）：将“新用户默认资产目标占比调整为 40/10/20/30”补充到 `asset-allocation` 主 spec。
- [2026-03-03] OpenSpec 补同步（无 change 提案）：将“会话初始化阶段视为加载中，避免误报失败闪烁”补充到 `client-cache-layer` 主 spec。
- [2026-03-03] OpenSpec 补同步（无 change 提案）：将“全站浏览器标签页标题统一为 SteadyFlow”补充到 `navigation-layout` 主 spec。
- [2026-03-03] OpenSpec 补同步（无 change 提案）：将免费版 Cron 的“每日固定一次、扫描全量用户记录净值”行为补充到 `daily-netvalue` 主 spec（替换旧的本地 03:00 命中窗口描述）。
- [2026-03-03] OpenSpec 补同步（无 change 提案）：将“净值历史表金额+百分比双行展示（固定两位小数）”补充到 `daily-netvalue` 主 spec。
- [2026-03-03] OpenSpec 同步：将 `daily-cron-prequote-netvalue-batch` 的 delta specs 合并到主 specs，更新 `daily-netvalue` 并新增 `cron-batch-execution` 能力规范（先价后值、宽松模式、分批续跑与时间预算约束）。
- [2026-03-03] Next.js 16 约定迁移：将 `src/middleware.ts` 重命名为 `src/proxy.ts`，并将导出函数由 `middleware` 调整为 `proxy`，消除运行时 deprecation 提示。
- [2026-03-03] 修复页面首屏误报“加载失败”闪烁：将 Dashboard/Accounts/Admin/Transactions/Netvalue/BatchUpdate/Market 的加载判定纳入 `sessionStatus === "loading"`，避免会话未就绪时把“暂无数据”错误渲染为失败状态。
- [2026-03-03] 历史质量问题修复：清理 `admin` API 中显式 `any`、修复 `useTriFieldLinked/useFetch` 的 React Hooks lint 违规，并为 Node 脚本入口补齐 CommonJS lint 规则豁免；`lint` 与 `typecheck` 均通过（仅剩 `navbar` 的 `<img>` 优化 warning）。
- [2026-03-03] `src/lib` 继续细分：新增 `lib/auth`、`lib/services`、`lib/utils`，完成认证/服务/工具与类型文件迁移，并全量更新业务代码导入路径。
- [2026-03-03] `src/lib` 目录重构：新增 `lib/visualization`（图表与展示配色）与 `lib/data-source`（行情/汇率供应商与市场数据聚合），并完成全量导入路径迁移。
- [2026-03-03] 实现 `global-local-cache-swr`：接入 TanStack Query + IndexedDB 持久化与统一 `policy.ts`；完成 Dashboard/Accounts/Transactions/BatchUpdate/Netvalue/Market/Admin 页面缓存优先读取迁移；新增后台刷新失败通知条、低侵入数据新鲜度展示、登出与 401 缓存清理、跨标签页失效同步。
- [2026-03-03] 品牌文案统一：浏览器标签页全局标题由“资产组合管理”改为 `SteadyFlow`（`src/app/layout.tsx` metadata.title）。
- [2026-03-03] OpenSpec：新增 `global-local-cache-swr` 变更工件（proposal/design/specs/tasks），确定全站本地缓存架构方向（`staleTime=60s`、`persist=3d`、缓存优先展示与条件异步刷新、刷新失败通知条）。
- [2026-03-03] 自动报价路由重构：`/api/holdings/fetch-prices` 亚洲市场改为 Tencent 主、EODHD 次、Twelve Data 最低权重备份；新增 `.BJ`（北交所）映射；移除 Twelve Data 历史 65s 批次等待，供应商请求链路不再使用固定秒级延时。
- [2026-03-03] 自动化与调度：上线 `Vercel Cron` 每日自动记录净值；新增 `netvalue.timezone` 用户设置，实现按时区自动 upsert。
- [2026-03-03] 股价引擎增强：集成 Twelve Data 与 EODHD 供应商，支持港/A股多候选匹配及美股映射（如 BRK.B）；新增股价更新明细弹窗，透传供应商原始错误。
- [2026-03-03] 交互优化：Dashboard 移除手动记录净值按钮；优化资产偏离图移动端尺寸；统一“更新股价”按钮样式与加载反馈。
- [2026-02-28] 可视化排序：实现资产类别与持仓的拖拽排序（Drag-and-Drop）；解耦“账户视图”与“纪律总览”的独立排序权重。
- [2026-02-28] 移动端适配 (OpenSpec)：统一 Dialog 高度、44x44 点击热区；重构批量更新页为单列布局；增强持仓备注（Memo）图标可见性。
- [2026-02-28] 功能细节：持仓编辑支持同时修改成本与市值；重构纪律笔记为 Markdown 模式（预览/编辑切换）；规范交易页横向表格列顺序。
- [2026-02-27] 完成移动端适配、市场页重构、纪律笔记与持仓 Memo。
- [2026-02-26] 完成双数据库（SQLite/PG）支持与多用户 Auth.js 认证体系。
- [2026-02-25] 完成交易系统重构；新增 Windows 离线打包流程。
- [2026-02-24] 完成 MVP 版本（账户/持仓/资产配置/汇率/每日净值）。
