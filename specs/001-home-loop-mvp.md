# Spec 001 — Home loop MVP (no AI)

Status: implemented; updated by [Spec 002](002-family-pilot-controls.md) for access, recordings, and parent observations.
Source: `docs/product-spec-v1.1.md`, simplified per README "Key decisions for v1".

## Goal

One complete quest loop on a shared phone or tablet: a grown-up sets up a quest, a child finishes a book, talks to Buddy, and sees progress toward the reward.

## Grown-up mode

Entered from the small lock in Kid Mode or from `/grownup`. Requires the PIN (session lasts 30 minutes).

**First visit/new device.** Production requires a private family access key. New PINs are 6–8 digits; existing configured PINs still work. PINs are stored as salted hashes. The device gets a signed trusted-device cookie (up to one year).

**Children.** Nickname, age band (`4-5`, `6-7`, `8-9`), reading mode (`independent`, `together`). At least two children supported.

**Family shelf.** Title, author (optional), cover image (optional upload, resized on the device, stored in the database), up to 2 custom questions. Books are reusable across quests.

**Quest.** One active quest per child. Goal (number of books), reward name, optional reward emoji, optional target date (shown to grown-ups only), approved books (chosen from the shelf). Editing a quest keeps existing completions.

**Review.** Per child: finished books with date, play recordings (only on the device that recorded them), undo a completion, mark the reward as given, archive the quest.

## Kid Mode

Child picker (large buttons with nicknames) → that child's quest. Each screen emphasizes one main action. Primary kid actions are at least 64px tall; secondary replay, stop, and navigation controls are smaller.

1. **My quest.** Buddy, a path of markers (filled = finished), the reward. Main button: "I finished a book!" Small lock in the corner opens grown-up mode. With no active quest, Buddy says a grown-up will set one up.
2. **Choose a book.** Grid of approved covers. Finished books are marked with a star and can't be picked again. Tapping a cover speaks its title, then asks to confirm. No books left → "Ask a grown-up to add another book."
3. **Talk to Buddy.** 3 questions (2 for age 4–5). For each: Buddy speaks the question (text shown too) → the listening state starts automatically after speech ends → the child taps "Done" (or recording stops at 90 seconds). Replay button repeats the question. Stop for now ends the session without credit and saves nothing. If the microphone is unavailable, the child answers out loud anyway and taps Done. Recording is a bonus, not a requirement.
4. **Celebrate.** One marker fills, "Book complete!" If this reaches the goal: "You earned: {reward}!" Main button: "All done" → back to My quest.

## Recordings (on the device only)

- Recording defaults to off; optional per-device opt-in and 1/7/30-day retention. See Spec 002.
- When enabled, audio is stored in IndexedDB keyed by completion ID and question index. Never uploaded.
- The microphone stops on Done, Stop, leaving the page, the page going to the background, or the 90-second cap.
- Deleting a completion (undo) deletes its recordings on that device.
- Grown-up mode has "Delete all recordings on this device."

## Question pool

`src/lib/questions.ts`. Each question has a type (`story`, `character`, `feelings`, `favorite`, `imagine`) and the youngest age band it suits. Selection rules:

1. The book's custom questions go first.
2. Fill the rest from the pool, matching the age band, each with a different type. Without custom questions, the first question is a `story` opener; parent questions otherwise go first.
3. Avoid questions this child heard in their last 3 sessions when possible.
4. Buddy's replies between questions come from a small pool of warm, generic acknowledgements. They never judge the answer.

## Data and API

Family-owned rows carry `family_id` (the family row itself has `id`; quest_books inherit ownership through their parents). Data APIs check the device cookie (kid routes) or parent session cookie (grown-up routes) on the server. Status and setup/unlock have their own access rules. Completions are unique per (quest, book), so retrying "finish" never double-counts.

## Acceptance

- A grown-up can set up two children with quests and approved books on the phone. The tablet shows them after pairing with the access key and PIN.
- A child can finish the flow after a short demonstration. Buddy speaks, the child answers, the marker fills.
- Kid Mode shows no settings, links, or unapproved books. Grown-up routes return 401 without the grown-up session.
- Finishing the same book twice counts once. Undo recalculates progress.
- The recording indicator is visible whenever the microphone is on. The microphone stops in every exit case above.
