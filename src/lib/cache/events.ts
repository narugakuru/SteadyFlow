"use client";

import type { CacheQueryName } from "@/lib/cache/policy";

export interface SyncFailureEventPayload {
  message: string;
  at: number;
}

export interface InvalidateEventPayload {
  userId: string;
  queries: CacheQueryName[];
}

const SYNC_FAILURE_EVENT = "investmanage:sync-failure";
const INVALIDATE_EVENT = "investmanage:invalidate";

export function emitSyncFailure(message = "更新数据失败，当前显示本地缓存") {
  if (typeof window === "undefined") return;
  const payload: SyncFailureEventPayload = { message, at: Date.now() };
  window.dispatchEvent(
    new CustomEvent<SyncFailureEventPayload>(SYNC_FAILURE_EVENT, { detail: payload })
  );
}

export function subscribeSyncFailure(handler: (payload: SyncFailureEventPayload) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<SyncFailureEventPayload>;
    handler(customEvent.detail);
  };
  window.addEventListener(SYNC_FAILURE_EVENT, listener);
  return () => window.removeEventListener(SYNC_FAILURE_EVENT, listener);
}

export function emitInvalidate(payload: InvalidateEventPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<InvalidateEventPayload>(INVALIDATE_EVENT, { detail: payload })
  );
}

export function subscribeInvalidate(handler: (payload: InvalidateEventPayload) => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<InvalidateEventPayload>;
    handler(customEvent.detail);
  };
  window.addEventListener(INVALIDATE_EVENT, listener);
  return () => window.removeEventListener(INVALIDATE_EVENT, listener);
}
