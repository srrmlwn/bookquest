"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import PinPad from "@/components/PinPad";
import PilotAccess from "@/components/PilotAccess";
import PilotLog from "@/components/PilotLog";
import RecordingControls from "@/components/RecordingControls";
import BookCover from "@/components/BookCover";
import NoDatabase from "@/components/NoDatabase";
import { getReduceMotion, setReduceMotion } from "@/components/DeviceSettings";
import { api, ApiError, resizeImage } from "@/lib/client/api";
import {
  getRate,
  getVoiceName,
  listVoices,
  setRate,
  setVoiceName,
  speak,
  speechSupported,
  unlockSpeech,
} from "@/lib/client/speech";
import { recordingSupported, startRecording, type Recording } from "@/lib/client/recorder";
import { deleteRecordings, getRecordings, recordingCompletionIds } from "@/lib/client/recordings";
import type { Observation } from "@/lib/pilot";
import { questionText } from "@/lib/questions";

type Child = { id: string; nickname: string; age_band: string; reading_mode: string; color: string };
type Book = { id: string; title: string; author: string; cover: string | null; questions: string[] };
type Quest = {
  id: string;
  child_id: string;
  goal: number;
  reward: string;
  reward_emoji: string;
  target_date: string | null;
  status: string;
  reward_given_at: string | null;
  created_at: string;
};
type Completion = { id: string; quest_id: string; book_id: string; child_id: string; question_ids: string[]; created_at: string };
type Data = {
  children: Child[];
  books: Book[];
  quests: Quest[];
  questBooks: { quest_id: string; book_id: string }[];
  completions: Completion[];
  observations: Observation[];
};

type Tab = "quests" | "shelf" | "readers" | "pilot" | "device";
const COLORS = ["teal", "apricot", "berry", "sky", "leaf", "sun"];
const COLOR_HEX: Record<string, string> = {
  teal: "#2a9d8f",
  apricot: "#f4a261",
  berry: "#d1607a",
  sky: "#5aa9e6",
  leaf: "#4fa64a",
  sun: "#d9a420",
};
const REWARD_EMOJI = ["🎁", "🎬", "🍦", "🍕", "🏞️", "🧸", "🎨", "⚽", "🎮", "🛝", "📚", "🌟"];

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function GrownupPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [noDb, setNoDb] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [access, setAccess] = useState({ required: false, configured: false });
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("quests");
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api<Data>("/api/grownup");
      setData(d);
      setAuthed(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setAuthed(false);
      else if (e instanceof ApiError && e.code === "no_database") setNoDb(true);
      else setToast("Couldn't load. Check the internet.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await api<{ setup: boolean; accessKeyRequired: boolean; accessKeyConfigured: boolean }>("/api/status");
        setAccess({ required: s.accessKeyRequired, configured: s.accessKeyConfigured });
        if (!s.setup) {
          setSetupNeeded(true);
          return;
        }
        await load();
      } catch (e) {
        if (e instanceof ApiError && e.code === "no_database") setNoDb(true);
      }
    })();
  }, [load]);

  const op = useCallback(
    async (body: Record<string, unknown>, msg?: string) => {
      try {
        const r = await api<{ id?: string }>("/api/grownup", body);
        await load();
        if (msg) setToast(msg);
        return r;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          setAuthed(false);
          return null;
        }
        setToast(e instanceof ApiError ? `Couldn't save (${e.code.replace(/_/g, " ")})` : "Couldn't save");
        return null;
      }
    },
    [load],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (noDb) return <NoDatabase />;
  if (setupNeeded) {
    router.replace("/");
    return null;
  }
  if (authed === null) return <main className="center-screen muted">Loading…</main>;
  if (!authed) {
    return (
      <main className="center-screen access-screen">
        {access.required && <PilotAccess value={accessKey} onChange={setAccessKey} configured={access.configured} />}
        <PinPad
          title="Grown-up PIN"
          busy={busy || (access.required && !access.configured)}
          error={pinError}
          onCancel={() => router.push("/")}
          onSubmit={async (pin) => {
            setBusy(true);
            setPinError(null);
            try {
              await api("/api/pin", { action: "unlock", pin, accessKey });
              setAccessKey("");
              setAccess({ required: false, configured: access.configured });
              await load();
            } catch (e) {
              if (e instanceof ApiError && e.code === "locked")
                setPinError(`Too many tries. Wait ${Math.ceil(Number(e.data.lockedSeconds ?? 300) / 60)} minutes.`);
              else if (e instanceof ApiError && e.code === "access_key_required") setPinError("Check the family access key.");
              else if (e instanceof ApiError && e.code === "pilot_access_not_configured") setPinError("The private pilot key needs to be configured first.");
              else setPinError("That PIN didn't work.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </main>
    );
  }
  if (!data) return <main className="center-screen muted">Loading…</main>;

  return (
    <main className="gu">
      <div className="gu-header">
        <Brand />
        <div className="row">
          <button
            className="btn"
            onClick={async () => {
              await api("/api/pin", { action: "lock" });
              router.push("/");
            }}
          >
            Open Kid Mode
          </button>
        </div>
      </div>
      <div className="parent-intro">
        <div>
          <span className="eyebrow">The grown-up corner</span>
          <h2>Little readers, big discoveries.</h2>
          <p>Set up their next adventure. Let Buddy take it from there.</p>
        </div>
        <div className="parent-stat">
          <strong>{data.completions.length}</strong>
          <span>books celebrated</span>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {(
          [
            ["quests", "Quests"],
            ["shelf", "Book shelf"],
            ["readers", "Readers"],
            ["pilot", "Pilot log"],
            ["device", "This device"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "quests" && <QuestsTab data={data} op={op} goTo={setTab} />}
      {tab === "shelf" && <ShelfTab data={data} op={op} />}
      {tab === "readers" && <ReadersTab data={data} op={op} />}
      {tab === "pilot" && <PilotLog children={data.children} observations={data.observations ?? []} op={op} />}
      {tab === "device" && <DeviceTab setToast={setToast} accessConfigured={access.configured} />}

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "white",
            padding: "12px 18px",
            borderRadius: 14,
            fontWeight: 600,
            zIndex: 60,
            maxWidth: "90vw",
          }}
        >
          {toast}
        </div>
      )}
    </main>
  );
}

type OpFn = (body: Record<string, unknown>, msg?: string) => Promise<{ id?: string } | null>;

// ---------------- Quests ----------------

function QuestsTab({ data, op, goTo }: { data: Data; op: OpFn; goTo: (t: Tab) => void }) {
  const [editing, setEditing] = useState<{ child: Child; quest: Quest | null } | null>(null);
  const [localRecs, setLocalRecs] = useState<Set<string>>(new Set());

  useEffect(() => {
    const refresh = () => recordingCompletionIds().then(setLocalRecs);
    refresh();
    const timer = setInterval(refresh, 60_000);
    window.addEventListener("bq-recordings-changed", refresh);
    return () => { clearInterval(timer); window.removeEventListener("bq-recordings-changed", refresh); };
  }, [data]);

  if (data.children.length === 0) {
    return (
      <div className="card empty">
        <p>Start by adding your readers.</p>
        <button className="btn" onClick={() => goTo("readers")}>
          Add a reader
        </button>
      </div>
    );
  }

  return (
    <>
      {data.children.map((child) => {
        const quest = data.quests.find((q) => q.child_id === child.id && q.status === "active") ?? null;
        const comps = quest ? data.completions.filter((c) => c.quest_id === quest.id) : [];
        const bookIds = quest ? data.questBooks.filter((qb) => qb.quest_id === quest.id).map((qb) => qb.book_id) : [];
        const past = data.quests.filter((q) => q.child_id === child.id && q.status !== "active");
        const reached = quest ? comps.length >= quest.goal : false;
        return (
          <div className="card" key={child.id}>
            <div className="row between">
              <h2>
                <span
                  className="swatch"
                  style={{ display: "inline-block", width: 14, height: 14, background: COLOR_HEX[child.color], marginRight: 8 }}
                />
                {child.nickname}
              </h2>
              <button className="btn small secondary" onClick={() => setEditing({ child, quest: null })}>
                {quest ? "New quest" : "Create quest"}
              </button>
            </div>
            {!quest ? (
              <p className="muted">No active quest.</p>
            ) : (
              <div className="stack">
                <div className="row between">
                  <div>
                    <strong>
                      {quest.reward_emoji} {quest.reward}
                    </strong>
                    <div className="muted" style={{ fontSize: 14 }}>
                      {Math.min(comps.length, quest.goal)} of {quest.goal} books · {bookIds.length} on the shelf
                      {quest.target_date ? ` · aim for ${fmtDate(quest.target_date + "T12:00:00")}` : ""}
                    </div>
                  </div>
                  <button className="btn small ghost" onClick={() => setEditing({ child, quest })}>
                    Edit
                  </button>
                </div>
                <div className="bar">
                  <span style={{ width: `${Math.min(100, (comps.length / quest.goal) * 100)}%` }} />
                </div>
                {bookIds.length - comps.length <= 0 && !reached && (
                  <div className="notice">All approved books are finished. Add more books so the quest can continue.</div>
                )}
                {reached && (
                  <div className="notice row between">
                    <span>
                      🎉 Goal reached!{" "}
                      {quest.reward_given_at ? `Reward given ${fmtDate(quest.reward_given_at)}.` : "Time for the reward."}
                    </span>
                    <div className="row">
                      {!quest.reward_given_at ? (
                        <button className="btn small" onClick={() => op({ op: "rewardGiven", id: quest.id }, "Marked as given")}>
                          Mark reward given
                        </button>
                      ) : (
                        <button
                          className="btn small secondary"
                          onClick={() => op({ op: "archiveQuest", id: quest.id }, "Quest archived")}
                        >
                          Archive quest
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {comps.length > 0 && (
                  <div>
                    <h3 style={{ margin: "6px 0" }}>Finished books</h3>
                    <div className="list">
                      {comps.map((c) => (
                        <CompletionRow
                          key={c.id}
                          completion={c}
                          book={data.books.find((b) => b.id === c.book_id)}
                          hasRecordings={localRecs.has(c.id)}
                          onUndo={async () => {
                            if (!confirm("Undo this finished book? It will go back on the shelf and progress drops by one.")) return;
                            try { await deleteRecordings(c.id); }
                            catch { alert("Couldn't delete the local recording. Try again before undoing this book."); return; }
                            await op({ op: "undoCompletion", id: c.id }, "Undone");
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {past.length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary className="muted">Past quests ({past.length})</summary>
                <div className="list" style={{ marginTop: 6 }}>
                  {past.map((q) => {
                    const n = data.completions.filter((c) => c.quest_id === q.id).length;
                    return (
                      <div className="list-item" key={q.id}>
                        <span className="grow">
                          {q.reward_emoji} {q.reward} — {n} of {q.goal} books
                          {q.reward_given_at ? " · reward given" : ""}
                        </span>
                        <span className="muted" style={{ fontSize: 14 }}>
                          {fmtDate(q.created_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>
        );
      })}
      {editing && (
        <QuestEditor
          data={data}
          child={editing.child}
          quest={editing.quest}
          op={op}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function CompletionRow({
  completion,
  book,
  hasRecordings,
  onUndo,
}: {
  completion: Completion;
  book?: Book;
  hasRecordings: boolean;
  onUndo: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [recs, setRecs] = useState<{ question: string; url: string }[] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!open || !hasRecordings) { setRecs(null); return; }
    let active = true;
    let urls: string[] = [];
    getRecordings(completion.id).then((rows) => {
      const mapped = rows.map((r) => ({ question: r.question, url: URL.createObjectURL(r.blob) }));
      urls = mapped.map((m) => m.url);
      if (active) setRecs(mapped);
      else urls.forEach((u) => URL.revokeObjectURL(u));
    });
    return () => { active = false; urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, [open, hasRecordings, completion.id]);

  const asked = completion.question_ids.map((id, i) => questionText(id) ?? book?.questions?.[Number(id.split("-")[1])] ?? `Question ${i + 1}`);

  return (
    <div className="list-item" style={{ alignItems: "flex-start" }}>
      <BookCover title={book?.title ?? "?"} cover={book?.cover ?? null} variant="thumb" />
      <div className="grow">
        <div className="row between">
          <strong>{book?.title ?? "Removed book"}</strong>
          <span className="muted" style={{ fontSize: 14 }}>
            {fmtDate(completion.created_at)}
          </span>
        </div>
        <div className="row" style={{ marginTop: 4 }}>
          <button className="btn small ghost" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : hasRecordings ? "🎧 Listen" : "Questions"}
          </button>
          <button className="btn small danger" onClick={onUndo}>
            Undo
          </button>
          {hasRecordings && <button className="btn small ghost" disabled={deleteBusy} onClick={async () => {
            if (!confirm("Delete this book's recordings from this device? Reading progress stays the same.")) return;
            setDeleteBusy(true);
            try { await deleteRecordings(completion.id); setOpen(false); setRecs(null); }
            catch { alert("Couldn't delete the recordings. Try again or clear this site's browser storage."); }
            finally { setDeleteBusy(false); }
          }}>Delete audio</button>}
        </div>
        {open && (
          <div style={{ marginTop: 6 }}>
            {hasRecordings && recs
              ? recs.map((r, i) => (
                  <div className="qa" key={i}>
                    <div>
                      <strong>Buddy:</strong> {r.question}
                    </div>
                    <audio controls preload="metadata" src={r.url} />
                  </div>
                ))
              : asked.map((q, i) => (
                  <div className="qa" key={i}>
                    <strong>Buddy:</strong> {q}
                  </div>
                ))}
            {!hasRecordings && (
              <p className="muted" style={{ fontSize: 14, margin: "4px 0 0" }}>
                No recordings on this device. They stay on the device the child used.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuestEditor({
  data,
  child,
  quest,
  op,
  onClose,
}: {
  data: Data;
  child: Child;
  quest: Quest | null;
  op: OpFn;
  onClose: () => void;
}) {
  const doneIds = useMemo(
    () => new Set(quest ? data.completions.filter((c) => c.quest_id === quest.id).map((c) => c.book_id) : []),
    [data, quest],
  );
  const [goal, setGoal] = useState(quest?.goal ?? 3);
  const [reward, setReward] = useState(quest?.reward ?? "");
  const [emoji, setEmoji] = useState(quest?.reward_emoji ?? "🎁");
  const [date, setDate] = useState(quest?.target_date ?? "");
  const [bookIds, setBookIds] = useState<Set<string>>(
    new Set(quest ? data.questBooks.filter((qb) => qb.quest_id === quest.id).map((qb) => qb.book_id) : []),
  );
  const [addingBook, setAddingBook] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) => {
    if (doneIds.has(id)) return;
    setBookIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const tooFew = bookIds.size < goal;

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 14 }}>
        {quest ? "Edit" : "New"} quest for {child.nickname}
      </h2>
      {!quest && data.quests.some((q) => q.child_id === child.id && q.status === "active") && (
        <div className="notice" style={{ marginBottom: 12 }}>
          Starting a new quest archives the current one. Finished books stay in the history.
        </div>
      )}
      <div className="stack">
        <label className="field">
          Books to finish
          <div className="row">
            <button type="button" className="btn small ghost" onClick={() => setGoal((g) => Math.max(1, g - 1))}>
              −
            </button>
            <strong style={{ fontSize: 22, minWidth: 30, textAlign: "center" }}>{goal}</strong>
            <button type="button" className="btn small ghost" onClick={() => setGoal((g) => Math.min(20, g + 1))}>
              +
            </button>
          </div>
          <small>Pick a goal that suits the book length. Three short books is a good start.</small>
        </label>
        <label className="field">
          Reward
          <input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Movie night" maxLength={80} />
        </label>
        <div className="field">
          Reward picture
          <div className="chips">
            {REWARD_EMOJI.map((e) => (
              <button
                type="button"
                key={e}
                className={emoji === e ? "chip on" : "chip"}
                style={{ fontSize: 22 }}
                onClick={() => setEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          Target date (optional, only grown-ups see it)
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <div className="field">
          Approved books ({bookIds.size} chosen)
          {data.books.length === 0 ? (
            <small>Your shelf is empty. Add a book below.</small>
          ) : (
            <div className="chips">
              {data.books.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  className={doneIds.has(b.id) ? "chip locked" : bookIds.has(b.id) ? "chip on" : "chip"}
                  onClick={() => toggle(b.id)}
                  title={doneIds.has(b.id) ? "Already finished in this quest" : undefined}
                >
                  {doneIds.has(b.id) ? "⭐ " : bookIds.has(b.id) ? "✓ " : ""}
                  {b.title}
                </button>
              ))}
            </div>
          )}
          <div>
            <button type="button" className="btn small secondary" onClick={() => setAddingBook(true)}>
              + Add a new book
            </button>
          </div>
          {tooFew && <small>Tip: approve at least {goal} books so the quest can be finished.</small>}
        </div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 6 }}>
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn"
            disabled={saving || !reward.trim()}
            onClick={async () => {
              setSaving(true);
              const r = await op(
                {
                  op: "saveQuest",
                  id: quest?.id,
                  child_id: child.id,
                  goal,
                  reward,
                  reward_emoji: emoji,
                  target_date: date || null,
                  book_ids: [...bookIds],
                },
                "Quest saved",
              );
              setSaving(false);
              if (r) onClose();
            }}
          >
            {saving ? "Saving…" : "Save quest"}
          </button>
        </div>
      </div>
      {addingBook && (
        <BookEditor
          book={null}
          op={op}
          onClose={() => setAddingBook(false)}
          onSaved={(id) => id && setBookIds((s) => new Set(s).add(id))}
        />
      )}
    </Modal>
  );
}

// ---------------- Shelf ----------------

function ShelfTab({ data, op }: { data: Data; op: OpFn }) {
  const [editing, setEditing] = useState<Book | null | "new">(null);
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2>Family book shelf</h2>
        <button className="btn small" onClick={() => setEditing("new")}>
          + Add book
        </button>
      </div>
      <p className="muted" style={{ marginTop: 0, fontSize: 15 }}>
        Books you own or borrowed. Approve them for a quest in the Quests tab. Kids only ever see approved books.
      </p>
      {data.books.length === 0 ? (
        <div className="empty">No books yet.</div>
      ) : (
        <div className="list">
          {data.books.map((b) => (
            <div className="list-item" key={b.id}>
              <BookCover title={b.title} cover={b.cover} variant="thumb" />
              <div className="grow">
                <strong>{b.title}</strong>
                <div className="muted" style={{ fontSize: 14 }}>
                  {b.author || "Unknown author"}
                  {b.questions.length ? ` · ${b.questions.length} custom question${b.questions.length > 1 ? "s" : ""}` : ""}
                </div>
              </div>
              <button className="btn small ghost" onClick={() => setEditing(b)}>
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
      {editing && <BookEditor book={editing === "new" ? null : editing} op={op} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BookEditor({
  book,
  op,
  onClose,
  onSaved,
}: {
  book: Book | null;
  op: OpFn;
  onClose: () => void;
  onSaved?: (id: string | undefined) => void;
}) {
  const [title, setTitle] = useState(book?.title ?? "");
  const [author, setAuthor] = useState(book?.author ?? "");
  const [cover, setCover] = useState<string | null>(book?.cover ?? null);
  const [q1, setQ1] = useState(book?.questions[0] ?? "");
  const [q2, setQ2] = useState(book?.questions[1] ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 14 }}>{book ? "Edit book" : "Add a book"}</h2>
      <div className="stack">
        <label className="field">
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="The Wild Robot" />
        </label>
        <label className="field">
          Author (optional)
          <input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
        </label>
        <div className="field">
          Cover photo (optional)
          <div className="cover-pick">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" />
            ) : (
              <BookCover title={title || "?"} cover={null} variant="thumb" />
            )}
            <div className="stack" style={{ gap: 6 }}>
              <label className="btn small secondary">
                {cover ? "Change photo" : "Choose photo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      setCover(await resizeImage(f));
                      setErr(null);
                    } catch {
                      setErr("Couldn't read that photo.");
                    }
                  }}
                />
              </label>
              {cover && (
                <button type="button" className="link" style={{ textAlign: "left", padding: 0 }} onClick={() => setCover(null)}>
                  Remove photo
                </button>
              )}
            </div>
          </div>
          <small>Grown-ups only. The child never uses the camera.</small>
        </div>
        <label className="field">
          Your question for this book (optional)
          <input
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            maxLength={200}
            placeholder="Why did Roz decide to help the gosling?"
          />
          <small>Buddy asks your questions first, then picks the rest from its question pool.</small>
        </label>
        <label className="field">
          Another question (optional)
          <input value={q2} onChange={(e) => setQ2(e.target.value)} maxLength={200} />
        </label>
        {err && <p className="error">{err}</p>}
        <div className="row between" style={{ marginTop: 6 }}>
          {book ? (
            <button
              className="btn danger"
              onClick={async () => {
                if (!confirm(`Remove "${book.title}" from the shelf? It also leaves any quest and its finished-book history.`))
                  return;
                const r = await op({ op: "deleteBook", id: book.id }, "Book removed");
                if (r) onClose();
              }}
            >
              Remove
            </button>
          ) : (
            <span />
          )}
          <div className="row">
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn"
              disabled={saving || !title.trim()}
              onClick={async () => {
                setSaving(true);
                const r = await op(
                  { op: book ? "updateBook" : "addBook", id: book?.id, title, author, cover, questions: [q1, q2] },
                  book ? "Book saved" : "Book added",
                );
                setSaving(false);
                if (r) {
                  onSaved?.(r.id);
                  onClose();
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Readers ----------------

function ReadersTab({ data, op }: { data: Data; op: OpFn }) {
  const [editing, setEditing] = useState<Child | null | "new">(data.children.length === 0 ? "new" : null);
  return (
    <div className="card">
      <div className="row between" style={{ marginBottom: 6 }}>
        <h2>Readers</h2>
        <button className="btn small" onClick={() => setEditing("new")}>
          + Add reader
        </button>
      </div>
      {data.children.length === 0 ? (
        <div className="empty">No readers yet.</div>
      ) : (
        <div className="list">
          {data.children.map((c) => (
            <div className="list-item" key={c.id}>
              <span className="swatch" style={{ background: COLOR_HEX[c.color], width: 28, height: 28 }} />
              <div className="grow">
                <strong>{c.nickname}</strong>
                <div className="muted" style={{ fontSize: 14 }}>
                  Age {c.age_band} · {c.reading_mode === "together" ? "reads together with a grown-up" : "reads on their own"}
                </div>
              </div>
              <button className="btn small ghost" onClick={() => setEditing(c)}>
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
      {editing && <ChildEditor child={editing === "new" ? null : editing} op={op} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ChildEditor({ child, op, onClose }: { child: Child | null; op: OpFn; onClose: () => void }) {
  const [nickname, setNickname] = useState(child?.nickname ?? "");
  const [age, setAge] = useState(child?.age_band ?? "6-7");
  const [mode, setMode] = useState(child?.reading_mode ?? "independent");
  const [color, setColor] = useState(child?.color ?? "teal");
  const [saving, setSaving] = useState(false);
  return (
    <Modal onClose={onClose}>
      <h2 style={{ marginBottom: 14 }}>{child ? "Edit reader" : "Add a reader"}</h2>
      <div className="stack">
        <label className="field">
          Nickname
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={30} />
          <small>A nickname is enough. No birthdays or last names needed.</small>
        </label>
        <div className="field">
          Age
          <div className="chips">
            {["4-5", "6-7", "8-9"].map((a) => (
              <button type="button" key={a} className={age === a ? "chip on" : "chip"} onClick={() => setAge(a)}>
                {a}
              </button>
            ))}
          </div>
          <small>Ages 4–5 get 2 simpler questions; older readers get 3.</small>
        </div>
        <div className="field">
          How they read
          <div className="chips">
            <button type="button" className={mode === "independent" ? "chip on" : "chip"} onClick={() => setMode("independent")}>
              On their own
            </button>
            <button type="button" className={mode === "together" ? "chip on" : "chip"} onClick={() => setMode("together")}>
              Together with a grown-up
            </button>
          </div>
        </div>
        <div className="field">
          Color
          <div className="row">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                aria-label={c}
                className={color === c ? "swatch on" : "swatch"}
                style={{ background: COLOR_HEX[c] }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          {child ? (
            <button
              className="btn danger"
              onClick={async () => {
                if (!confirm(`Delete ${child.nickname} and all their quests and reading history?`)) return;
                const r = await op({ op: "deleteChild", id: child.id }, "Reader deleted");
                if (r) onClose();
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="row">
            <button className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn"
              disabled={saving || !nickname.trim()}
              onClick={async () => {
                setSaving(true);
                const r = await op(
                  { op: child ? "updateChild" : "addChild", id: child?.id, nickname, age_band: age, reading_mode: mode, color },
                  "Saved",
                );
                setSaving(false);
                if (r) onClose();
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Device ----------------

function DeviceTab({ setToast, accessConfigured }: { setToast: (s: string) => void; accessConfigured: boolean }) {
  const [rate, setRateState] = useState(0.95);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState<string>("");
  const [reduce, setReduce] = useState(false);
  const [changingPin, setChangingPin] = useState<"off" | "first" | "second">("off");
  const [newPin, setNewPin] = useState("");
  const [pinErr, setPinErr] = useState<string | null>(null);

  useEffect(() => {
    setRateState(getRate());
    setVoice(getVoiceName() ?? "");
    setReduce(getReduceMotion());
    const update = () => setVoices(listVoices());
    update();
    if (speechSupported()) window.speechSynthesis.addEventListener?.("voiceschanged", update);
    return () => {
      if (speechSupported()) window.speechSynthesis.removeEventListener?.("voiceschanged", update);
    };
  }, []);

  if (changingPin !== "off") {
    return (
      <div className="card">
        <PinPad
          title={changingPin === "first" ? "New PIN (6–8 digits)" : "Type the new PIN again"}
          minLength={6}
          submitLabel={changingPin === "first" ? "Next" : "Save"}
          error={pinErr}
          onCancel={() => {
            setChangingPin("off");
            setPinErr(null);
          }}
          onSubmit={async (p) => {
            if (changingPin === "first") {
              setNewPin(p);
              setChangingPin("second");
              setPinErr(null);
              return;
            }
            if (p !== newPin) {
              setPinErr("Those didn't match. Start again.");
              setChangingPin("first");
              return;
            }
            try {
              await api("/api/pin", { action: "change", pin: p });
              setToast("PIN changed. Other devices are now locked.");
              setChangingPin("off");
            } catch {
              setPinErr("Couldn't change the PIN.");
            }
          }}
        />
      </div>
    );
  }

  return (
    <>
      <div className="card stack">
        <h2>Buddy&apos;s voice on this device</h2>
        {!speechSupported() ? (
          <p className="error">This browser can&apos;t speak. Try Safari or Chrome.</p>
        ) : (
          <>
            <label className="field">
              Voice
              <select
                value={voice}
                onChange={(e) => {
                  setVoice(e.target.value);
                  setVoiceName(e.target.value || null);
                }}
              >
                <option value="">Automatic (best available)</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
              <small>
                On iPhone and iPad, nicer voices can be downloaded in Settings → Accessibility → Spoken Content → Voices.
              </small>
            </label>
            <label className="field">
              Speed: {rate.toFixed(2)}×
              <input
                type="range"
                min={0.6}
                max={1.3}
                step={0.05}
                value={rate}
                onChange={(e) => {
                  const r = Number(e.target.value);
                  setRateState(r);
                  setRate(r);
                }}
              />
            </label>
            <div>
              <button
                className="btn secondary"
                onClick={() => {
                  unlockSpeech();
                  speak("Hi! I'm Buddy. Tell me about your book!");
                }}
              >
                🔊 Test Buddy&apos;s voice
              </button>
            </div>
          </>
        )}
      </div>
      <MicTest />
      <div className="card stack">
        <h2>Comfort</h2>
        <label className="row" style={{ fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={reduce}
            onChange={(e) => {
              setReduce(e.target.checked);
              setReduceMotion(e.target.checked);
            }}
            style={{ width: 22, height: 22 }}
          />
          Reduce motion (no bouncing or confetti)
        </label>
      </div>
      <RecordingControls setToast={setToast} />
      <div className="card stack">
        <h2>Family access</h2>
        <p className="notice">{accessConfigured ? "Private access key configured. New devices need the key and PIN." : "Private access key not configured. New production devices stay locked until the owner sets PILOT_ACCESS_KEY in Vercel."}</p>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>Changing the PIN or revoking devices locks other browsers. This device stays trusted. Other devices will need the family access key and PIN again. Local recordings are not erased remotely.</p>
        <div>
          <button className="btn secondary" onClick={() => setChangingPin("first")}>
            Change PIN
          </button>
          <button className="btn danger" style={{ marginTop: 12 }} onClick={async () => {
            if (!confirm("Lock every other trusted device? This device will stay unlocked.")) return;
            try { await api("/api/pin", { action: "revokeDevices" }); setToast("Other devices are locked"); }
            catch { setToast("Couldn’t revoke devices. Unlock the grown-up corner and try again."); }
          }}>Revoke other devices</button>
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          Tip: on a shared iPad, Guided Access (Settings → Accessibility) keeps a child inside this app.
        </p>
      </div>
    </>
  );
}

function MicTest() {
  const [state, setState] = useState<"idle" | "recording" | "done" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const runRef = useRef(0);
  const recRef = useRef<Recording | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => {
    runRef.current++;
    recRef.current?.cancel();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  return (
    <div className="card stack">
      <h2>Microphone</h2>
      <p className="muted" style={{ margin: 0, fontSize: 15 }}>
        If you choose to record answers, test the microphone before handing over the device. This three-second test stays in memory and is discarded when you leave this tab.
      </p>
      {!recordingSupported() ? <p className="muted">This browser can't record. Kids can still tell their story out loud.</p> : <div className="row">
        <button className="btn secondary" disabled={state === "recording"} onClick={async () => {
          const run = ++runRef.current;
          try {
            setState("recording");
            const rec = await startRecording();
            if (run !== runRef.current) { rec.cancel(); return; }
            recRef.current = rec;
            await new Promise((resolve) => setTimeout(resolve, 3000));
            if (run !== runRef.current) return;
            const blob = await rec.stop();
            recRef.current = null;
            if (run !== runRef.current) return;
            if (urlRef.current) URL.revokeObjectURL(urlRef.current);
            urlRef.current = blob ? URL.createObjectURL(blob) : null;
            setUrl(urlRef.current);
            setState("done");
          } catch {
            if (run !== runRef.current) return;
            recRef.current?.cancel(); recRef.current = null;
            setState("error");
          }
        }}>{state === "recording" ? "Testing microphone…" : "Test microphone"}</button>
        {url && <audio controls src={url} />}
        {state === "error" && <p className="error">Couldn't use the microphone. Check this browser's microphone permission.</p>}
      </div>}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {children}
      </div>
    </div>
  );
}
