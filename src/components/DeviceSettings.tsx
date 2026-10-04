"use client";

import { useEffect } from "react";

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
  }, []);
  return null;
}
