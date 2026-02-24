"use client";

import { AllocationItem } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  normal: { bg: "bg-green-100 text-green-800", icon: "✅", label: "正常" },
  warning: { bg: "bg-yellow-100 text-yellow-800", icon: "⚠️", label: "" },
  danger: { bg: "bg-red-100 text-red-800", icon: "🔴", label: "" },
};

interface DisciplineTableProps {
  allocation: AllocationItem[];
}

export function DisciplineTable({ allocation }: DisciplineTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">资产类别</th>
            <th className="text-right p-3 font-medium">目标</th>
            <th className="text-right p-3 font-medium">实际</th>
            <th className="text-right p-3 font-medium">金额 (¥)</th>
            <th className="text-right p-3 font-medium">偏离</th>
            <th className="text-center p-3 font-medium">状态</th>
          </tr>
        </thead>
        <tbody>
          {allocation.map((item) => {
            const style = STATUS_STYLES[item.status];
            const deviationLabel =
              item.deviation > 0
                ? `超配 +${item.deviation}%`
                : item.deviation < 0
                ? `低配 ${item.deviation}%`
                : "持平";
            return (
              <tr key={item.id} className="border-t">
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-right">{item.targetPct}%</td>
                <td className="p-3 text-right">{item.actualPct}%</td>
                <td className="p-3 text-right">¥{item.actualValue.toLocaleString()}</td>
                <td className="p-3 text-right">
                  <span className={item.status === "danger" ? "text-red-600 font-medium" : item.status === "warning" ? "text-yellow-600 font-medium" : ""}>
                    {item.deviation > 0 ? "+" : ""}{item.deviation}%
                  </span>
                </td>
                <td className="p-3 text-center">
                  <Badge variant="secondary" className={style.bg}>
                    {style.icon} {deviationLabel}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
