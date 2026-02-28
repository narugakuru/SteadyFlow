## Purpose

定义 discipline-notes 能力的业务约束与验收标准。

## Requirements

### Requirement: 全局悬浮笔记入口

系统 SHALL 在登录后的任意业务页面右下角提供一个仅图标显示的圆形悬浮笔记入口，不显示文字标签。该入口 MUST 固定定位并在页面滚动时保持可见。入口层级 SHALL 高于普通页面内容且低于 Dialog/Sheet 等模态弹层，以确保在其他弹窗出现时被遮挡而不抢占交互焦点。

#### Scenario: 任意页面可访问笔记入口

- **WHEN** 用户在 Dashboard、账户页、交易页、净值页或市场页浏览内容
- **THEN** 右下角均显示同一个圆形笔记图标入口

#### Scenario: 模态弹窗优先级高于笔记入口

- **WHEN** 用户打开编辑持仓或交易等 Dialog
- **THEN** 笔记悬浮入口被该 Dialog 遮挡且不阻挡弹窗交互

### Requirement: 笔记中心弹窗结构

用户点击悬浮入口后，系统 SHALL 打开居中的大弹窗作为笔记中心。弹窗内容从上到下 MUST 按固定顺序呈现：投资笔记、经典句子、交易计划、内容区域。经典句子 SHALL 用于展示价值投资/纪律投资提示语。

#### Scenario: 打开笔记中心弹窗

- **WHEN** 用户点击右下角圆形笔记入口
- **THEN** 系统打开居中大弹窗并按固定顺序展示四个内容区块

#### Scenario: 经典句子区块显示

- **WHEN** 笔记中心弹窗打开
- **THEN** 系统在“投资笔记”下方展示一条经典句子提示

### Requirement: 多条便签式笔记管理

系统 SHALL 支持用户自由创建、查看、编辑、删除多条笔记。每条笔记 MUST 至少包含标题、交易计划和 Markdown 内容。笔记数据 MUST 按 userId 隔离，用户只能访问自己的笔记。

#### Scenario: 创建多条笔记

- **WHEN** 用户连续创建两条不同标题的笔记
- **THEN** 两条笔记均被保存并可在笔记中心切换查看

#### Scenario: 删除单条笔记

- **WHEN** 用户删除某条已存在笔记
- **THEN** 系统仅删除目标笔记，其他笔记保持不变

#### Scenario: 用户数据隔离

- **WHEN** 用户 A 与用户 B 分别进入笔记中心
- **THEN** 双方只看到各自创建的笔记数据

### Requirement: Markdown 内容渲染

系统 SHALL 对笔记内容提供 Markdown 渲染显示能力，并保留原始 Markdown 文本用于编辑。渲染器 MUST 禁用原始 HTML 直出，防止脚本注入。

#### Scenario: Markdown 语法正常渲染

- **WHEN** 用户输入 `## 交易计划`、`- 分批买入`、`**纪律执行**`
- **THEN** 预览区域按对应标题、列表和加粗样式渲染

#### Scenario: HTML 标签不执行

- **WHEN** 用户在内容中输入 `<script>alert(1)</script>`
- **THEN** 渲染结果不执行脚本，页面保持安全
