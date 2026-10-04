"use client";

import { useEffect } from "react";
import { purgeExpiredRecordings } from "@/lib/client/recordings";

export const REDUCE_MOTION_KEY = "bq_reduce_motion";

export function getReduceMotion(): boolean {
  try {
    return localStorage.getItem(REDUCE_MOTION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setReduceMotion(on: boolean) {
  try {
    if (on) localStorage.setItem(REDUCE_MOTION_KEY, "1");
    else localStorage.removeItem(REDUCE_MOTION_KEY);
  } catch {}
  applyReduceMotion(on);
}

function applyReduceMotion(on: boolean) {
  document.body.classList.toggle("reduce-motion", on);
}

/** Applies per-device settings (stored in this browser) on load. */
export default function DeviceSettings() {
  useEffect(() => {
    applyReduceMotion(getReduceMotion());
    const purge = () => {
      purgeExpiredRecordings().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") purge();
    };
    purge();
    const timer = setInterval(purge, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
