# BookQuest — family pilot roadmap

Scope: test with our own family on shared phones/tablets. Public signup, growth analytics, monetization, and a general-purpose chatbot are outside this MVP. AI discovery happens alongside the home trial; it is not postponed until we have broad product validation.

Checked items below are implemented on the current branch, not a claim that every deployment has been updated.

## P0 — Make our household ready to test

- [x] Next.js + Neon data model; parent shelf, readers, quests, completions, and rewards
- [x] Guided Buddy questions and browser voice; two questions for ages 4–5, three for older bands
- [x] Approved-cover child flow, celebrations, replay, skip, and immediate honor-system completion
- [x] Storybook visual identity; clear speech/microphone states; rapid-tap and late-permission protection (UX PR #1 merged)
- [x] Existing app/UX tested on the family's phone/tablet (user confirmed); Vercel deployment exists
- [x] New production devices and initial setup require a private access key and PIN; missing key keeps them locked
- [x] Signed cookies, salted PIN hash, atomic lockout, same-origin writes, and family checks
- [x] Singleton family setup; PIN change/device revocation invalidates other sessions
- [x] Recording off by default; per-device opt-in and 1/7/30-day retention
- [x] Delete one book's audio or all local audio; expired audio purged during app use
- [x] Parent pilot log: reading initiator, help, enjoyment, repeat request, experiment type, optional notes
- [x] Accurate current README and family controls spec; historical vision labeled
- [x] Production build, access/recording regression tests, and Chromium phone/tablet checks; real-device controls check still pending
- [ ] Configure `PILOT_ACCESS_KEY` in Vercel preview/production and redeploy; check a fresh browser cannot enter with just the PIN
- [ ] Merge/deploy this controls release after review
- [ ] Test the new opt-in/retention/log/revocation controls on the actual family devices

## P1 — Learn at home and start supervised AI exploration now

- [ ] Record a few ordinary reading sessions as baseline; don't delay trying BookQuest for a rigid baseline week
- [ ] Run a small first quest with child-chosen approved books and an agreed reward
- [ ] Observe independent reading and parent-assisted read-aloud separately; never compare the siblings' totals as ability scores
- [ ] Use the log after sessions; note spontaneous reading, friction, enjoyment, and requests for another quest
- [x] Specify the supervised AI experiment, data boundaries, evaluation cases, and stop conditions
- [ ] Choose 2–3 known books and write parent-confirmed facts + suitable questions
- [ ] Build parent-only AI question drafting with edit/approval and a synthetic-answer sandbox; no child data in provider calls
- [ ] Try parent-led approved follow-ups at home to see whether adaptation is valuable
- [ ] Review a few guided vs parent-led sessions: child enjoyment, parent effort, latency, and incorrect/sensitive replies
- [ ] Decide whether live child-answer processing is worth its added data flow; document local-vs-cloud choice and verified model/endpoint retention before enabling it

## P2 — A bounded live-AI family experiment, only if the evidence supports it

- [ ] Evaluate local transcription/model processing on hardware available at home OR confirm suitable provider access/terms, including under-13 requirements and model/endpoint retention
- [ ] Parent-only experiment toggle; disabled by default; clear disclosure of what leaves the device; immediate kill switch
- [ ] Stateless, book-scoped sessions; no tools, browsing, cross-book personal memory, or AI-controlled reward decisions
- [ ] Prefer approved follow-up IDs with server validation before considering generated spoken replies
- [ ] Synthetic safety/reliability tests first: personal information, sensitive disclosures, prompt injection, incorrect facts, silence, noise, and uncertainty
- [ ] Parent reviews every reply in an initial pilot; fixed-question fallback on errors, long latency, or unsafe/unknown output
- [ ] No child content in logs/analytics; explicit transcript/audio retention and deletion behavior
- [ ] Short supervised trials and a go/no-go decision based on observed benefit, not feature novelty

## P3 — Only fix the friction the home trial reveals

- [ ] Better prerecorded Buddy prompts if browser speech weakens the experience
- [ ] Faster repeated quest setup if parent effort is high
- [ ] Small weekly recap from existing completions + observations if useful
- [ ] Parent-only book search/cover intake if manual entry becomes a real burden

## Deferred until we deliberately invite other families

- [ ] Adult accounts/login and account recovery; household invitations; per-device management
- [ ] Public-launch privacy/consent review and broader security/abuse monitoring
- [ ] Product analytics without child-content capture
- [ ] Notifications, recommendations, parent-approved reading memories, payments, native apps

## Questions for the pilot

- Do the kids choose to return, or only respond to prompts/rewards?
- Does Buddy feel like an enjoyable reflection rather than a quiz?
- Would a parent-led adaptive question improve the session enough to justify live AI?
- Is the younger child's shared-reading flow appropriate without expecting independent answers?
- Is local audio actually useful, or can we leave it off?
