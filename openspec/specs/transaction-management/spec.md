## Purpose

定义 transaction-management 能力的业务约束与验收标准，覆盖交易创建、费用扣除、副作用控制、删除回滚、筛选和列表展示。

## Requirements

### Requirement: 创建交易记录

系统 SHALL 允许已登录用户为自己的账户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)、费用扣除(fee)。创建交易前 MUST 验证目标账户属于当前用户。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。系统 MUST 为新交易存储现金、本金、持仓和 `realizedPnl` 的副作用 delta。

shares 模式买入副作用（affectHolding=true）：

- cost 按加权平均法重算：`newCost = (oldCost × oldShares + txPrice × txShares) / (oldShares + txShares)`
- shares += txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice
- holdingSharesDelta = txShares
- holdingCostDelta = txPrice × txShares

shares 模式卖出副作用（affectHolding=true）：

- cost 不变
- shares -= txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice
- holdingSharesDelta = -txShares
- holdingCostDelta = -(oldCost × txShares)

amount 模式买入副作用（affectHolding=true）：

- cost += amount
- marketValue += amount
- holdingCostDelta = amount
- holdingMarketValueDelta = amount

amount 模式卖出副作用（affectHolding=true）：

- costReduce = amount × cost / marketValue（按比例扣减）
- cost -= costReduce
- marketValue -= amount
- holdingCostDelta = -costReduce
- holdingMarketValueDelta = -amount

#### Scenario: shares 模式买入（加权平均成本）

- **WHEN** 已登录用户对 shares 模式持仓（cost=10, shares=100）创建买入交易，txShares=50, txPrice=12, affectHolding=true
- **THEN** newCost = (10×100 + 12×50) / 150 = 10.67, shares=150, price=12, marketValue=150×12=1800

#### Scenario: shares 模式首次买入

- **WHEN** 已登录用户对 shares 模式持仓（cost=0, shares=0）创建买入交易，txShares=100, txPrice=15, affectHolding=true
- **THEN** cost=15（成交价即初始成本价）, shares=100, price=15, marketValue=100×15=1500

#### Scenario: shares 模式卖出（成本不变）

- **WHEN** 已登录用户对 shares 模式持仓（cost=10.67, shares=150）创建卖出交易，txShares=50, txPrice=15, affectHolding=true
- **THEN** cost=10.67（不变）, shares=100, price=15, marketValue=100×15=1500

#### Scenario: 创建买入交易（amount模式）

- **WHEN** 已登录用户为自己账户中 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 创建费用扣除交易

- **WHEN** 已登录用户为自己的账户创建费用扣除交易，金额 100
- **THEN** 系统创建交易记录，account.cashBalance -= 100，account.realizedPnl -= 100，account.principal 不变

#### Scenario: 不能为他人账户创建交易

- **WHEN** 用户尝试为不属于自己的账户创建交易
- **THEN** 系统返回 404

### Requirement: 交易手续费

系统 SHALL 支持在交易中记录手续费，手续费从账户现金余额中扣除（受 affectCash 控制）。

#### Scenario: 买入含手续费

- **WHEN** 用户创建买入交易，金额 10000，手续费 15，affectCash=true
- **THEN** account.cashBalance -= 10015（金额+手续费）

#### Scenario: 卖出含手续费

- **WHEN** 用户创建卖出交易，金额 10000，手续费 15，affectCash=true
- **THEN** account.cashBalance += 9985（金额-手续费）

### Requirement: 卖出交易了结盈亏计算

系统 SHALL 在创建交易时为卖出、股息和费用扣除交易计算并存储 `realizedPnl`。买入交易的手续费 MUST 作为负的 `realizedPnl` 计入交易成本损耗。卖出交易仅当 `type=sell` 且 `affectHolding=true` 时参与卖出盈亏计算；股息交易仅当 `type=dividend` 且 `affectCash=true` 时参与计算，且 `realizedPnl = amount - fee`；费用扣除交易的 `realizedPnl = -amount`。手续费 MUST 计入该笔了结盈亏；其余交易 `realizedPnl` MUST 为 `0`。

#### Scenario: affectHolding=true 的卖出计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=true`
- **THEN** 系统计算并存储该笔交易 `realizedPnl`，并将手续费计入净收益

#### Scenario: affectHolding=false 的卖出不计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=false`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `0`

#### Scenario: affectCash=true 的股息计入了结盈亏

- **WHEN** 用户创建一笔股息交易，`type=dividend`、`amount=1000`、`fee=10` 且 `affectCash=true`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `990`

#### Scenario: affectCash=false 的股息不计入了结盈亏

- **WHEN** 用户创建一笔股息交易，`type=dividend` 且 `affectCash=false`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `0`

#### Scenario: 买入手续费计入费用损耗

- **WHEN** 用户创建一笔买入交易，金额 10000，手续费 10
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `-10`

#### Scenario: 费用扣除计入了结盈亏

- **WHEN** 用户创建一笔费用扣除交易，金额 100
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `-100`

### Requirement: 交易创建与删除使用事务

系统 MUST 对交易创建与删除使用数据库事务，保证交易记录、持仓/现金副作用（如开启）与账户累计了结盈亏更新的一致性。

#### Scenario: 创建交易时部分步骤失败

- **WHEN** 创建交易过程中任一子步骤失败
- **THEN** 系统回滚事务，不保留部分成功结果

#### Scenario: 删除交易时部分步骤失败

- **WHEN** 删除交易过程中任一子步骤失败
- **THEN** 系统回滚事务，交易记录与账户累计保持删除前状态

### Requirement: 交易副作用控制开关

系统 SHALL 提供两个独立的副作用控制开关：`affectCash`（影响账户现金，默认开启）和 `affectHolding`（影响持仓数据，默认开启）。买入/卖出交易 SHALL 显示两个开关；股息/存入/取出交易 SHALL 只显示"影响账户现金"开关；费用扣除交易 MUST 固定影响账户现金和 `realizedPnl`，不显示持仓选择器或持仓副作用开关。"影响账户现金"开关 SHALL 紧跟在账户选择器下方，"影响持仓数据"开关 SHALL 紧跟在持仓选择器下方。

#### Scenario: 录入已有持仓（只影响持仓不扣现金）

- **WHEN** 用户创建买入交易，金额 80000，开启"影响持仓数据"，关闭"影响账户现金"
- **THEN** 系统创建交易记录，holding.cost += 80000，holding.marketValue += 80000，但 account.cashBalance 不变

#### Scenario: 补录历史交易（都不影响）

- **WHEN** 用户创建买入交易，金额 5000，关闭"影响账户现金"，关闭"影响持仓数据"
- **THEN** 系统创建交易记录，但 holding 和 account 的数值字段均不变

#### Scenario: 正常买入交易（都影响）

- **WHEN** 用户创建买入交易，金额 10000，两个开关都开启（默认）
- **THEN** 系统创建交易记录，holding 数据更新，account.cashBalance -= 10000（加手续费）

#### Scenario: 只扣现金不更新持仓

- **WHEN** 用户创建买入交易，金额 10000，开启"影响账户现金"，关闭"影响持仓数据"
- **THEN** 系统创建交易记录，account.cashBalance -= 10000（加手续费），但 holding 数据不变

#### Scenario: 股息交易只显示现金开关

- **WHEN** 用户选择"股息"交易类型
- **THEN** 表单只显示"影响账户现金"开关，不显示"影响持仓数据"开关

#### Scenario: 存入/取出交易只显示现金开关

- **WHEN** 用户选择"现金存入"或"现金取出"交易类型
- **THEN** 表单只显示"影响账户现金"开关

#### Scenario: 费用扣除不显示持仓控制

- **WHEN** 用户选择"费用扣除"交易类型
- **THEN** 表单不显示持仓选择器和"影响持仓数据"开关

### Requirement: 交易弹窗切换保持上下文并自动填充价格

系统 SHALL 在交易弹窗中区分“通用入口”和“持仓快捷入口”两种默认行为。通用入口打开时，交易类型 MUST 默认选择 `buy`，且账户与持仓均保持未选择状态；从持仓快捷入口打开时，系统 SHALL 预填该持仓所属账户和持仓。对于 buy/sell 且选择 shares 模式持仓时，成交价输入框 SHALL 自动填充持仓记录价格（`holding.price`），并允许用户手动覆盖。交易弹窗中切换 `buy`、`sell`、`dividend` 时，若当前已有已选账户和持仓，系统 SHALL 保持该上下文不变。

#### Scenario: 通用入口默认买入且不预选账户持仓

- **WHEN** 用户从 Dashboard 纪律区或交易页的通用“新增交易”入口打开交易弹窗
- **THEN** 表单默认类型为“买入”，账户选择器与持仓选择器均保持为空，等待用户手动选择

#### Scenario: 切换类型时保持账户与持仓

- **WHEN** 用户从持仓快捷入口打开交易弹窗，默认已选账户 A、持仓 A，并切换买入/卖出/股息
- **THEN** 表单仍保持账户 A 与持仓 A，不要求重新选择

#### Scenario: 持仓选择后自动带出价格

- **WHEN** 用户在买入或卖出交易中选择 shares 模式持仓，且该持仓 `price=15.23`
- **THEN** 成交价输入框默认显示 `15.23`

#### Scenario: 账户切换仍清空持仓

- **WHEN** 用户手动将账户从 A 切换到 B
- **THEN** 系统清空持仓选择并要求重新选择 B 账户下的持仓

#### Scenario: 切换持仓时更新默认价格

- **WHEN** 用户在买入/卖出交易中将持仓从 A 切换到 B，且 B 持仓价格为 `7.8`
- **THEN** 成交价输入框自动更新为 `7.8`

### Requirement: 交易自定义时间

系统 SHALL 允许用户自定义交易时间，交易时间可以是过去的任意日期。

#### Scenario: 补录历史交易

- **WHEN** 用户创建交易，手动设置交易日期为 2025-01-15
- **THEN** 系统以 2025-01-15 作为交易日期存储

### Requirement: 删除交易记录

系统 SHALL 允许已登录用户删除自己的交易记录。删除交易 MUST 回滚该交易创建时记录的现金、本金、持仓和账户累计了结盈亏副作用 delta，并删除交易记录。删除过程 MUST 使用事务或原子批处理，任一步骤失败时 MUST 整体回滚。MUST 验证交易所属账户属于当前用户。若回滚会导致持仓 shares、成本或市值为非法负数，系统 MUST 拒绝删除。

#### Scenario: 删除入金交易回滚现金和本金

- **WHEN** 用户删除一笔入金交易，cashDelta=1000，principalDelta=1000
- **THEN** 系统删除该交易，并将账户现金和 principal 各减少 1000

#### Scenario: 删除费用交易回滚现金和了结盈亏

- **WHEN** 用户删除一笔费用交易，cashDelta=-100，realizedPnl=-100
- **THEN** 系统删除该交易，并将账户现金增加 100，账户累计 realizedPnl 增加 100

#### Scenario: 删除买入交易回滚持仓

- **WHEN** 用户删除一笔买入交易，且回滚后持仓数值仍合法
- **THEN** 系统按交易 delta 反向更新持仓 shares、成本和市值

#### Scenario: 不能删除他人交易

- **WHEN** 用户尝试删除不属于自己账户的交易记录
- **THEN** 系统返回 404

### Requirement: 交易不可编辑

系统 MUST NOT 允许编辑已创建的交易记录，只能删除后重新创建。

#### Scenario: 交易记录无编辑入口

- **WHEN** 用户查看交易记录列表
- **THEN** 每条交易只显示删除按钮，不显示编辑按钮

### Requirement: 交易记录列表

系统 SHALL 在交易页面展示当前用户的交易记录列表，按交易时间倒序排列。列表展示 SHALL 使用横向表格布局，列顺序固定为：账户、标的名称、操作类型（买入/卖出等）、股数、股价、金额、手续费、盈亏、日期。删除操作 SHALL 使用与账户页一致的小垃圾桶图标按钮样式。副作用状态 SHALL 继续显示为标签。费用扣除交易的操作类型 SHALL 显示为“费用扣除”，持仓列显示 `--`。

#### Scenario: 交易列表展示为横向表格

- **WHEN** 已登录用户打开交易页面
- **THEN** 系统按时间倒序展示当前用户的所有交易记录，表格列顺序为账户、标的名称、操作类型、股数、股价、金额、手续费、盈亏、日期，不显示其他用户的交易

#### Scenario: 删除按钮样式一致

- **WHEN** 用户在交易页面查看某条交易记录的删除操作
- **THEN** 删除按钮显示为与账户页一致的小垃圾桶图标按钮，而非大尺寸文本按钮

#### Scenario: 空交易列表

- **WHEN** 用户没有任何交易记录
- **THEN** 显示"暂无交易记录"提示

#### Scenario: 费用扣除交易列表展示

- **WHEN** 已登录用户查看一笔费用扣除交易
- **THEN** 操作类型显示“费用扣除”，持仓列显示 `--`，盈亏列显示负的费用金额

### Requirement: 交易盈亏列显示

交易记录列表 SHALL 在手续费列后展示“盈亏”列，读取交易记录中的 `realizedPnl` 字段。当交易为 `type=sell` 且 `affectHolding=true`、股息、费用扣除或任意 `realizedPnl != 0` 的交易时显示金额；其他无盈亏口径的记录显示 `--`。盈亏金额颜色 MUST 遵守账户全局 `colorMode`（`cn`: 正红负绿；`us`: 正绿负红）。

#### Scenario: 卖出交易显示盈亏

- **WHEN** 交易类型为卖出且 `affectHolding=true`，该笔 `realizedPnl=1280`
- **THEN** 盈亏列显示 `+1,280`（带账户币种符号），并按当前 `colorMode` 着色

#### Scenario: 无盈亏口径显示占位

- **WHEN** 交易没有 realizedPnl 口径且 `realizedPnl=0`
- **THEN** 盈亏列显示 `--`

### Requirement: 交易记录筛选

系统 SHALL 支持按当前用户的账户、交易类型和持仓筛选交易记录。筛选器中的账户和持仓选项 MUST 只包含当前用户的数据。

#### Scenario: 按账户筛选

- **WHEN** 用户选择筛选条件为"A股券商"
- **THEN** 列表只显示该账户下的交易记录

#### Scenario: 筛选器只显示用户自己的数据

- **WHEN** 用户打开交易页面的筛选器
- **THEN** 账户下拉只显示当前用户的账户，持仓下拉只显示当前用户的持仓

### Requirement: 交易表单内新建持仓

系统 SHALL 在交易表单的持仓选择器中提供"新建持仓"选项。用户选择后弹出简化版持仓创建表单，创建成功后自动选中新持仓并继续交易流程。

#### Scenario: 买入时新建持仓

- **WHEN** 用户在交易表单选择"买入"类型，选择账户后，在持仓下拉中点击"新建持仓"
- **THEN** 弹出持仓创建表单（包含名称、ticker、估值模式、资产类别），创建成功后自动选中该持仓，用户继续填写交易信息。本金不在此处填写，由交易记录自动累积

#### Scenario: 新建持仓后持仓列表刷新

- **WHEN** 用户通过交易表单内的"新建持仓"创建了一个新持仓
- **THEN** 持仓下拉选择器的列表自动刷新，包含新创建的持仓，且该持仓被自动选中

#### Scenario: 取消新建持仓

- **WHEN** 用户点击"新建持仓"后在创建表单中点击取消
- **THEN** 返回交易表单，持仓选择器保持之前的状态

### Requirement: 交易记录页使用 LoadingSpinner 加载动画

交易记录页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 交易页加载中

- **WHEN** 交易记录页正在获取交易、账户、持仓数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 交易页 Suspense fallback

- **WHEN** 交易页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件

### Requirement: 交易记录数值显示

交易记录列表和表单中的数值 SHALL 使用统一格式化函数：

- 交易金额：使用 `formatAmount()` 格式化
- 交易价格：使用 `formatPrice()` 格式化
- 交易份额：使用 `formatShares()` 格式化
- 手续费：使用 `formatAmount()` 格式化

#### Scenario: 交易金额显示

- **WHEN** 交易金额为 15000
- **THEN** 显示为 `¥15,000`

#### Scenario: 交易价格显示

- **WHEN** 交易价格为 3.141
- **THEN** 显示为 `3.141`

### Requirement: 交易记录金额跟随全局显示货币

系统 SHALL 让交易记录页的金额相关列跟随全局显示货币状态展示。`默认` 模式下，金额、手续费、盈亏与股价 MUST 使用交易所属账户原始币种显示；切换到 `USD/CNY/HKD` 任一指定货币后，上述金额 MUST 基于账户原币和现有汇率在前端实时折算为目标币种显示，不存储额外字段。

#### Scenario: 默认模式保持账户原币

- **WHEN** 全局显示货币为“默认”，用户查看一个 USD 账户的交易记录
- **THEN** 金额、手续费、盈亏与股价继续以 USD 显示

#### Scenario: 指定货币模式折算交易金额

- **WHEN** 全局显示货币为 HKD，用户查看一个 CNY 账户的交易记录
- **THEN** 金额、手续费、盈亏与股价统一折算为 HKD 显示

### Requirement: deposit/withdraw 作为收益率外部现金流来源

系统 SHALL 将 `deposit`（流入）与 `withdraw`（流出）交易定义为收益率（TWR）计算的外部现金流来源。其余交易类型（`buy/sell/dividend/fee/interest`）MUST 被视为内部流，不参与收益率现金流剔除。用户补录或修改此类现金流后，收益率链路 MUST 在后续计算中自动反映。

#### Scenario: 入金计为正向外部现金流

- **WHEN** 用户创建一笔 `deposit` 交易
- **THEN** 该金额按账户币种折算 CNY 后计为对应区间的正向外部现金流

#### Scenario: 出金计为负向外部现金流

- **WHEN** 用户创建一笔 `withdraw` 交易
- **THEN** 该金额按账户币种折算 CNY 后计为对应区间的负向外部现金流

#### Scenario: 内部交易不影响现金流剔除

- **WHEN** 用户创建 `buy/sell/dividend/fee` 等交易
- **THEN** 这些交易不计入外部现金流，其价值影响由净值快照自然吸收

### Requirement: 交易弹窗支持账户互转

通用交易弹窗 SHALL 在交易类型选项中提供“账户互转”。选择后 MUST 显示转出账户、转入账户、转出金额、到账金额、日期和备注；MUST 隐藏持仓、手续费及副作用开关。同币种时到账金额 SHALL 跟随转出金额且不可独立编辑，跨币种时用户 MUST 填写实际到账金额。

#### Scenario: 从交易按钮选择互转

- **WHEN** 用户打开通用交易弹窗并选择“账户互转”
- **THEN** 表单切换为账户互转字段并允许提交有效互转

#### Scenario: 跨币种显示两侧金额

- **WHEN** 用户选择币种不同的转出和转入账户
- **THEN** 表单分别标明两侧币种并要求填写实际到账金额

### Requirement: 交易列表展示互转流水

交易记录列表 SHALL 将 `transfer_out` 显示为“转出”、`transfer_in` 显示为“转入”，并显示对手账户名称。两侧记录的盈亏列 MUST 显示 `--`。交易类型筛选 MUST 提供“账户互转”选项，并在选择后同时返回转出与转入记录。

#### Scenario: 查看互转记录

- **WHEN** 用户完成从账户 A 到账户 B 的互转并打开交易列表
- **THEN** 列表显示账户 A 的转出记录和账户 B 的转入记录，且两条均标明对手账户

#### Scenario: 筛选账户互转

- **WHEN** 用户在交易类型筛选中选择“账户互转”
- **THEN** 列表只显示 `transfer_out` 与 `transfer_in` 记录

### Requirement: 删除互转提示整体回滚

当用户删除具有关联组的互转记录时，界面 MUST 提示该操作会同时删除两侧记录并回滚两个账户的资金和原始资金。

#### Scenario: 删除互转前确认

- **WHEN** 用户点击任一互转记录的删除按钮
- **THEN** 确认文案明确说明关联流水和两个账户变动将整体回滚
