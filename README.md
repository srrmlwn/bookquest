# BookQuest

A family reading companion. A grown-up sets up a quest (a few books toward a reward), the child reads a real book away from the screen, then comes back to tell **Buddy** — a friendly reading character — about it, and watches their progress toward the reward.

The full product thinking lives in [`docs/product-spec-v1.1.md`](docs/product-spec-v1.1.md). This README records what we are actually building first and why it differs from that spec.

## What we're testing (success criteria)

A two-week home pilot with our own two kids. It works if:

- The kids pick up a book **without being reminded** more often than in a rough baseline week.
- They enjoy the Buddy chat and ask for another quest after the first reward.
- Grown-up effort stays small: a few minutes to set up a quest, under a minute per book to review.

A completed quest on its own does not count as success. Two kids over two weeks tells us about usability, not lasting habits.

## Key decisions for v1

| Decision | Choice | Why |
|---|---|---|
| AI | **None in v1.** Buddy asks questions from a static pool, plus optional grown-up-written questions per book. | Ship faster, no cost, no risk of invented plot details. Tests whether the quest + talk loop works before paying for AI. |
| Buddy's voice | Browser speech synthesis (built into the device). | Free, no key, works offline. Later: pre-generate audio files for the fixed pool if the voice sounds robotic. |
| Child's answers | **Recorded on the device only** (IndexedDB). Never uploaded. Grown-up can play them back on that device. | A window into the child's ideas without storing kids' voices on a server. |
| Completion | **Honor system.** Answering Buddy's questions completes the book immediately; a grown-up can undo it. | For a 5-year-old, "ask your grown-up" means no celebration. False "no"s hurt more than free passes during a pilot. |
| Security | One grown-up PIN (set on first visit, stored hashed). A device that entered the PIN can run Kid Mode; grown-up mode re-asks for the PIN. No accounts. | Enough for one household. Every record carries a `family_id` so real sign-in is a small change later. |
| Books | Grown-up types title + author, optional cover photo upload, optional 1–2 custom questions. No search, no scanning. | Matches the spec's MVP; keeps the child's world closed to approved books. |
| Platform | Mobile-friendly web app: Next.js on Vercel, Neon Postgres. | Works on the family phone and tablet without app stores. |

Deferred until after the pilot: AI conversation and assessment, server-side recordings, book search and photo intake, multi-family accounts, consent flows, notifications. See [`TODO.md`](TODO.md).

## How it works

```
Grown-up mode (PIN)                      Kid Mode (no PIN on a trusted device)
──────────────────                       ─────────────────────────────────────
Add child (nickname, age band)    ──▶    1. My quest: path of book markers + reward
Add books to the family shelf            2. Choose a book (approved covers only)
Create quest: goal, reward, books        3. Talk to Buddy: 3 spoken questions,
Review: finished books, play                child answers out loud (recorded locally)
  recordings, undo, mark reward given    4. Celebrate: marker fills, "All done"
```

- **Question pool:** [`src/lib/questions.ts`](src/lib/questions.ts) — tagged by type (story, character, feelings, favorite, imagine) and age band. Each session picks 3 with different types, avoiding questions this child saw recently. Grown-up questions for that book go first.
- **Data:** families → children → quests → quest_books ← books; completions (unique per quest + book). See [`src/lib/schema.ts`](src/lib/schema.sql). Tables are created automatically on first request.

## Running locally

```bash
npm install
DATABASE_URL=postgres://... npm run dev
```

## Repo layout

- `README.md` — this file
- `TODO.md` — task list and status
- `specs/` — one markdown spec per feature in development
- `docs/` — the original product specification
