"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssetClass, Settings } from "@/lib/utils/types";
import { formatNumber } from "@/lib/utils/format";
import { AssetClassSortDialog } from "@/components/asset-class-sort-dialog";

interface AssetClassSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function AssetClassSettings({ open, onOpenChange, onSaved }: AssetClassSettingsProps) {
  const [classes, setClasses] = useState<AssetClass[]>([]);
  const [settings, setSettings] = useState<Settings>({
    warningThreshold: 3,
    dangerThreshold: 5,
    colorMode: "cn",
    netvalueTimezone: "Asia/Shanghai",
    performanceStartDate: "",
    twelveDataApiKey: "",
    eodhdApiKey: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [adding, setAdding] = useState(false);
  const [sortDialogOpen, setSortDialogOpen] = useState(false);

  const fetchClasses = () => {
    Promise.all([
      fetch("/api/asset-classes").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ]).then(([classData, settingsData]) => {
      setClasses(
        [...classData].sort(
          (a: AssetClass, b: AssetClass) => a.sortOrder - b.sortOrder || a.id - b.id
        )
      );
      setSettings((prev) => ({
        ...prev,
        ...settingsData,
        netvalueTimezone: settingsData.netvalueTimezone || "Asia/Shanghai",
        performanceStartDate: settingsData.performanceStartDate || "",
        twelveDataApiKey: settingsData.twelveDataApiKey || "",
        eodhdApiKey: settingsData.eodhdApiKey || "",
      }));
    });
  };

  useEffect(() => {
    if (open) fetchClasses();
  }, [open]);

  const total = classes.reduce((s, c) => s + c.targetPct, 0);

  const updateTargetPct = (id: number, value: number) => {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, targetPct: value } : c)));
    setError("");
  };

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    setAdding(true);
    const res = await fetch("/api/asset-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClassName.trim() }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "添加失败");
    } else {
      setNewClassName("");
      fetchClasses();
    }
    setAdding(false);
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
          classes: classes.map((c, index) => ({
            id: c.id,
            targetPct: c.targetPct,
            sortOrder: index + 1,
          })),
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
      const data = await settingsRes.json().catch(() => null);
      setError((data && data.error) || "设置保存失败");
    } else {
      onOpenChange(false);
      onSaved();
    }
    setSaving(false);
  };

  const applyClassSort = (orderedIds: number[]) => {
    const indexById = new Map(orderedIds.map((id, index) => [id, index]));
    setClasses((prev) =>
      [...prev].sort(
        (a, b) =>
          (indexById.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
            (indexById.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.id - b.id
      )
    );
    setError("");
  };

  const handleExportAll = () => {
    window.location.assign("/api/export/portfolio?download=1&detail=full");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-lg">
        <DialogHeader>
          <DialogTitle>资产配置设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-end">
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleExportAll}>
                导出全部数据
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSortDialogOpen(true)}
                disabled={classes.length <= 1}
              >
                ↕ 排序资产类别
              </Button>
            </div>
          </div>
          {/* Per-class target percentages */}
          {classes.map((cls) => (
            <div key={cls.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-medium w-20 truncate">{cls.name}</span>
              </div>
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

          {/* Add new class */}
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              placeholder="新增资产类别名称"
              value={newClassName}
              onChange={(e) => {
                setNewClassName(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAddClass()}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClass}
              disabled={adding || !newClassName.trim()}
            >
              {adding ? "添加中..." : "+ 添加"}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span
              className={
                Math.abs(total - 100) > 0.01
                  ? "text-destructive font-medium"
                  : "text-muted-foreground"
              }
            >
              目标占比总和: {formatNumber(total, 1)}%
            </span>
          </div>

          {/* Global thresholds */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">全局偏离阈值（所有类别共用）</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-2 block">⚠️ 警告阈值 (%)</Label>
                <Input
                  type="number"
                  value={settings.warningThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      warningThreshold: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs mb-2 block">🔴 危险阈值 (%)</Label>
                <Input
                  type="number"
                  value={settings.dangerThreshold}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, dangerThreshold: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Color mode */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">盈亏颜色模式</p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={settings.colorMode === "cn" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSettings((s) => ({ ...s, colorMode: "cn" }))}
              >
                🇨🇳 正红负绿（A股）
              </Button>
              <Button
                type="button"
                variant={settings.colorMode === "us" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setSettings((s) => ({ ...s, colorMode: "us" }))}
              >
                🇺🇸 正绿负红（美股）
              </Button>
            </div>
          </div>

          {/* Netvalue timezone */}
          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">净值时区</p>
            <Input
              list="netvalue-timezone-options"
              value={settings.netvalueTimezone}
              onChange={(e) =>
                setSettings((s) => ({ ...s, netvalueTimezone: e.target.value.trim() }))
              }
              placeholder="例如 Asia/Shanghai"
            />
            <datalist id="netvalue-timezone-options">
              <option value="Asia/Shanghai" />
              <option value="Asia/Hong_Kong" />
              <option value="Asia/Tokyo" />
              <option value="America/New_York" />
              <option value="America/Los_Angeles" />
              <option value="Europe/London" />
            </datalist>
            <p className="text-xs text-muted-foreground mt-2">
              用于计算“当日净值”日期和每日自动记录时间（本地凌晨 3:00）。
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-3">业绩起算日</p>
            <Input
              type="date"
              value={settings.performanceStartDate || ""}
              onChange={(e) => setSettings((s) => ({ ...s, performanceStartDate: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              用于收益率曲线起算；留空时从最早净值快照开始，早于首条快照的日期会自动回退。
            </p>
          </div>

          {/* Quote API keys */}
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">股价数据源 API Key（用户自定义）</p>
            <div>
              <Label className="text-xs mb-2 block">EODHD API Key（个人回退密钥，可选）</Label>
              <Input
                type="password"
                autoComplete="off"
                value={settings.eodhdApiKey || ""}
                onChange={(e) => setSettings((s) => ({ ...s, eodhdApiKey: e.target.value.trim() }))}
                placeholder="输入 EODHD API Key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                美股 Yahoo 或亚洲市场腾讯无可用价格时，仅使用你在此处保存的个人密钥回退到
                EODHD；系统不会读取部署环境中的共享 EODHD 密钥。
              </p>
            </div>
            <div>
              <Label className="text-xs mb-2 block">
                Twelve Data API Key（最低权重备份，可选）
              </Label>
              <Input
                type="password"
                autoComplete="off"
                value={settings.twelveDataApiKey || ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, twelveDataApiKey: e.target.value.trim() }))
                }
                placeholder="输入 Twelve Data API Key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                仅在 Tencent 与 EODHD 均不可用时才尝试 Twelve Data；默认按 Pro 使用场景，不做固定 65
                秒延时等待。
              </p>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
      <AssetClassSortDialog
        open={sortDialogOpen}
        onOpenChange={setSortDialogOpen}
        classes={classes}
        onSave={applyClassSort}
      />
    </Dialog>
  );
}
