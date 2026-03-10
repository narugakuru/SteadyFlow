import type { Modifier } from "@dnd-kit/core";

export const SORTABLE_MOUSE_ACTIVATION_DISTANCE = 4;
export const SORTABLE_TOUCH_ACTIVATION_DELAY = 120;
export const SORTABLE_TOUCH_ACTIVATION_TOLERANCE = 8;

export const SORTABLE_DRAG_HANDLE_CLASS_NAME =
  "touch-none select-none cursor-grab active:cursor-grabbing";

export const restrictToVerticalDrag: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});
