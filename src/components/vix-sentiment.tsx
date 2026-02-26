"use client";

const sentimentLevels = [
  {
    min: 0,
    max: 15,
    range: "< 15",
    emoji: "😌",
    label: "市场平静",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/30",
    activeBg: "bg-green-400/25 border-green-400/60 ring-2 ring-green-400/40",
    tip: "低波动期，适合按计划定投和再平衡",
  },
  {
    min: 15,
    max: 20,
    range: "15 – 20",
    emoji: "😐",
    label: "正常波动",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
    activeBg: "bg-blue-400/25 border-blue-400/60 ring-2 ring-blue-400/40",
    tip: "市场运行正常，保持既定策略即可",
  },
  {
    min: 20,
    max: 30,
    range: "20 – 30",
    emoji: "😟",
    label: "波动加剧",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/30",
    activeBg: "bg-orange-400/25 border-orange-400/60 ring-2 ring-orange-400/40",
    tip: "不确定性上升，检查组合是否偏离目标配比",
  },
  {
    min: 30,
    max: 40,
    range: "30 – 40",
    emoji: "😨",
    label: "市场恐慌",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
    activeBg: "bg-red-400/25 border-red-400/60 ring-2 ring-red-400/40",
    tip: "\"别人恐惧时贪婪\" —— 历史上往往是长期买入机会",
  },
  {
    min: 40,
    max: Infinity,
    range: "> 40",
    emoji: "🔥",
    label: "极度恐慌",
    color: "text-red-600",
    bg: "bg-red-600/10 border-red-600/30",
    activeBg: "bg-red-600/25 border-red-600/60 ring-2 ring-red-600/40",
    tip: "极端恐慌罕见但短暂，坚持纪律、分批建仓",
  },
];

interface VixSentimentProps {
  currentVix?: number;
}

export function VixSentiment({ currentVix }: VixSentimentProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {sentimentLevels.map((level) => {
        const isActive =
          currentVix !== undefined &&
          currentVix >= level.min &&
          currentVix < level.max;

        return (
          <div
            key={level.range}
            className={`rounded-lg border p-3 text-center transition-all ${
              isActive ? level.activeBg : level.bg
            } ${isActive ? "scale-105" : "opacity-70"}`}
          >
            <div className={`mb-1 ${isActive ? "text-3xl" : "text-2xl"}`}>
              {level.emoji}
            </div>
            <div className={`text-sm font-semibold ${level.color}`}>
              {level.label}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              VIX {level.range}
            </div>
            <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {level.tip}
            </div>
          </div>
        );
      })}
    </div>
  );
}
