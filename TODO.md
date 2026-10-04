# TODO

## Now — Phase 0: home loop (no AI)

- [x] Repo docs: README, TODO, specs
- [x] Data model + auto-created tables (Neon Postgres)
- [x] Grown-up PIN: set on first visit, trusted device cookie, grown-up re-entry
- [x] Grown-up mode: children, family shelf (title, author, cover, custom questions), quest (goal, reward, approved books)
- [x] Kid Mode: My quest → Choose a book → Talk to Buddy → Celebrate
- [x] Buddy voice (browser speech) with replay; on-device recording with visible listening state and Stop
- [x] Review: finished books, play recordings on this device, undo completion, mark reward given
- [ ] Deploy to Vercel; test on the actual tablet and phone (iOS Safari microphone + audio quirks)

## Next — pilot instrumentation

- [ ] Observation sheet (per session: who started reading, help needed, what they enjoyed)
- [ ] PostHog events: session started/finished, questions answered, replays, stops, undo
- [ ] Rough baseline week before first quest

## Later (after the pilot shows the loop works)

- [ ] Pre-generated natural Buddy voice for the fixed question pool
- [ ] AI conversation that reacts to answers (grounded in grown-up-approved book facts)
- [ ] Claude-drafted book synopsis/facts for grown-up approval
- [ ] Real accounts (multi-family), consent flow, retention controls, security test suite
- [ ] Book search / cover-photo intake (grown-up only)
- [ ] Reading memories across books (parent-approved)

## Open questions

- Does the built-in browser voice sound good enough on our tablet?
- Do the kids talk to Buddy when no grown-up is in the room?
