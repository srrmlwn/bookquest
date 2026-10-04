"use client";

export default function PilotAccess({
  value,
  onChange,
  configured,
}: {
  value: string;
  onChange: (value: string) => void;
  configured: boolean;
}) {
  return (
    <div className="pilot-access">
      <span className="eyebrow">Private family pilot</span>
      {configured ? (
        <label className="field">
          Family access key
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            maxLength={256}
          />
          <small>
            A grown-up enters this once on a new device, together with the PIN. It isn't saved in browser storage.
          </small>
        </label>
      ) : (
        <p className="muted">
          New-device access is locked until the owner configures the private pilot key. Already trusted family devices
          can still use BookQuest.
        </p>
      )}
    </div>
  );
}
