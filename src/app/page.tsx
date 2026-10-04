"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Brand from "@/components/Brand";
import Buddy from "@/components/Buddy";
import PinPad from "@/components/PinPad";
import PilotAccess from "@/components/PilotAccess";
import NoDatabase from "@/components/NoDatabase";
import { api, ApiError } from "@/lib/client/api";
import { speak, unlockSpeech } from "@/lib/client/speech";

type Status = {
  setup: boolean;
  trusted: boolean;
  grownup: boolean;
  accessKeyRequired: boolean;
  accessKeyConfigured: boolean;
};
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
  const [accessKey, setAccessKey] = useState("");

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
      <main className="center-screen access-screen">
        {status.accessKeyRequired && (
          <PilotAccess value={accessKey} onChange={setAccessKey} configured={status.accessKeyConfigured} />
        )}
        {firstPin === null ? (
          <PinPad
            title="Welcome to BookQuest"
            hint="Grown-up: choose a PIN (6–8 digits). Use it to unlock the grown-up corner."
            minLength={6}
            busy={status.accessKeyRequired && !status.accessKeyConfigured}
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
            minLength={6}
            busy={busy || (status.accessKeyRequired && !status.accessKeyConfigured)}
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
                await api("/api/pin", { action: "setup", pin: p, accessKey });
                router.push("/grownup");
              } catch (e) {
                setError(
                  e instanceof ApiError && e.code === "access_key_required"
                    ? "Check the family access key."
                    : "Couldn't save the PIN. Try again.",
                );
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
      <main className="center-screen access-screen">
        {status.accessKeyRequired && (
          <PilotAccess value={accessKey} onChange={setAccessKey} configured={status.accessKeyConfigured} />
        )}
        <PinPad
          title="Grown-up PIN"
          hint="Unlock this device once so it can open Kid Mode."
          busy={busy || (status.accessKeyRequired && !status.accessKeyConfigured)}
          error={error}
          onSubmit={async (p) => {
            setBusy(true);
            setError(null);
            try {
              await api("/api/pin", { action: "unlock", pin: p, accessKey });
              setAccessKey("");
              await load();
            } catch (e) {
              if (e instanceof ApiError && e.code === "locked") {
                setError(`Too many tries. Wait ${Math.ceil(Number(e.data.lockedSeconds ?? 300) / 60)} minutes.`);
              } else if (e instanceof ApiError && e.code === "access_key_required")
                setError("Check the family access key.");
              else if (e instanceof ApiError && e.code === "pilot_access_not_configured")
                setError("The private pilot key needs to be configured first.");
              else setError("That PIN didn't work.");
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
        <Brand />
        <button className="lock-btn" aria-label="Grown-ups" onClick={() => router.push("/grownup")}>
          <Icon name="lock" />
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
          <div className="reader-intro">
            <span className="eyebrow">A little reading. A big adventure.</span>
            <h1 className="kid-title">Who&apos;s reading today?</h1>
            <p>Pick your name. Buddy is ready for your next story.</p>
          </div>
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
                <span className="reader-monogram" aria-hidden="true">
                  {c.nickname.charAt(0)}
                </span>
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
