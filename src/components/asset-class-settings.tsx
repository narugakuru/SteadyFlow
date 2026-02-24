"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AssetClass, Settings } from "@/lib/types";

interface AssetClassSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AssetClassSettings({ open, onOpenChange, onSaved }: AssetClassSettingsProps) {
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [settings, setSettings] = useState<Settings>({ warningThreshold: 3, dangerThreshold: 5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      Promise.all([
        fetch("/api/asset-classes").then((r) => r.json()),
        fetch("/api/settings").then((r) => r.json()),
      ]).then(([classData, settingsData]) => {
        setClasses(classData);
        setSettings(settingsData);
      });
    }
  }, [open]);

  const total = classes.reduce((s, c) => s + c.targetPct, 0);

  const updateTargetPct = (id: number, value: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, targetPct: value } : c))
    );
    setError("");
  };

  const handleSave = async () => {
    if (Math.abs(total - 100) > 0.01) {
      setError("目标占比总和必须为 100%");
      return;
    }
    setSaving(true);

    // Save asset class targets and global thresholds in parallel
    const [classRes, settingsRes] = await Promise.all([
      fetch("/api/asset-classes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classes: classes.map((c) => ({ id: c.id, targetPct: c.targetPct })),
        }),
      }),
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      }),
    ]);

    if (!classRes.ok) {
      const data = await classRes.json();
      setError(data.error || "保存失败");
    } else if (!settingsRes.ok) {
      setError("阈值保存失败");
    } else {
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>资产配置设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Per-class target percentages */}
          {classes.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between gap-3">
              <span className="font-medium w-20">{cls.name}</span>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">目标</Label>
                <Input
                  type="number"
                  className="w-20"
                  value={cls.targetPct}
                  onChange={(e) => updateTargetPct(cls.id, parseFloat(e.target.value) || 0)}
                />
                <span className="text-sm">%</span>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between text-sm">
            <span className={Math.abs(total - 100) > 0.01 ? "text-destructive font-medium" : "text-muted-foreground"}>
              目标占比总和: {total.toFixed(1)}%
            </span>
          </div>

          {/* Global thresholds */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">全局偏离阈值（所有类别共用）</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">⚠️ 警告阈值 (%)</Label>
                <Input
                  type="number"
                  value={settings.warningThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, warningThreshold: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label className="text-xs">🔴 危险阈值 (%)</Label>
                <Input
                  type="number"
                  value={settings.dangerThreshold}
                  onChange={(e) => setSettings((s) => ({ ...s, dangerThreshold: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
