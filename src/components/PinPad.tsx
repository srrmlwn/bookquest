"use client";

import { useState } from "react";

/** Numeric PIN pad for grown-ups. Calls onSubmit with the digits. */
export default function PinPad({
  title,
  hint,
  error,
  busy,
  minLength = 4,
  submitLabel = "Unlock",
  onSubmit,
  onCancel,
}: {
  title: string;
  hint?: string;
  error?: string | null;
  busy?: boolean;
  minLength?: number;
  submitLabel?: string;
  onSubmit: (pin: string) => void;
  onCancel?: () => void;
}) {
  const [pin, setPin] = useState("");
  const press = (d: string) => setPin((p) => (p.length < 8 ? p + d : p));
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="pinpad">
      <h1>{title}</h1>
      {hint && <p className="muted">{hint}</p>}
      <div className="pin-dots" aria-label={`${pin.length} digits entered`}>
        {Array.from({ length: Math.max(minLength, pin.length) }).map((_, i) => (
          <span key={i} className={i < pin.length ? "dot on" : "dot"} />
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      <div className="pin-keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" onClick={() => press(d)} disabled={busy}>
            {d}
          </button>
        ))}
        <button type="button" onClick={back} disabled={busy} aria-label="Delete">
          ⌫
        </button>
        <button type="button" onClick={() => press("0")} disabled={busy}>
          0
        </button>
        <button
          type="button"
          className="pin-go"
          disabled={busy || pin.length < minLength}
          onClick={() => {
            onSubmit(pin);
            setPin("");
          }}
        >
          {submitLabel}
        </button>
      </div>
      {onCancel && (
        <button type="button" className="link" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
