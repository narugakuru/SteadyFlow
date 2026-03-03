"use client";

import { useEffect, useState } from "react";

import { subscribeSyncFailure } from "@/lib/cache/events";

const DISPLAY_MS = 2500;
const FADE_MS = 7000;

export function CacheSyncBanner() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = subscribeSyncFailure((payload) => {
      setMessage(payload.message);
      setVisible(true);
      setFading(false);

      if (fadeTimer) clearTimeout(fadeTimer);
      if (hideTimer) clearTimeout(hideTimer);

      fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS);
      hideTimer = setTimeout(() => {
        setVisible(false);
        setFading(false);
      }, DISPLAY_MS + FADE_MS);
    });

    return () => {
      unsubscribe();
      if (fadeTimer) clearTimeout(fadeTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-12 inset-x-0 z-50 flex justify-center pointer-events-none px-4">
      <div
        className={`pointer-events-auto rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-900 shadow transition-opacity ${
          fading ? "opacity-0 duration-[7000ms]" : "opacity-100 duration-300"
        }`}
      >
        {message}
      </div>
    </div>
  );
}
