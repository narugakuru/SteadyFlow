export interface VixSentimentLevel {
  min: number;
  max: number;
  range: string;
  emoji: string;
  label: string;
  colorClass: string;
  surfaceClass: string;
  tip: string;
}

export const VIX_SENTIMENT_LEVELS: VixSentimentLevel[] = [
  {
    min: 0,
    max: 15,
    range: "< 15",
    emoji: "😌",
    label: "市场平静",
    colorClass: "text-status-success",
    surfaceClass: "border-status-success/30 bg-status-success/10",
    tip: "低波动期，适合按计划定投和再平衡。",
  },
  {
    min: 15,
    max: 20,
    range: "15 - 20",
    emoji: "😐",
    label: "正常波动",
    colorClass: "text-sort-active",
    surfaceClass: "border-sort-active/30 bg-sort-active/10",
    tip: "市场运行正常，继续按既定纪律执行。",
  },
  {
    min: 20,
    max: 30,
    range: "20 - 30",
    emoji: "😟",
    label: "波动加剧",
    colorClass: "text-status-warning",
    surfaceClass: "border-status-warning/30 bg-status-warning/10",
    tip: "不确定性抬升，优先检查仓位是否明显偏离目标。",
  },
  {
    min: 30,
    max: 40,
    range: "30 - 40",
    emoji: "😨",
    label: "市场恐慌",
    colorClass: "text-status-danger",
    surfaceClass: "border-status-danger/30 bg-status-danger/10",
    tip: "情绪进入恐慌区，避免追涨杀跌，坚持分批与纪律。",
  },
  {
    min: 40,
    max: Number.POSITIVE_INFINITY,
    range: "> 40",
    emoji: "🔥",
    label: "极度恐慌",
    colorClass: "text-status-danger",
    surfaceClass: "border-status-danger/30 bg-status-danger/10",
    tip: "极端恐慌通常持续不久，更需要控制节奏和现金安排。",
  },
];

export function getVixSentimentLevel(currentVix?: number | null): VixSentimentLevel | null {
  if (currentVix == null || !Number.isFinite(currentVix) || currentVix < 0) {
    return null;
  }

  return (
    VIX_SENTIMENT_LEVELS.find((level) => currentVix >= level.min && currentVix < level.max) ?? null
  );
}
