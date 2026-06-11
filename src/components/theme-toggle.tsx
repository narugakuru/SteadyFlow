"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/utils";

const THEME_OPTIONS = [
  { value: "light", label: "亮色", icon: Sun },
  { value: "dark", label: "暗色", icon: Moon },
  { value: "system", label: "系统", icon: Monitor },
] as const;

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const activeTheme = theme ?? "system";

  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-1 rounded-md border border-border bg-muted/40 p-1",
        className
      )}
      aria-label="主题切换"
    >
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && activeTheme === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={active ? "secondary" : "ghost"}
            size="icon-sm"
            className={cn("h-8 w-full", active && "bg-background shadow-sm")}
            aria-label={`切换到${option.label}主题`}
            title={option.label}
            onClick={() => setTheme(option.value)}
          >
            <Icon className="size-4" />
          </Button>
        );
      })}
    </div>
  );
}
