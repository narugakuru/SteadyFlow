"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMutationJson } from "@/lib/cache/hooks";
import { entityOptimisticUpdate } from "@/lib/cache/optimistic";
import {
  SORTABLE_DRAG_HANDLE_CLASS_NAME,
  SORTABLE_MOUSE_ACTIVATION_DISTANCE,
  SORTABLE_TOUCH_ACTIVATION_DELAY,
  SORTABLE_TOUCH_ACTIVATION_TOLERANCE,
  restrictToVerticalDrag,
} from "@/lib/services/mobile-sort-dnd";
import {
  reorderHoldingSortItemsById,
  rollbackHoldingSortItems,
} from "@/lib/services/holding-sort-state";
import { formatAmount } from "@/lib/utils/format";
import { Account, CURRENCY_SYMBOLS } from "@/lib/utils/types";

interface AccountSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  onSaved: () => void;
}

interface AccountSortItem {
  id: number;
  name: string;
  currency: Account["currency"];
  accountValue: number;
  holdingsCount: number;
}

function compareAccountsByDefaultOrder(left: Account, right: Account) {
  return left.sortOrder - right.sortOrder || left.id - right.id;
}

function SortableAccountRow({ item }: { item: AccountSortItem }) {
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
      className={`grid grid-cols-[minmax(0,1.2fr)_4rem_minmax(0,1fr)_4rem_5.25rem] gap-2 items-center rounded-md border px-3 py-2 ${
        isDragging ? "bg-accent/40 shadow-sm" : "bg-background"
      }`}
    >
      <span className="truncate font-medium">{item.name}</span>
      <span className="truncate text-sm text-muted-foreground">{item.currency}</span>
      <span className="truncate text-right text-sm text-muted-foreground tabular-nums">
        {CURRENCY_SYMBOLS[item.currency]}
        {formatAmount(item.accountValue)}
      </span>
      <span className="text-right text-sm text-muted-foreground tabular-nums">
        {item.holdingsCount}
      </span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded border text-muted-foreground hover:bg-accent ${SORTABLE_DRAG_HANDLE_CLASS_NAME}`}
        aria-label={`拖拽排序 ${item.name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
        <span className="text-[11px] leading-none">拖拽</span>
      </button>
    </div>
  );
}

export function AccountSortDialog({
  open,
  onOpenChange,
  accounts,
  onSaved,
}: AccountSortDialogProps) {
  const [items, setItems] = useState<AccountSortItem[]>([]);
  const [confirmedItems, setConfirmedItems] = useState<AccountSortItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const wasOpenRef = useRef(false);
  const mutation = useMutationJson<{ accountIds: number[] }, { success: boolean }>();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: SORTABLE_MOUSE_ACTIVATION_DISTANCE },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: SORTABLE_TOUCH_ACTIVATION_DELAY,
        tolerance: SORTABLE_TOUCH_ACTIVATION_TOLERANCE,
      },
    })
  );

  const initialItems = useMemo(
    () =>
      [...accounts].sort(compareAccountsByDefaultOrder).map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        accountValue: account.accountValue,
        holdingsCount: account.holdingsCount,
      })),
    [accounts]
  );

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setItems(initialItems);
      setConfirmedItems(initialItems);
      setDirty(false);
      setError("");
    }
    if (!open) {
      setSaving(false);
    }
    wasOpenRef.current = open;
  }, [open, initialItems]);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeId = Number(active.id);
    const overId = Number(over.id);
    if (!Number.isFinite(activeId) || !Number.isFinite(overId)) return;
    setItems((prev) => {
      const next = reorderHoldingSortItemsById(prev, activeId, overId);
      if (next !== prev) setDirty(true);
      return next;
    });
  };

  const handleSave = async () => {
    if (!dirty) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError("");
    const previousConfirmed = confirmedItems;

    try {
      await mutation.mutateAsync({
        path: "/api/accounts/reorder",
        method: "POST",
        mutationName: "accounts-write",
        optimistic: entityOptimisticUpdate,
        body: {
          accountIds: items.map((item) => item.id),
        },
      });
      setConfirmedItems(items);
      setDirty(false);
      onOpenChange(false);
      onSaved();
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存排序失败";
      setItems(rollbackHoldingSortItems(previousConfirmed));
      setDirty(false);
      setError(`${message}，顺序已回滚到上次保存结果`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,40rem)] md:max-w-xl">
        <DialogHeader>
          <DialogTitle>排序账户</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          按住右侧句柄上下拖拽调整账户默认顺序。点击保存后一次性生效；取消不会写入数据库。
        </p>
        <div className="grid grid-cols-[minmax(0,1.2fr)_4rem_minmax(0,1fr)_4rem_5.25rem] gap-2 px-1 text-xs text-muted-foreground">
          <span>账户名称</span>
          <span>币种</span>
          <span className="text-right">总价值</span>
          <span className="text-right">持仓数</span>
          <span className="text-right">拖拽</span>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalDrag]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableAccountRow key={item.id} item={item} />
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
