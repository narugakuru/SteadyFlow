export interface HoldingSortItemLike {
  id: number;
}

export function reorderHoldingSortItemsById<T extends HoldingSortItemLike>(
  items: T[],
  activeId: number,
  overId: number
): T[] {
  if (activeId === overId) return items;
  const fromIndex = items.findIndex((item) => item.id === activeId);
  const toIndex = items.findIndex((item) => item.id === overId);
  if (fromIndex < 0 || toIndex < 0) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function rollbackHoldingSortItems<T>(confirmedItems: T[]): T[] {
  return [...confirmedItems];
}
