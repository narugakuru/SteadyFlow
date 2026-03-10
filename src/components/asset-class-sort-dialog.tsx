"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  SORTABLE_DRAG_HANDLE_CLASS_NAME,
  SORTABLE_MOUSE_ACTIVATION_DISTANCE,
  SORTABLE_TOUCH_ACTIVATION_DELAY,
  SORTABLE_TOUCH_ACTIVATION_TOLERANCE,
  restrictToVerticalDrag,
} from "@/lib/services/mobile-sort-dnd";
import { AssetClass } from "@/lib/utils/types";
import {
  DndContext,
  MouseSensor,
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

interface AssetClassSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: AssetClass[];
  onSave: (orderedIds: number[]) => void;
}

function SortableAssetClassRow({ id, name }: { id: number; name: string }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`grid grid-cols-[minmax(0,1fr)_5rem] items-center gap-2 rounded-md border px-3 py-2 ${
        isDragging ? "bg-accent/40 shadow-sm" : "bg-background"
      }`}
    >
      <span className="truncate font-medium">{name}</span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={`inline-flex h-8 w-full items-center justify-center gap-1 rounded border text-muted-foreground hover:bg-accent ${SORTABLE_DRAG_HANDLE_CLASS_NAME}`}
        aria-label={`拖拽排序 ${name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
        <span className="text-[11px] leading-none">拖拽</span>
      </button>
    </div>
  );
}

export function AssetClassSortDialog({
  open,
  onOpenChange,
  classes,
  onSave,
}: AssetClassSortDialogProps) {
  const [items, setItems] = useState<AssetClass[]>([]);

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

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems([...classes].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id));
  }, [open, classes]);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === Number(active.id));
    const newIndex = items.findIndex((item) => item.id === Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setItems((prev) => arrayMove(prev, oldIndex, newIndex));
  };

  const handleSave = () => {
    onSave(items.map((item) => item.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,28rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle>排序资产类别</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          按住右侧句柄上下拖拽调整资产类别顺序，点击保存后将应用到当前设置。
        </p>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto overscroll-contain pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalDrag]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
              {items.map((item) => (
                <SortableAssetClassRow key={item.id} id={item.id} name={item.name} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleSave} disabled={items.length <= 1}>
            保存排序
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
