# BookQuest

A private reading experiment for one family. A grown-up creates a quest, chooses a reward, and approves the books. The child reads a real book away from the screen, then tells **Buddy** about it and celebrates their progress.

**Current implementation:** a mobile-friendly Next.js web app on Vercel with Neon Postgres, guided spoken questions, optional local recordings, and a parent pilot log. There is no live AI, child transcription, account signup, or public onboarding. An internet connection is required for family data and completion; browser voice availability and offline speech depend on the chosen voice.

This README and [`TODO.md`](TODO.md) describe the current family pilot. [`specs/002-family-pilot-controls.md`](specs/002-family-pilot-controls.md) defines the controls. [`specs/003-supervised-ai-experiment.md`](specs/003-supervised-ai-experiment.md) defines the next experiment. [`docs/product-spec-v1.1.md`](docs/product-spec-v1.1.md) is the historical broader vision; its proposed account and AI features are not implemented.

## What we want to learn

Test with our own children first. Watch whether they choose another book, enjoy talking about it, need less help over time, and ask for another quest. Keep setup and review small. A completed quest is an honor-system record, not evidence of comprehension or a lasting habit. Shared read-aloud sessions with a younger sibling are useful observations, not directly comparable to independent reading.

The parent log records date, reader, who initiated reading, help needed, enjoyment, whether they asked for another quest, experiment type, and an optional short note. It can include ordinary reading without BookQuest as a baseline. Notes sync through the family database and can be deleted. They are never sent to AI. The UI shows the latest 200 observations; older notes remain in the database. No PostHog or session replay is configured.

## Family access: no signup by design

This deployment serves **one household**, not separate visitors' accounts.

- Production setup and **new-device unlock require `PILOT_ACCESS_KEY` plus the family PIN**. Without a valid server key configured, those operations stay locked. Local development may omit the key.
- The access key is a randomly generated server secret, at least 32 and at most 256 characters. It is never returned by the API or stored in browser preferences. Do not put it in `NEXT_PUBLIC_*`, URLs, source control, or analytics.
- New or changed PINs must have 6–8 digits. Existing 4–8 digit PINs continue to unlock previously configured families. PINs are salted and hashed with scrypt.
- Unlocking issues signed, HttpOnly cookies: Kid Mode trusts the device for up to one year; parent API authorization expires after 30 minutes. Production cookies use Secure and SameSite=Lax.
- Trusted family devices need only the PIN for parent re-entry. Every kid/parent data API verifies its cookie and checks family ownership on the server. Write requests require a matching browser Origin. Family responses are not cacheable.
- Five failed PIN attempts cause a five-minute household lockout; updates are atomic. Only requests past the new-device access-key check reach PIN verification. This is a small-family control, not a complete public-service abuse defense.
- Changing the PIN or choosing **Revoke other devices** rotates the signing secret. All other device and parent cookies stop working. The current device is reissued valid cookies. Changing the environment access key alone does not revoke existing cookies.
- Anyone can load the app shell and see an access gate. They cannot read the family's shelf, children, or observations merely by knowing the URL. Trusted browsers intentionally expose Kid Mode, so protect the device itself.

The database enforces one family row. An existing database with multiple family rows must be investigated before deploying this migration; it does not silently delete them. Account recovery, per-device inventories, email login, multi-family signup, and public-launch security are deferred. The deployment owner can recover the access key through Vercel; there is no self-service PIN recovery.

## Reading loop

1. **Grown-up:** add readers and books (title, optional author/cover, up to two custom questions); create a quest with a goal, reward, optional date, and approved books.
2. **Child:** choose their name, open the quest, tap **I finished a book**, and confirm a parent-approved cover.
3. **Buddy:** ask two questions for ages 4–5, or three for ages 6–7 and 8–9. Custom questions go first; remaining questions vary by age and type, avoiding recent repeats when possible.
4. **Child:** answer out loud, replay, skip without judgment, or stop for now. Buddy's acknowledgments are scripted and do not interpret the answer.
5. **Celebrate:** the book counts once per quest. A grown-up can undo completion, fulfill the reward, and log what they observed.

Kid Mode has no camera, search, purchases, external links, or open-ended AI chat. API completions contain IDs and question IDs, not audio or transcripts.

## Recording controls

**This device → Keep their stories?**

- Recording defaults to **off**, including on previously used browsers that have not opted into the new setting. With it off, kid sessions do not open the microphone. Guided questions and completion still work.
- A grown-up can opt in on each device and choose **1, 7, or 30 days**; the default retention is 7 days. Audio is saved only after a completed session, in that browser's IndexedDB. Skipped answers and stopped sessions are not retained.
- Settings are per browser and do not sync. Switching recording off stops new recordings, but does not erase existing unexpired audio. Retention changes apply to existing audio as well.
- Expired audio is purged on app startup, return to the foreground, periodic checks while open, and recording reads/writes. A closed browser cannot run a deletion timer. Expired audio is filtered/purged before it is offered for playback.
- Delete one book's audio independently of progress, or delete all recordings on the current device. Undo deletes local audio too. Other devices' recordings cannot be erased remotely.
- Local audio is not encrypted by BookQuest and is not an account backup. Browser/OS access and clearing site storage matter. Revoking a device blocks server data access, but does not wipe audio or already-rendered data on that device.
- The parent microphone test is explicitly started, stays in memory, and is discarded on leaving the tab. Recording failures do not block book celebration.

## AI: next experiment, not a broad-release dependency

Explore AI now under direct parent supervision. Start with parent-reviewed book facts and questions, then a parent-led session using fictional examples or selecting approved follow-ups locally. Actual child voice/transcript processing is a distinct opt-in experiment requiring a verified data path and appropriate provider terms (or a private local runtime). See the [AI experiment spec](specs/003-supervised-ai-experiment.md) for modes, safety tests, data boundaries, and go/no-go criteria. None of those AI integrations is enabled in this build.

## Run locally

```bash
npm ci
DATABASE_URL=postgres://... npm run dev
```

A local PostgreSQL or Neon connection is required. Tables and additive indexes are applied automatically on first database use; see [`src/lib/schema.ts`](src/lib/schema.ts). Keep database credentials outside source control.

For a private production or preview deployment:

1. Set the database URL in Vercel. Use a separate database for development/preview when possible.
2. Generate a key locally: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
3. Save the result as server-only `PILOT_ACCESS_KEY` in the desired Vercel environments, then redeploy. Use the same private value when pairing your family devices; do not paste it into GitHub.
4. Set up or unlock with the access key and PIN. Existing trusted devices continue working without re-pairing until revoked/expired.
5. Use **Open Kid Mode** before handing over the device; it clears the parent session cookie.

```bash
npm test
npm run typecheck
npm run build
```

Tests use disposable PostgreSQL through PGlite, fake IndexedDB, and controlled cookie boundaries; they never connect to the live family database. Browser/device testing still matters for speech playback and microphone permission behavior.

## Repo layout

- `TODO.md` — priorities and release/pilot status
- `specs/` — implementation and experiment specifications
- `docs/` — historical product vision
- `src/lib/auth.ts`, `src/lib/pilot-access.ts` — sessions and the private-device access gate
- `src/lib/client/recordings.ts` — local audio storage and deletion
- `src/lib/pilot.ts`, `src/components/PilotLog.tsx` — parent observations
- `tests/` — regression checks for access, observations, recording controls, and storage failures
