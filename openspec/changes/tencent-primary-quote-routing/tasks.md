## 1. 腾讯报价适配层

- [ ] 1.1 新增腾讯简易行情适配模块（如 `src/lib/tencent-quote.ts`），实现 `qt.gtimg.cn` 请求、`~` 分隔字段解析与价格提取
- [ ] 1.2 实现亚洲 ticker 到腾讯 symbol 的统一映射（`.SS/.SZ/.HK/.BJ`，含港股 5 位补零）
- [ ] 1.3 为腾讯批量请求增加分片策略与缺失标的短重试（处理 `v_pv_none_match=\"1\"`/缺项）

## 2. 自动报价路由优先级改造

- [ ] 2.1 改造 `POST /api/holdings/fetch-prices` 分发逻辑：`.US/.JP` 保持 Stooq，`.SS/.SZ/.HK/.BJ` 走 Tencent 主路由
- [ ] 2.2 在亚洲链路中接入回退顺序 `Tencent -> EODHD -> Twelve Data`，并确保 Twelve Data 为最低权重可选备份
- [ ] 2.3 更新失败原因与结果明细中的 provider/source 标识，确保可区分 `tencent`、`eodhd`、`twelve-data`
- [ ] 2.4 保持现有用户鉴权、持仓归属校验与 `runMutationWithNetvalue` 自动净值触发行为不回归

## 3. 设置语义与验证

- [ ] 3.1 调整设置读取与文案语义：`quote_api.eodhd_key`、`quote_api.twelvedata_key` 为可选回退配置，不作为主链路前置条件
- [ ] 3.2 增加路由级回归测试/手工验证用例：无 key 仅腾讯成功、腾讯失败回退 EODHD、再回退 Twelve Data、无回退 key 失败明细
- [ ] 3.3 更新相关文档与 OpenSpec 主 specs（在后续 archive/sync 阶段同步）以反映新优先级与 `.BJ` 支持
