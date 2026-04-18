## 1. OpenSpec And Shared State

- [ ] 1.1 补齐本次 change 的 proposal、design、delta specs，并同步全局显示货币与账户页未持仓开关的需求约束
- [ ] 1.2 新增本地显示货币状态读写工具，支持 `default/USD/CNY/HKD` 的校验、读取、持久化与页面间共享

## 2. UI And Data Wiring

- [ ] 2.1 改造 Dashboard，使用共享显示货币状态替代局部状态，并保持页头下拉作为全局控制入口
- [ ] 2.2 改造账户页与账户列表，使账户金额/持仓金额跟随全局显示货币，并新增“显示未持仓标的”开关接入现有持仓接口参数
- [ ] 2.3 改造交易记录页金额列，使其在指定货币模式下基于汇率实时折算显示

## 3. Sync And Verification

- [ ] 3.1 将实现结果同步到 `openspec/specs`、`project_overview.md` 与必要的项目文档摘要
- [ ] 3.2 运行必要验证并修正问题，完成 change 文档提交与代码提交
