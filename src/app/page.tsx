"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Buddy from "@/components/Buddy";
import PinPad from "@/components/PinPad";
import NoDatabase from "@/components/NoDatabase";
import { api, ApiError } from "@/lib/client/api";
import { speak, unlockSpeech } from "@/lib/client/speech";

type Status = { setup: boolean; trusted: boolean; grownup: boolean };
type KidChild = {
  id: string;
  nickname: string;
  color: string;
  goal: number | null;
  done: number;
  reward_emoji: string | null;
};

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [noDb, setNoDb] = useState(false);
  const [children, setChildren] = useState<KidChild[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [firstPin, setFirstPin] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<Status>("/api/status");
      setStatus(s);
      if (s.trusted) {
        const r = await api<{ children: KidChild[] }>("/api/kid");
        setChildren(r.children);
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "no_database") setNoDb(true);
      else setError("Couldn't connect. Check the internet and try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (noDb) return <NoDatabase />;
  if (!status) {
    return (
      <main className="center-screen">
        {error ? (
          <div className="pinpad">
            <p className="error">{error}</p>
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

  // First visit ever: a grown-up chooses the PIN.
  if (!status.setup) {
    return (
      <main className="center-screen">
        {firstPin === null ? (
          <PinPad
            title="Welcome to BookQuest"
            hint="Grown-up: choose a PIN (4–8 digits). You'll use it to set up quests and to unlock new devices."
            submitLabel="Next"
            onSubmit={(p) => {
              setFirstPin(p);
              setError(null);
            }}
            error={error}
          />
        ) : (
          <PinPad
            title="Type the PIN again"
            busy={busy}
            submitLabel="Save"
            error={error}
            onCancel={() => setFirstPin(null)}
            onSubmit={async (p) => {
              if (p !== firstPin) {
                setError("Those PINs didn't match. Let's start over.");
                setFirstPin(null);
                return;
              }
              setBusy(true);
              try {
                await api("/api/pin", { action: "setup", pin: p });
                router.push("/grownup");
              } catch {
                setError("Couldn't save the PIN. Try again.");
                setFirstPin(null);
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </main>
    );
  }

  // This device hasn't been trusted yet.
  if (!status.trusted) {
    return (
      <main className="center-screen">
        <PinPad
          title="Grown-up PIN"
          hint="Unlock this device once so it can open Kid Mode."
          busy={busy}
          error={error}
          onSubmit={async (p) => {
            setBusy(true);
            setError(null);
            try {
              await api("/api/pin", { action: "unlock", pin: p });
              await load();
            } catch (e) {
              if (e instanceof ApiError && e.code === "locked") {
                setError(`Too many tries. Wait ${Math.ceil(Number(e.data.lockedSeconds ?? 300) / 60)} minutes.`);
              } else setError("That PIN didn't work.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </main>
    );
  }

  // Kid Mode: who's reading?
  return (
    <main className="kid">
      <div className="kid-top">
        <span />
        <button className="lock-btn" aria-label="Grown-ups" onClick={() => router.push("/grownup")}>
          🔒
        </button>
      </div>
      <Buddy size={150} mood="idle" />
      {children && children.length === 0 ? (
        <>
          <div className="speech">Hi! A grown-up will set things up soon.</div>
          <button className="btn secondary" onClick={() => router.push("/grownup")}>
            Grown-up setup
          </button>
        </>
      ) : (
        <>
          <div className="speech">Who&apos;s reading today?</div>
          <div className="child-grid">
            {(children ?? []).map((c) => (
              <button
                key={c.id}
                className={`child-card c-${c.color}`}
                onClick={() => {
                  unlockSpeech();
                  speak(`Hi ${c.nickname}!`);
                  router.push(`/kid/${c.id}`);
                }}
              >
                {c.nickname}
                {c.goal ? (
                  <small>
                    {c.reward_emoji} {Math.min(c.done, c.goal)} of {c.goal} books
                  </small>
                ) : null}
              </button>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
