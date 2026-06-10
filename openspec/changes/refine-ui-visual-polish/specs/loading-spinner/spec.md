## ADDED Requirements

### Requirement: 页面级骨架屏加载占位

系统 SHALL 为缓存优先读取的页面级加载场景提供骨架屏（skeleton）占位组件，其布局结构 MUST 与对应页面的最终内容接近（如资产曲线区块、纪律表行、账户行），用于替代占据大块空白的全屏 spinner，消除"加载占位 → 内容突现"的布局跳动。短时内联操作（如按钮触发的异步请求）SHALL 继续使用 `LoadingSpinner`，MUST NOT 用骨架屏替代按钮内联加载指示。

#### Scenario: 总览首屏使用骨架屏

- **WHEN** 用户打开总览页且数据尚未就绪
- **THEN** 页面展示与资产曲线/纪律表结构一致的骨架占位，而不是居中的全屏 spinner

#### Scenario: 骨架屏布局接近真实内容

- **WHEN** 骨架屏在加载阶段显示
- **THEN** 其区块结构与真实内容布局接近，内容就绪后切换不产生明显布局位移

#### Scenario: 内联操作仍用 LoadingSpinner

- **WHEN** 用户点击"更新股价"等触发短时异步操作的按钮
- **THEN** 按钮内部仍显示小尺寸 `LoadingSpinner` 表示进行中，而不是骨架屏
