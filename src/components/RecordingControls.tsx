"use client";

import { useEffect, useState } from "react";
import { deleteAllRecordings, purgeExpiredRecordings, recordingCompletionIds } from "@/lib/client/recordings";
import {
  getRecordingPreferences,
  setRecordingPreferences,
  type RecordingPreferences,
} from "@/lib/client/recording-preferences";

export default function RecordingControls({ setToast }: { setToast: (message: string) => void }) {
  const [prefs, setPrefs] = useState<RecordingPreferences>({ enabled: false, retentionDays: 7 });
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const refresh = async () => setCount((await recordingCompletionIds()).size);
  useEffect(() => {
    setPrefs(getRecordingPreferences());
    refresh();
    const changed = () => {
      setPrefs(getRecordingPreferences());
      refresh();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("bq-recordings-changed", changed);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("bq-recordings-changed", changed);
    };
  }, []);
  const update = async (next: RecordingPreferences) => {
    setBusy(true);
    try {
      setRecordingPreferences(next);
      setPrefs(next);
      await purgeExpiredRecordings();
      await refresh();
      setToast("Recording settings saved on this device");
    } catch {
      setToast("Couldn't finish updating local recording settings. Check this device's storage.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="card stack">
      <span className="eyebrow">Only on this device</span>
      <h2>Keep their stories?</h2>
      <p className="muted" style={{ margin: 0 }}>
        Recording is optional. Buddy's questions and book celebrations work with it off. Audio stays in this browser and
        is never uploaded by BookQuest.
      </p>
      <label className="row" style={{ fontWeight: 600 }}>
        <input
          type="checkbox"
          checked={prefs.enabled}
          disabled={busy}
          onChange={(e) => update({ ...prefs, enabled: e.target.checked })}
          style={{ width: 22, height: 22 }}
        />
        Record answers on this device
      </label>
      <label className="field">
        Keep recordings for
        <select
          value={prefs.retentionDays}
          disabled={busy}
          onChange={(e) =>
            update({ ...prefs, retentionDays: Number(e.target.value) as RecordingPreferences["retentionDays"] })
          }
        >
          <option value={1}>1 day</option>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
        </select>
        <small>
          Applies to existing recordings too. Expired audio is removed when you open or use BookQuest, not while this
          browser is closed. Turning recording off stops new recordings; it does not delete existing ones.
        </small>
      </label>
      <p className="muted" style={{ fontSize: 14, margin: 0 }}>
        {count} {count === 1 ? "book has" : "books have"} recordings on this device. Settings do not sync to your other
        devices.
      </p>
      <div>
        <button
          className="btn danger"
          disabled={busy || count === 0}
          onClick={async () => {
            if (!confirm("Delete all recordings stored on this device? Book progress and parent notes will remain."))
              return;
            setBusy(true);
            try {
              await deleteAllRecordings();
              await refresh();
              setToast("Recordings deleted from this device");
            } catch {
              setToast("Couldn't delete recordings. Try again or clear this site's browser storage.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete all recordings on this device
        </button>
      </div>
    </div>
  );
}
