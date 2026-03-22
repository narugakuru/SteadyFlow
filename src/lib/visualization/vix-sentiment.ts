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
    colorClass: "text-emerald-600 dark:text-emerald-400",
    surfaceClass: "border-emerald-500/30 bg-emerald-500/10",
    tip: "低波动期，适合按计划定投和再平衡。",
  },
  {
    min: 15,
    max: 20,
    range: "15 - 20",
    emoji: "😐",
    label: "正常波动",
    colorClass: "text-sky-600 dark:text-sky-400",
    surfaceClass: "border-sky-500/30 bg-sky-500/10",
    tip: "市场运行正常，继续按既定纪律执行。",
  },
  {
    min: 20,
    max: 30,
    range: "20 - 30",
    emoji: "😟",
    label: "波动加剧",
    colorClass: "text-amber-600 dark:text-amber-400",
    surfaceClass: "border-amber-500/30 bg-amber-500/10",
    tip: "不确定性抬升，优先检查仓位是否明显偏离目标。",
  },
  {
    min: 30,
    max: 40,
    range: "30 - 40",
    emoji: "😨",
    label: "市场恐慌",
    colorClass: "text-rose-600 dark:text-rose-400",
    surfaceClass: "border-rose-500/30 bg-rose-500/10",
    tip: "情绪进入恐慌区，避免追涨杀跌，坚持分批与纪律。",
  },
  {
    min: 40,
    max: Number.POSITIVE_INFINITY,
    range: "> 40",
    emoji: "🔥",
    label: "极度恐慌",
    colorClass: "text-red-700 dark:text-red-500",
    surfaceClass: "border-red-600/30 bg-red-600/10",
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
