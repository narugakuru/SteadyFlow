## REMOVED Requirements

### Requirement: 饼状图展示资产占比

**Reason**: Dashboard 默认不再展示资产分布饼图，资产分布改由洞察页承载。
**Migration**: Use `portfolio-insights` composition chart requirements.

### Requirement: 饼状图视角切换

**Reason**: Dashboard 默认不再提供按大类/按标的的饼图视角切换。
**Migration**: Use 洞察页组合占比图表与当前持仓热力图。

### Requirement: 饼状图颜色区分

**Reason**: Asset distribution visualization is moved out of Dashboard.
**Migration**: Use 洞察页图表配色和热力图颜色规则。

### Requirement: 饼状图标签与图例精简展示

**Reason**: Dashboard asset distribution pie chart is removed from the default overview surface.
**Migration**: Use 洞察页 composition chart labels and heatmap tooltips.
