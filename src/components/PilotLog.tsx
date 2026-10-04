"use client";

import { useState } from "react";
import { STARTED_BY, HELP, ENJOYMENT, REPEAT, EXPERIMENTS, localDate, type Observation } from "@/lib/pilot";

type Child = { id: string; nickname: string };
type Op = (body: Record<string, unknown>, message?: string) => Promise<{ id?: string } | null>;

function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="field">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function labelFor(options: readonly (readonly [string, string])[], value: string) {
  return options.find(([key]) => key === value)?.[1] ?? value;
}

export default function PilotLog({
  children,
  observations,
  op,
}: {
  children: Child[];
  observations: Observation[];
  op: Op;
}) {
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const [date, setDate] = useState(localDate);
  const [started, setStarted] = useState("unknown");
  const [help, setHelp] = useState("unknown");
  const [enjoyment, setEnjoyment] = useState("unknown");
  const [repeat, setRepeat] = useState("not_yet");
  const [experiment, setExperiment] = useState("guided");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const recent = observations.filter((o) => {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return o.observed_on >= localDate(start) && o.observed_on <= localDate();
  });

  if (!children.length)
    return (
      <div className="card empty">
        <p>Add a reader first, then record your home observations here.</p>
      </div>
    );

  return (
    <>
      <div className="card">
        <span className="eyebrow">Your family experiment</span>
        <h2 style={{ marginTop: 8 }}>What happened after the book?</h2>
        <p className="muted">
          A short parent note, not a score for your child. Log ordinary reading too, so we can compare it with
          BookQuest.
        </p>
        {recent.length > 0 && (
          <div className="pilot-summary">
            <strong>{recent.length}</strong> {recent.length === 1 ? "observation" : "observations"} this week ·{" "}
            {recent.filter((o) => o.started_by === "child").length} child-initiated ·{" "}
            {recent.filter((o) => o.enjoyment === "yes").length} enjoyed
          </div>
        )}
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            try {
              const result = await op(
                {
                  op: "addObservation",
                  child_id: childId,
                  observed_on: date,
                  started_by: started,
                  help_needed: help,
                  enjoyment,
                  repeat_quest: repeat,
                  experiment,
                  notes,
                },
                "Observation saved",
              );
              if (result) {
                setNotes("");
                setStarted("unknown");
                setHelp("unknown");
                setEnjoyment("unknown");
                setRepeat("not_yet");
              }
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="pilot-fields">
            <label className="field">
              Reader
              <select value={childId} onChange={(e) => setChildId(e.target.value)}>
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nickname}
                  </option>
                ))}
              </select>
            </label>
            <Choice label="Who started the reading?" value={started} onChange={setStarted} options={STARTED_BY} />
            <Choice label="How much help with Buddy?" value={help} onChange={setHelp} options={HELP} />
            <Choice
              label="Did they enjoy the conversation?"
              value={enjoyment}
              onChange={setEnjoyment}
              options={ENJOYMENT}
            />
          </div>
          <details className="pilot-details">
            <summary>
              Session details ·{" "}
              {experiment === "guided"
                ? "Guided Buddy"
                : experiment === "baseline"
                  ? "Ordinary reading"
                  : "Parent-led AI"}{" "}
              · {date}
            </summary>
            <div className="pilot-fields" style={{ marginTop: 16 }}>
              <label className="field">
                Date
                <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <Choice label="What did you try?" value={experiment} onChange={setExperiment} options={EXPERIMENTS} />
              <Choice label="Another quest?" value={repeat} onChange={setRepeat} options={REPEAT} />
            </div>
          </details>
          <label className="field">
            Anything you noticed? <span className="muted">Optional</span>
            <textarea
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wanted to show Buddy the funny page. Needed help with replay."
            />
            <small>Saved in your family database. Never sent to AI. Avoid private details you don't need.</small>
          </label>
          <div>
            <button className="btn" disabled={busy || !childId || !date}>
              {busy ? "Saving…" : "Save observation"}
            </button>
          </div>
        </form>
      </div>
      <div className="card">
        <h2>Your observations</h2>
        {!observations.length ? (
          <p className="muted">No notes yet. Your first session is a good place to start.</p>
        ) : (
          <div className="list">
            {observations.map((o) => (
              <div className="pilot-entry" key={o.id}>
                <div className="row between">
                  <strong>{children.find((c) => c.id === o.child_id)?.nickname ?? "Reader"}</strong>
                  <span className="muted">
                    {new Date(o.observed_on + "T12:00:00").toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="eyebrow" style={{ marginTop: 10 }}>
                  {labelFor(EXPERIMENTS, o.experiment)}
                </div>
                <p className="muted">
                  {labelFor(STARTED_BY, o.started_by)} · {labelFor(HELP, o.help_needed)} ·{" "}
                  {labelFor(ENJOYMENT, o.enjoyment)} · {labelFor(REPEAT, o.repeat_quest)}
                </p>
                {o.notes && <p className="pilot-note">{o.notes}</p>}
                <button
                  className="btn small ghost"
                  disabled={deleting === o.id}
                  onClick={async () => {
                    if (!confirm("Delete this observation?")) return;
                    setDeleting(o.id);
                    try {
                      await op({ op: "deleteObservation", id: o.id }, "Observation deleted");
                    } finally {
                      setDeleting(null);
                    }
                  }}
                >
                  Delete note
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="muted" style={{ fontSize: 12 }}>
          Shows the latest 200 observations. A few family sessions help us learn about usability, not prove a lasting
          reading habit.
        </p>
      </div>
    </>
  );
}
