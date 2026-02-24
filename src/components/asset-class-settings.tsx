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
import { AssetClass } from "@/lib/types";

interface AssetClassSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AssetClassSettings({ open, onOpenChange, onSaved }: AssetClassSettingsProps) {
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      fetch("/api/asset-classes")
        .then((r) => r.json())
        .then(setClasses);
    }
  }, [open]);

  const total = classes.reduce((s, c) => s + c.targetPct, 0);

  const updateField = (id: number, field: keyof AssetClass, value: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    setError("");
  };

  const handleSave = async () => {
    if (Math.abs(total - 100) > 0.01) {
      setError("目标占比总和必须为 100%");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/asset-classes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classes: classes.map((c) => ({
          id: c.id,
          targetPct: c.targetPct,
          warningThreshold: c.warningThreshold,
          dangerThreshold: c.dangerThreshold,
        })),
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "保存失败");
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
          {classes.map((cls) => (
            <div key={cls.id} className="border rounded-lg p-3 space-y-2">
              <p className="font-medium">{cls.name}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">目标占比 (%)</Label>
                  <Input
                    type="number"
                    value={cls.targetPct}
                    onChange={(e) => updateField(cls.id, "targetPct", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">⚠️ 警告阈值 (%)</Label>
                  <Input
                    type="number"
                    value={cls.warningThreshold}
                    onChange={(e) => updateField(cls.id, "warningThreshold", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">🔴 危险阈值 (%)</Label>
                  <Input
                    type="number"
                    value={cls.dangerThreshold}
                    onChange={(e) => updateField(cls.id, "dangerThreshold", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm">
            <span className={Math.abs(total - 100) > 0.01 ? "text-destructive font-medium" : "text-muted-foreground"}>
              目标占比总和: {total.toFixed(1)}%
            </span>
            {error && <span className="text-destructive">{error}</span>}
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
