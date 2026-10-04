"use client";

import { getRecordingPreferences, recordingExpired } from "./recording-preferences";

// Answer recordings live only on this device, in IndexedDB. They are never uploaded.

const DB_NAME = "bookquest";
const STORE = "recordings";

export type StoredRecording = {
  key: string; // `${completionId}:${index}`
  completionId: string;
  index: number;
  question: string;
  blob: Blob;
  createdAt: number;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "key" });
        s.createIndex("completionId", "completionId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req ? (req.result as T) : undefined);
    };
    t.onabort = t.onerror = () => {
      db.close();
      reject(t.error ?? new Error("Recording storage failed"));
    };
  });
}

export async function saveRecordings(completionId: string, items: { question: string; blob: Blob | null }[]) {
  if (!getRecordingPreferences().enabled) return;
  try {
    await purgeExpiredRecordings();
    if (!getRecordingPreferences().enabled) return;
    await tx("readwrite", (s) => {
      items.forEach((it, index) => {
        if (!it.blob) return;
        s.put({
          key: `${completionId}:${index}`,
          completionId,
          index,
          question: it.question,
          blob: it.blob,
          createdAt: Date.now(),
        });
      });
    });
  } catch {
    // Recording storage must never prevent celebrating a completed book.
    console.warn("Could not save local recordings");
  }
}

export async function getRecordings(completionId: string): Promise<StoredRecording[]> {
  try {
    await purgeExpiredRecordings();
    const rows = (await tx<StoredRecording[]>("readonly", (s) => s.index("completionId").getAll(completionId))) ?? [];
    return rows.sort((a, b) => a.index - b.index);
  } catch {
    return [];
  }
}

export async function recordingCompletionIds(): Promise<Set<string>> {
  try {
    await purgeExpiredRecordings();
    const keys = (await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? [];
    return new Set(keys.map((k) => String(k).split(":")[0]));
  } catch {
    return new Set();
  }
}

export async function deleteRecordings(completionId: string) {
  await tx("readwrite", (s) => {
    const req = s.index("completionId").openCursor(IDBKeyRange.only(completionId));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  });
  window.dispatchEvent(new Event("bq-recordings-changed"));
}

export async function deleteAllRecordings() {
  await tx("readwrite", (s) => s.clear());
  window.dispatchEvent(new Event("bq-recordings-changed"));
}

/** Expired data is removed on app use, not while a closed browser is asleep. */
export async function purgeExpiredRecordings() {
  await tx("readwrite", (s) => {
    const req = s.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (recordingExpired(Number(cursor.value.createdAt))) cursor.delete();
      cursor.continue();
    };
  });
}
