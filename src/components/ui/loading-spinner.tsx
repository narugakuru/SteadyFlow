import { cn } from "@/lib/utils/utils";

const sizeMap = {
  sm: { container: "w-10 h-10", text: "text-xs" },
  md: { container: "w-16 h-16", text: "text-sm" },
  lg: { container: "w-24 h-24", text: "text-base" },
};

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  text,
  className,
}: LoadingSpinnerProps) {
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        className
      )}
    >
      <div className={cn("relative", s.container)}>
        {/* 外环 — 顺时针旋转 */}
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin" />
        {/* 中环 — 逆时针旋转（慢） */}
        <div
          className="absolute inset-[15%] rounded-full border-2 border-transparent border-b-primary/70 border-l-primary/30 animate-spin"
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
        {/* 内核 — 脉冲呼吸 */}
        <div className="absolute inset-[35%] rounded-full bg-primary/20 animate-pulse" />
      </div>
      {text && (
        <p
          className={cn(
            "text-muted-foreground animate-pulse font-medium",
            s.text
          )}
        >
          {text}
        </p>
      )}
    </div>
  );
}
