"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Holding } from "@/lib/types";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HoldingSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  accountId?: number;
  accountNameById: Map<number, string>;
  holdings: Holding[];
  onSaved: () => void;
}

interface HoldingSortItem {
  id: number;
  name: string;
  ticker: string | null;
  accountName: string;
}

function SortableHoldingRow({ item }: { item: HoldingSortItem }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 items-center rounded-md border px-3 py-2 ${
        isDragging ? "bg-accent/40 shadow-sm" : "bg-background"
      }`}
    >
      <span className="truncate font-medium">{item.name}</span>
      <span className="truncate text-sm text-muted-foreground">{item.ticker || "--"}</span>
      <span className="truncate text-sm text-muted-foreground">{item.accountName}</span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="inline-flex h-8 w-8 items-center justify-center rounded border text-muted-foreground hover:bg-accent"
        aria-label="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  );
}

export function HoldingSortDialog({
  open,
  onOpenChange,
  title = "持仓排序",
  accountId,
  accountNameById,
  holdings,
  onSaved,
}: HoldingSortDialogProps) {
  const [items, setItems] = useState<HoldingSortItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  useEffect(() => {
    if (!open) return;
    const sorted = [...holdings].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    setItems(
      sorted.map((h) => ({
        id: h.id,
        name: h.name,
        ticker: h.ticker,
        accountName: accountNameById.get(h.accountId) || `账户#${h.accountId}`,
      }))
    );
    setDirty(false);
    setError("");
  }, [open, holdings, accountNameById]);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === Number(active.id));
    const newIndex = items.findIndex((item) => item.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setItems((prev) => arrayMove(prev, oldIndex, newIndex));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!dirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/holdings/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(accountId ? { accountId } : {}),
          holdingIds: items.map((item) => item.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存排序失败");
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存排序失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          拖拽右侧句柄调整顺序。点击保存后一次性生效；取消不会写入数据库。
        </p>
        <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 px-1 text-xs text-muted-foreground">
          <span>标的名称</span>
          <span>股票编号</span>
          <span>账户归属</span>
          <span className="text-right">拖拽</span>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableHoldingRow key={item.id} item={item} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving || items.length <= 1}>
            {saving ? "保存中..." : "保存排序"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
