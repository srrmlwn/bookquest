"use client";

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

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(req ? (req.result as T) : undefined);
    };
    t.onerror = () => reject(t.error);
  });
}

export async function saveRecordings(completionId: string, items: { question: string; blob: Blob | null }[]) {
  try {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, "readwrite");
      const s = t.objectStore(STORE);
      items.forEach((it, index) => {
        if (!it.blob) return;
        s.put({ key: `${completionId}:${index}`, completionId, index, question: it.question, blob: it.blob, createdAt: Date.now() });
      });
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  } catch (e) {
    console.warn("could not save recordings", e);
  }
}

export async function getRecordings(completionId: string): Promise<StoredRecording[]> {
  try {
    const rows = (await tx<StoredRecording[]>("readonly", (s) => s.index("completionId").getAll(completionId))) ?? [];
    return rows.sort((a, b) => a.index - b.index);
  } catch {
    return [];
  }
}

export async function recordingCompletionIds(): Promise<Set<string>> {
  try {
    const keys = (await tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys())) ?? [];
    return new Set(keys.map((k) => String(k).split(":")[0]));
  } catch {
    return new Set();
  }
}

export async function deleteRecordings(completionId: string) {
  try {
    const rows = await getRecordings(completionId);
    if (!rows.length) return;
    await tx("readwrite", (s) => {
      rows.forEach((r) => s.delete(r.key));
    });
  } catch {}
}

export async function deleteAllRecordings() {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {}
}
