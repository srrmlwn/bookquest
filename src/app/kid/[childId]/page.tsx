"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Brand from "@/components/Brand";
import Buddy, { type BuddyMood } from "@/components/Buddy";
import BookCover from "@/components/BookCover";
import NoDatabase from "@/components/NoDatabase";
import { api, ApiError } from "@/lib/client/api";
import { speak, stopSpeaking, unlockSpeech } from "@/lib/client/speech";
import { recordingSupported, startRecording, type Recording } from "@/lib/client/recorder";
import { saveRecordings } from "@/lib/client/recordings";
import { ACKS, BUDDY_LINES, pickQuestions, type AgeBand, type Question } from "@/lib/questions";

type Book = { id: string; title: string; author: string; cover: string | null; questions: string[]; done: boolean };
type State = {
  child: { id: string; nickname: string; age_band: AgeBand; color: string };
  quest: { id: string; goal: number; reward: string; reward_emoji: string; done: number } | null;
  books: Book[];
  recentQuestionIds: string[];
};

type Screen = "quest" | "choose" | "talk" | "celebrate";
type TalkPhase = "speaking" | "preparing" | "listening" | "ack" | "paused" | "saving" | "saveFailed";

const MAX_ANSWER_MS = 90_000;

export default function KidPage({ params }: { params: Promise<{ childId: string }> }) {
  const { childId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [noDb, setNoDb] = useState(false);
  const [screen, setScreen] = useState<Screen>("quest");
  const [mood, setMood] = useState<BuddyMood>("idle");
  const [selected, setSelected] = useState<Book | null>(null);

  // talk session
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<TalkPhase>("speaking");
  const [caption, setCaption] = useState("");
  const [micOff, setMicOff] = useState(false);
  const answerBusyRef = useRef(false);
  const recRef = useRef<Recording | null>(null);
  const answersRef = useRef<{ question: string; blob: Blob | null }[]>([]);
  const sessionRef = useRef(0); // bumps on stop/pause so stale async steps are ignored
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionIdRef = useRef<string | null>(null);

  // celebrate
  const [celebration, setCelebration] = useState<{ done: number; goal: number; reached: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<State>(`/api/kid/${childId}`);
      setState(s);
      return s;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) router.replace("/");
      else if (e instanceof ApiError && e.code === "no_database") setNoDb(true);
      else setLoadError("Couldn't load your quest. Check the internet and try again.");
      return null;
    }
  }, [childId, router]);

  useEffect(() => {
    load();
  }, [load]);

  // ---------- helpers ----------

  const say = useCallback(async (text: string, sessionId?: number) => {
    setCaption(text);
    setMood("talking");
    await speak(text);
    if (sessionId === undefined || sessionId === sessionRef.current) setMood("idle");
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const releaseMic = useCallback(() => {
    clearTimer();
    recRef.current?.cancel();
    recRef.current = null;
  }, []);

  const abortSession = useCallback(() => {
    sessionRef.current++;
    releaseMic();
    stopSpeaking();
  }, [releaseMic]);

  // Stop everything if the page is hidden or left.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && screen === "talk" && phase !== "saving" && phase !== "saveFailed") {
        abortSession();
        setPhase("paused");
        setMood("idle");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", abortSession);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", abortSession);
    };
  }, [screen, phase, abortSession]);

  useEffect(() => () => abortSession(), [abortSession]);

  // ---------- talk session ----------

  const listen = useCallback(
    async (sid: number) => {
      if (sid !== sessionRef.current) return;
      setPhase("preparing");
      setMood("idle");
      if (!micOff && recordingSupported()) {
        try {
          const rec = await startRecording();
          if (sid !== sessionRef.current) {
            rec.cancel();
            return;
          }
          recRef.current = rec;
        } catch {
          if (sid !== sessionRef.current) return;
          setMicOff(true);
        }
      } else if (!recordingSupported()) {
        setMicOff(true);
      }
      if (sid !== sessionRef.current) return;
      setPhase("listening");
      setMood("listening");
      answerBusyRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => finishAnswerRef.current?.(), MAX_ANSWER_MS);
    },
    [micOff],
  );

  const ask = useCallback(
    async (qs: Question[], i: number, sid: number) => {
      if (sid !== sessionRef.current) return;
      setQIndex(i);
      setPhase("speaking");
      await say(qs[i].text, sid);
      await listen(sid);
    },
    [say, listen],
  );

  const save = useCallback(async () => {
    if (!state?.quest || !selected) return;
    setPhase("saving");
    setMood("happy");
    if (!completionIdRef.current) completionIdRef.current = crypto.randomUUID();
    try {
      const r = await api<{ completionId: string; done: number; goal: number }>(`/api/kid/${childId}/complete`, {
        questId: state.quest.id,
        bookId: selected.id,
        completionId: completionIdRef.current,
        questionIds: questions.map((q) => q.id),
      });
      await saveRecordings(r.completionId, answersRef.current);
      const reached = r.done >= r.goal;
      setCelebration({ done: r.done, goal: r.goal, reached });
      setScreen("celebrate");
      setMood("happy");
      await say(reached ? BUDDY_LINES.goal(state.quest.reward) : BUDDY_LINES.complete);
      setMood("happy");
    } catch {
      setPhase("saveFailed");
      setMood("idle");
      setCaption("Hmm, I couldn't save that. Let's try again!");
    }
  }, [state, selected, childId, questions, say]);

  const finishAnswer = useCallback(
    async (skip = false) => {
      if (answerBusyRef.current) return;
      answerBusyRef.current = true;
      setPhase("ack");
      setMood("idle");
      const sid = sessionRef.current;
      clearTimer();
      const rec = recRef.current;
      recRef.current = null;
      if (skip) rec?.cancel();
      const blob = rec && !skip ? await rec.stop() : null;
      if (sid !== sessionRef.current) return;
      answersRef.current[qIndex] = { question: questions[qIndex]?.text ?? "", blob };
      if (qIndex + 1 < questions.length) {
        setPhase("ack");
        await say(
          skip ? "That’s okay. Let’s try another question." : ACKS[Math.floor(Math.random() * ACKS.length)],
          sid,
        );
        if (sid !== sessionRef.current) return;
        await ask(questions, qIndex + 1, sid);
      } else {
        await save();
      }
    },
    [qIndex, questions, say, ask, save],
  );

  const finishAnswerRef = useRef<(() => void) | null>(null);
  finishAnswerRef.current = finishAnswer;

  const startTalk = useCallback(
    async (book: Book) => {
      if (!state) return;
      unlockSpeech();
      const qs = pickQuestions(state.child.age_band, book.questions ?? [], state.recentQuestionIds);
      answersRef.current = [];
      completionIdRef.current = null;
      setQuestions(qs);
      setScreen("talk");
      const sid = ++sessionRef.current;
      await say(BUDDY_LINES.start(book.title), sid);
      if (sid !== sessionRef.current) return;
      await ask(qs, 0, sid);
    },
    [state, say, ask],
  );

  const replay = useCallback(async () => {
    const sid = ++sessionRef.current;
    releaseMic();
    await ask(questions, qIndex, sid);
  }, [ask, questions, qIndex, releaseMic]);

  const resume = useCallback(async () => {
    unlockSpeech();
    const sid = ++sessionRef.current;
    await ask(questions, qIndex, sid);
  }, [ask, questions, qIndex]);

  const stopTalk = useCallback(() => {
    abortSession();
    answersRef.current = [];
    setSelected(null);
    setScreen("quest");
    setMood("idle");
  }, [abortSession]);

  // ---------- rendering ----------

  if (noDb) return <NoDatabase />;
  if (!state) {
    return (
      <main className="center-screen">
        {loadError ? (
          <div className="pinpad">
            <p className="error">{loadError}</p>
            <button className="btn" onClick={() => location.reload()}>
              Try again
            </button>
          </div>
        ) : (
          <Buddy size={120} />
        )}
      </main>
    );
  }

  const { child, quest, books } = state;
  const lockBtn = (
    <button className="lock-btn" aria-label="Grown-ups" onClick={() => router.push("/grownup")}>
      <Icon name="lock" />
    </button>
  );

  if (screen === "quest") {
    const done = quest ? Math.min(quest.done, quest.goal) : 0;
    const finished = quest ? quest.done >= quest.goal : false;
    const left = quest ? quest.goal - done : 0;
    const readBooks = books.filter((book) => book.done);
    return (
      <main className="kid">
        <div className="kid-top">
          <button className="back-btn" onClick={() => router.push("/")}>
            ← Readers
          </button>
          {lockBtn}
        </div>
        <button
          aria-label="Buddy"
          style={{ background: "none", border: "none", padding: 0 }}
          onClick={() => {
            unlockSpeech();
            if (!quest) say(BUDDY_LINES.noQuest);
            else if (finished) say(BUDDY_LINES.goal(quest.reward));
            else say(`You've read ${done} ${done === 1 ? "book" : "books"}. ${left} more to go for ${quest.reward}!`);
          }}
        >
          <Buddy size={150} mood={finished ? "happy" : mood} />
        </button>
        <span className="eyebrow">Your reading adventure</span>
        <h1 className="kid-title">{child.nickname}&apos;s quest</h1>
        {!quest ? (
          <div className="speech">{BUDDY_LINES.noQuest}</div>
        ) : (
          <>
            <div className="quest-panel">
              <div className="quest-count">
                <strong>{done}</strong>
                <span>of {quest.goal} books explored</span>
              </div>
              <div className="path" aria-label={`${done} of ${quest.goal} books read`}>
                {Array.from({ length: quest.goal }).map((_, i) => (
                  <div key={i} className={i < done ? "marker done" : "marker"}>
                    {i < done ? (
                      readBooks[i] ? (
                        <BookCover title={readBooks[i].title} cover={readBooks[i].cover} variant="thumb" />
                      ) : (
                        "★"
                      )
                    ) : (
                      ""
                    )}
                  </div>
                ))}
                <div className={finished ? "marker reward earned" : "marker reward"}>{quest.reward_emoji}</div>
              </div>
              <div className="reward-label">
                <span className="eyebrow">{finished ? "Adventure complete" : "You’re reading toward"}</span>
                {quest.reward_emoji} {quest.reward}
                <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>
                  {finished ? "You did it!" : `${left} more ${left === 1 ? "book" : "books"} to go`}
                </div>
              </div>
            </div>
            {finished ? (
              <div className="speech">Amazing reading! Ask a grown-up about your reward.</div>
            ) : (
              <button
                className="kid-btn"
                onClick={() => {
                  unlockSpeech();
                  setSelected(null);
                  setScreen("choose");
                  const remaining = books.filter((b) => !b.done);
                  say(remaining.length ? BUDDY_LINES.whichBook : BUDDY_LINES.noBooks);
                }}
              >
                I finished a book! →
              </button>
            )}
          </>
        )}
      </main>
    );
  }

  if (screen === "choose") {
    const remaining = books.filter((b) => !b.done);
    return (
      <main className="kid">
        <div className="kid-top">
          <button
            className="back-btn"
            onClick={() => {
              stopSpeaking();
              setScreen("quest");
            }}
          >
            ← Back
          </button>
          {lockBtn}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          <Buddy size={96} mood={mood} />
          <div className="speech" style={{ fontSize: 26 }}>
            {remaining.length ? BUDDY_LINES.whichBook : BUDDY_LINES.noBooks}
          </div>
        </div>
        <div className="book-grid">
          {books.map((b) => (
            <button
              key={b.id}
              className={`book-card${b.done ? " done" : ""}${selected?.id === b.id ? " selected" : ""}`}
              disabled={b.done}
              onClick={() => {
                setSelected(b);
                say(b.title);
              }}
            >
              <BookCover title={b.title} cover={b.cover} />
              {b.done && (
                <span className="star" aria-label="Already read">
                  ⭐
                </span>
              )}
              <span className="book-name">{b.title}</span>
            </button>
          ))}
        </div>
        {selected && (
          <div
            style={{
              position: "sticky",
              bottom: 16,
              display: "flex",
              justifyContent: "center",
              width: "100%",
              paddingTop: 8,
            }}
          >
            <button className="kid-btn apricot" onClick={() => startTalk(selected)}>
              Yes, I read {selected.title.length > 22 ? "this one" : selected.title}!
            </button>
          </div>
        )}
      </main>
    );
  }

  if (screen === "talk") {
    const total = questions.length;
    return (
      <main className="kid">
        <div className="kid-top">
          <div className="progress-dots" aria-label={`Question ${qIndex + 1} of ${total}`}>
            {questions.map((_, i) => (
              <span key={i} className={i <= qIndex ? "on" : ""} />
            ))}
          </div>
          <Brand />
        </div>
        <div className="talk-book">{selected?.title}</div>
        <Buddy size={170} mood={phase === "listening" ? "listening" : mood} />
        <div className="speech">{phase === "paused" ? "Let's keep talking!" : caption}</div>
        <div className="talk-status" role="status" aria-live="polite">
          {(phase === "speaking" || phase === "ack") && "Buddy’s turn · Listen to the question"}
          {phase === "preparing" && "Getting the microphone ready…"}
          {phase === "saving" && "Adding this book to your quest…"}
          {phase === "listening" &&
            (micOff ? (
              <p className="muted" style={{ fontSize: 20, margin: 0 }}>
                {BUDDY_LINES.micHelp}
              </p>
            ) : (
              <span className="listening-pill">
                <span className="rec-dot" /> Your turn · Microphone on
              </span>
            ))}
        </div>
        <div className="grow" />
        {phase === "listening" && (
          <div className="talk-actions">
            <div className="talk-controls">
              <button className="round-btn" aria-label="Hear the question again" onClick={replay}>
                <Icon name="replay" />
              </button>
              <button className="kid-btn" onClick={() => finishAnswer()}>
                ✓ Done talking
              </button>
            </div>
            <button className="skip-btn" onClick={() => finishAnswer(true)}>
              I’m not sure · Skip this one
            </button>
          </div>
        )}
        {phase === "paused" && (
          <button className="kid-btn" onClick={resume}>
            ▶ Keep going
          </button>
        )}
        {phase === "saveFailed" && (
          <button className="kid-btn" onClick={save}>
            Try again
          </button>
        )}
        {phase !== "saving" && (
          <button className="kid-btn stop" onClick={stopTalk}>
            Stop for now
          </button>
        )}
      </main>
    );
  }

  // celebrate
  const c = celebration!;
  return (
    <main className="kid">
      <Confetti />
      <div className="kid-top" />
      <span className="eyebrow">Another story in your adventure</span>
      <h1 className="celebration-title">{c.reached ? "Quest complete!" : "One for the bookshelf."}</h1>
      <Buddy size={170} mood="happy" />
      <div className="speech">{c.reached && quest ? BUDDY_LINES.goal(quest.reward) : BUDDY_LINES.complete}</div>
      {quest && (
        <div className="path">
          {Array.from({ length: quest.goal }).map((_, i) => (
            <div
              key={i}
              className={`marker${i < Math.min(c.done, c.goal) ? " done" : ""}${i === c.done - 1 ? " new" : ""}`}
            >
              {i < c.done ? "★" : ""}
            </div>
          ))}
          <div className={c.reached ? "marker reward earned" : "marker reward"}>{quest.reward_emoji}</div>
        </div>
      )}
      <p className="muted">{c.reached ? "Time to celebrate with your grown-up." : "Now go find your next story."}</p>
      <div className="grow" />
      <button
        className="kid-btn"
        onClick={async () => {
          stopSpeaking();
          setCelebration(null);
          setSelected(null);
          setMood("idle");
          await load();
          setScreen("quest");
        }}
      >
        All done
      </button>
    </main>
  );
}

function Confetti() {
  const colors = ["#2a9d8f", "#f4a261", "#d1607a", "#5aa9e6", "#f2c14e", "#7cc576"];
  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 40 }).map((_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: colors[i % colors.length],
            animationDelay: `${(i % 10) * 0.12}s`,
            animationDuration: `${2.2 + (i % 5) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}
