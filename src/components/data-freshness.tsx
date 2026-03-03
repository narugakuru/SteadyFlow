"use client";

interface DataFreshnessProps {
  updatedAt?: number;
  isFetching?: boolean;
  className?: string;
}

function formatAge(updatedAt: number): string {
  const deltaMs = Math.max(0, Date.now() - updatedAt);
  const seconds = Math.floor(deltaMs / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  return `${hours}小时前`;
}

export function DataFreshness({
  updatedAt,
  isFetching = false,
  className = "",
}: DataFreshnessProps) {
  if (!updatedAt) return null;

  return (
    <p className={`text-[11px] text-muted-foreground ${className}`}>
      {isFetching ? "后台更新中 · " : ""}
      数据更新于 {formatAge(updatedAt)}
    </p>
  );
}
