# Spec 002 — Private family pilot controls

Status: implemented on `family-pilot-controls`; deployment configuration and real-device acceptance remain release steps. This is a one-household experiment, not public onboarding. The current README supersedes the original product spec where they differ.

## Access boundary

Keep a PIN gate for shared family devices. Production setup and new-device trust require a server-only `PILOT_ACCESS_KEY` (32–256 characters) in addition to the PIN; trusted-device parent re-entry needs only the PIN. Missing/invalid production configuration must not permit new-device access. Local development may omit the key. The client may learn whether the key is configured, never its value. Keep it out of URLs, browser preferences, source, and analytics.

New/change PIN: 6–8 digits; legacy configured PINs remain valid. Hash with scrypt and a random salt. Cookies are signed with a per-family secret, HttpOnly, Secure in production, SameSite=Lax: trusted device up to one year, parent authorization 30 minutes. Server ownership and parent authorization apply to all family reads/writes, including observations. Browser writes require the same Origin as the route. Five failed PIN checks produce a five-minute household lockout using an atomic counter. A unique index prevents concurrent setup from creating multiple households.

Parent **Revoke other devices** and PIN change rotate the signing secret, retaining only the current device. Revocation stops future authenticated API access; it cannot wipe remote IndexedDB, screenshots, or already-rendered pages. There is no per-device list, account login/recovery, or claim of complete public-service security.

## Local recording policy

Default: disabled, retention 7 days. Parent can enable on each browser and choose 1/7/30 days. Disabled kid sessions never request a microphone. The child can still answer out loud and finish/skip. The status must distinguish no recording, microphone preparation, microphone on, and denied/unavailable.

Save only completed-session audio; never upload it. Skipped answers and stopped sessions are discarded. Mid-session policy changes pause the conversation, release capture, and discard pending audio if recording was turned off. Check the preference again before saving. Release capture after a reply, replay, stop, backgrounding, unmount, recording errors, and late permission after cancellation. A parent microphone test is temporary and must release on exit too.

Apply retention to existing recordings using creation timestamps. Purge at startup, foregrounding, periodic active checks, and storage reads/writes. Expired data must not be offered for playback. There is no exact wall-clock deletion guarantee while the browser is closed. Audio is local browser data, not BookQuest-encrypted storage.

Parent can delete one book's audio without changing progress, or delete all audio on this device. Report storage/delete failures honestly. Undo removes local audio before removing completion. No deletion on other devices is promised.

## Parent observations

New table: `pilot_observations`, family- and child-scoped; child deletion cascades to notes. Fields: date, reading initiator, help, enjoyment, repeat-quest request, experiment type (`baseline`, `guided`, `parent_led_ai`), optional note up to 500 characters. Validate enum values, real calendar dates, and child ownership server-side. Parent may add/delete entries; child API exposes none. Notes sync in Neon and are never passed to AI. The UI returns/shows at most the latest 200; there is no automatic note-retention timer or analytics export.

Use local-calendar dates, not UTC-derived dates. Show recent observation counts, child-initiated sessions, and enjoyment as observations, not measured reading ability. Unknown/not-applicable answers are valid. Do not infer success from completed quests alone. No edit UI in this release: delete and replace a mistaken entry.

## Acceptance

- Production without the private key denies setup/new-device trust; existing trusted-device use remains possible.
- A URL visitor cannot read children, books, or observations; a child-only cookie cannot add/delete notes.
- Cross-origin writes, tampered cookies, foreign-child writes, invalid notes/dates/enums are denied.
- Concurrent setup creates one family; concurrent PIN failures cannot overwrite the lockout counter.
- Revocation and PIN change invalidate prior cookies and keep the initiating parent device usable.
- Recording off means no microphone request, no stored session audio, and normal book completion.
- Existing audio expires according to the chosen policy; per-book/all deletion preserves reading progress.
- Deletion failures are shown rather than falsely reporting success.
- Delayed permission and parent microphone-test exit never leave capture running.
- Parent log survives reload, can be deleted, and handles phone/tablet layouts without child-mode exposure.

Validation completed on this branch: production build/TypeScript checks; disposable PostgreSQL and fake IndexedDB tests covering access, lockout, revocation, observation validation/isolation, retention, deletion failures, and recording startup failures; Chromium phone/tablet checks covering opt-in/off, playback/deletion, parent note save/reload/delete, access gates, late child/parent microphone permissions, and mid-session recording disable. Screenshots were visually reviewed. None of these checks used the family's live database. Release still needs real-device microphone/speech checks.
