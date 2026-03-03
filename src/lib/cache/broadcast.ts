"use client";

import type { CacheQueryName } from "@/lib/cache/policy";

const CHANNEL_NAME = "investmanage-cache-sync-v1";

interface InvalidateBroadcastMessage {
  type: "invalidate";
  payload: {
    userId: string;
    queries: CacheQueryName[];
  };
}

type BroadcastMessage = InvalidateBroadcastMessage;

function createChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

export function publishInvalidateBroadcast(userId: string, queries: CacheQueryName[]) {
  const channel = createChannel();
  if (!channel) return;
  const message: BroadcastMessage = {
    type: "invalidate",
    payload: { userId, queries },
  };
  channel.postMessage(message);
  channel.close();
}

export function subscribeInvalidateBroadcast(
  handler: (payload: { userId: string; queries: CacheQueryName[] }) => void
) {
  const channel = createChannel();
  if (!channel) return () => {};

  channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
    const message = event.data;
    if (message?.type !== "invalidate") return;
    handler(message.payload);
  };

  return () => channel.close();
}
