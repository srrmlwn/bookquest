> Historical product vision (October 3, 2026), preserved for context. This document contains planned account, AI, assessment, and privacy features that are not the current implementation. For the private one-family MVP, use [README](../README.md), [TODO](../TODO.md), [Spec 002](../specs/002-family-pilot-controls.md), and the [supervised AI experiment](../specs/003-supervised-ai-experiment.md). No live AI or account signup is enabled today.

Version 1.1 \| October 3 2026 \| Product BookQuest \| Reading character Buddy

We are building a family reading companion that helps children read physical books more often. A grown-up creates a quest, chooses a reward and adds the available books. The child reads away from the screen, returns for a short voice conversation and sees their progress toward the reward.

Our first release will be a mobile-friendly web app tested at home with our own kids. The goal is to learn whether they voluntarily pick up another book and enjoy talking about it. This document defines the product, the first build, the safety boundaries, the updated screen designs and the sequence for testing and expanding it.

## The core promise

Parents configure. Kids read and talk. The child experience is a closed reading flow with a friendly buddy, familiar book covers and a few large actions. Every book, reward and external link is controlled by a grown-up.

## The first experiment

Run two small quests over two weeks. Use books already available at home, a reward agreed with the child and voice from the first trial. Observe independently initiated reading, enjoyment, parent effort and requests for another quest. A completed quest alone does not demonstrate a lasting habit.

## How to use this document

The next sections cover vision and positioning, MVP requirements, parent and child UX, conversation design, architecture, privacy controls, acceptance criteria, a home test plan and the roadmap. The mock screens use fictional book covers as visual placeholders.

# Product vision and positioning

The long-term vision is to help a child become a willing, confident reader. Rewards provide an initial reason to start; visible progress and enjoyable conversations may help sustain the behavior. We will test that hypothesis rather than assume rewards automatically create intrinsic motivation.

## The family experience

A parent and child agree on a manageable quest, such as three short books toward a movie night. The parent adds a shelf of approved books. The child chooses from that shelf, reads and returns to tell Buddy about the story. Buddy asks a few curious questions, celebrates engagement and records completion or asks the parent to review uncertainty. The parent fulfills the reward when the quest is complete.

## Who we start with

The initial design targets children around ages five to eight who can talk about a story, with support for independent reading and reading together. A younger sibling can try a parent-assisted version with shorter questions. These are different modes of participation; we will not compare their book totals or treat conversation fluency as reading ability.

## The positioning we will test

A family reading quest for real books, with a short conversation after the story. The product should make a child excited to finish another book and share what they discovered. Its value to the parent is less prompting and a small window into the child’s ideas.

## What could become distinctive

The combination of parent-controlled quests, a voice interface and continuity across book conversations is our proposed differentiation. Later, Buddy might connect a child’s ideas across books using parent-approved memories. This is a product hypothesis, not a claim that competitors lack these features.

## Principles for the experience

- Read away from the screen; aim for a two to four minute reflection session.

- Celebrate effort and ideas. Never display grades, confidence scores or accusations.

- Let children choose among books approved by the parent. Adding another book remains a grown-up action.

- Describe Buddy as an AI reading character. Avoid emotional dependency, exclusivity or pressure to return.

- Keep rewards flexible: family experiences, privileges or a tangible gift. The parent fulfills them.

# MVP scope and functional requirements

The MVP is one complete quest loop with voice. Text entry can serve as a developer fallback, but a typing-only trial would not validate the proposed child experience. Build for shared phones and tablets before investing in native apps.

| **Area**      | **MVP requirement**                                                                                                                                    |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| Family        | Authenticated parent account; child nickname, age band and reading mode; at least two child profiles for the home trial.                               |
| Quest         | One active quest per child; positive book goal; optional target date; reward name and optional image or parent-only link.                              |
| Book shelf    | Parent enters title and author and confirms the exact edition where relevant; cover upload or a clear placeholder; assign approved books to the quest. |
| Child flow    | Open selected child mode, select an approved cover, have a bounded voice conversation, show completion or a neutral parent-review outcome.             |
| Parent review | View status and concise evidence; mark complete or keep for later; correct book identity; delete session data.                                         |
| Progress      | Count each eligible book once per quest; advance only on accepted completion; unlock reward at goal; parent marks reward fulfilled.                    |
| Controls      | Grown-up PIN gate, separate server permissions, microphone start and stop, explicit retention settings, request limits and recovery from interruption. |

## Explicitly deferred

Book search and photo recognition, retailer integrations, automatic buying, native apps, open-ended chat, school dashboards, leaderboards, book recommendations and developmental scores are outside the first build. Parent photo or scan intake belongs in a later convenience release; the child will never operate the camera.

## Counting rules

For the pilot, a book completed independently or together can count if the quest allows that reading mode. Rereading a title is welcome but counts once per quest by default. Chapter progress is deferred. Parents choose goals suitable for book length and the child, rather than equating five picture books with five novels.

## Deadline behavior

Dates are optional and visible primarily to the grown-up. Missing a date does not erase progress or create a failure screen. The parent can extend the quest or archive it without a reward. Completed books remain in the reading history.

# Parent experience and UX mocks

Grown-up Mode owns setup, camera use, book intake, reward links, permissions and review. The parent should be able to prepare a quest before handing over the device, with no administrative work required from the child.


The setup mock includes later search and photo intake. The MVP provides manual entry and cover upload; transcript display requires parent opt-in.

## Create and prepare

Choose child → set goal → choose reward → add available books → confirm reading mode → preview → open Kid Mode. Reward links remain in the parent view; the child sees only the approved reward name and image. Before handoff, the parent authorizes microphone use and confirms audio playback.

## Manage the shelf

Books belong to a reusable family shelf and are explicitly approved for each quest. In the MVP, type title and author or upload a cover. Later, parent-only search and photo intake can suggest metadata; a grown-up must confirm it before publication to the child.

## Review uncertainty

The review view distinguishes unclear speech, missing book grounding and limited conversation evidence. The parent can read a short explanation and, when retained, the transcript. Mark complete records a parent decision. Keep for later leaves the book available. Neither action is described to the child as a failed test.

## Finish and fulfill

When the goal is reached, show a parent completion notice in the app. The parent arranges the reward and marks it fulfilled. Email or push notifications can follow later. The app never promises delivery or purchases on the child’s behalf.

# Child experience and UX mocks

Kid Mode is a short, guided reading adventure. Spoken prompts mirror the visible text. Book covers, a consistent character and large controls make the flow usable without reading navigation labels.


## Screen 1 My quest

Show child nickname, Buddy, a simple path with filled progress markers and the reward. The dominant action is I finished a book. Buddy can speak the remaining goal when prompted. A small lock opens the grown-up gate; it never exposes parent content directly.

## Screen 2 Choose a book

Show only approved covers in a large grid, with completed books visibly marked and unavailable for duplicate credit. Buddy asks Which book did you finish? Tapping a cover speaks its title before confirming the choice. If the book is missing, offer Ask a grown-up to add it without opening a camera or search.

## Screen 3 Talk about the book

Buddy speaks one brief question, then a visible listening state begins after the audio finishes. Provide a large Stop button and replay control. Start with turn-based voice to make recording boundaries clear. Do not show a chat composer or offer unrelated conversation.

## Screen 4 Celebrate and leave

After accepted completion, fill one progress marker and say Book complete. The main action is All done, returning to the quest without starting another chat. If review is needed, say Thanks for telling me about your book. Let’s ask your grown-up to help finish this step. Preserve existing progress.

# Interaction states and accessibility

| **State**                 | **Required behavior**                                                                                               |
|---------------------------|---------------------------------------------------------------------------------------------------------------------|
| No quest                  | Buddy says a grown-up will help set one up; a locked grown-up action is the only path to configuration.             |
| No unread books           | Offer Ask a grown-up; preserve quest progress and avoid suggesting unapproved books.                                |
| Mic denied or unavailable | Stop recording attempts. Explain that a grown-up can help; provide parent-assisted completion.                      |
| Silence or unclear speech | One gentle retry and replay prompt; then offer a break or parent help. Do not reduce reading credit.                |
| Interrupted or offline    | Save accepted turns and session ID; pause; allow resuming or parent review. Do not invent a completed conversation. |
| Book uncertain            | Ask parent to confirm title or edition and grounding before making book-specific judgments.                         |
| Review needed             | Acknowledge the conversation without celebrating unearned quest credit; show a neutral waiting marker.              |
| Goal reached              | Celebrate once; show reward earned and All done. Parent controls fulfillment.                                       |
| Parent gate               | Require PIN or authenticated parent re-entry; rate-limit attempts; parent recovery requires authentication.         |

## Design specifications

- Primary child controls at least 64 CSS pixels high with generous spacing; no precision gestures or long press required.

- Large readable labels, strong contrast and symbols paired with text or speech. Progress uses shape and count as well as color.

- Book selection speaks the title; all prompts have replay. Let the parent adjust speech rate and reduce motion.

- Keep microphone capture visible and stop it on backgrounding, exit, timeout or playback interruption.

- Do not rely on a browser PIN to secure the device itself. Kid Mode constrains the app; a shared-device parent may also use operating-system guided access.

## Visual direction

Use a warm cream canvas, teal actions and restrained apricot accents. Buddy is a friendly reading character, not a substitute for a caregiver. Mock cover art is fictional; production uses accurate, permitted cover assets. Parent UI uses ordinary forms and navigation; child UI stays on one task at a time.

# Conversation and completion specification

The system assesses evidence of engagement with the selected book. It cannot prove that a child read the whole book, distinguish reading from hearing a summary reliably or infer ability from one conversation. Product copy should avoid claiming verification guarantees.

## Ground the book before asking details

A title and model recall are insufficient for reliable questions. Store a parent-confirmed book identity with an approved short synopsis and key story facts, or a permitted trusted source. For the home pilot, the parent can supply this context. If it is missing or ambiguous, use general reflection prompts and route completion to parent review. Never invent plot details to test a child.

## A bounded voice session

Use roughly three to five conversational turns with a two to four minute target and a hard session cap. Start with Tell me about your book. Follow the child’s answer with one question about an event, a character’s choice or a favorite part. Younger or parent-assisted readers get fewer, simpler prompts. Do not demand obscure recall or fluent speech.

## Separate the conversation from the decision

The conversation generator receives approved book context, age band and accepted session turns. A separate assessment step produces a schema-validated decision: complete, needs_parent_review or paused. Include evidence excerpts and reason codes for adult review. Assessment confidence remains internal and is not a reading score.

## Decision policy

- Complete when the accepted conversation provides enough age-appropriate, book-grounded evidence across more than a generic statement.

- Review when context is unreliable, speech is unclear, answers remain broad, the session ends early or content triggers a safety boundary.

- Pause when the child stops or the service fails. Retry safely without duplicate credit.

- After at most two clarification attempts, offer parent help. Avoid repeated probing or telling the child to reread because the model is uncertain.

## Example conversation

Buddy: Tell me about your book.  
Child: The robot was alone, then she helped an animal.  
Buddy: What made her decide to help?  
Child: It was hurt and she didn’t want it to be alone.  
Buddy: What part did you like best?  
Child: When they became friends.  
Assessment: Use approved story facts to decide whether this is meaningful evidence. These fictional answers alone are not an automatic pass rule.

## Constrain outputs

Book text, transcripts and uploaded metadata are untrusted inputs. They cannot change system rules, grant tools or request personal data. Validate and check every spoken response before playback; use prewritten fallback prompts if checks fail. Buddy has no browsing, purchasing or general-purpose tool access.

# Architecture and data model

Build a responsive web app over HTTPS with parent authentication and a server-managed child session. Start with record → transcribe → generate a checked response → synthesize speech. Streaming realtime voice can follow if turn latency harms the trial. Keep model credentials and permissions on the server.

| **Entity**         | **Essential fields and relationships**                                                                              |
|--------------------|---------------------------------------------------------------------------------------------------------------------|
| Family and parent  | Owner identity, authentication, consent record, privacy settings, PIN hash and child-session policy.                |
| Child              | Family ID, nickname, age band, reading mode; avoid exact birth date when unnecessary.                               |
| Book               | Title, author, edition or ISBN when known, cover reference, approved synopsis, grounding source and version.        |
| Quest              | Child ID, goal, optional date, approved reward, status, book eligibility rules.                                     |
| Quest book         | Quest ID, book ID, parent approval, completion eligibility and reading mode.                                        |
| Conversation       | Child, quest, book, grounding version, status, accepted turns, reason codes, retention expiry and usage cost.       |
| Completion         | Quest and book, accepted decision, source AI or parent, timestamp; uniqueness constraint prevents duplicate credit. |
| Reward fulfillment | Quest, earned timestamp, parent-confirmed fulfillment timestamp.                                                    |

## Server operations

Parent operations create and edit profiles, quests and books; open a restricted child session; review or override completion; and delete records. Child operations list only their assigned quest and approved books, start or resume a selected-book conversation, submit audio and end the session. Every operation checks family ownership and child-session scope on the server.

## State transitions

Quest: draft → active → completed → reward fulfilled, with archive available to the parent. Conversation: created → active → complete, needs parent review or paused. Book completion is written transactionally with quest progress; retries use idempotency keys. A parent override adds an audit event and recalculates progress.

## Reliability and cost

Measure turn latency and session cost, limit audio duration and tokens, and cap session retries. Estimate voice transcription, model, synthesis and storage costs from the pilot rather than assuming a price. Cache approved book grounding, not child-specific responses. Redact transcripts and identifiers from operational logs.

# Safety privacy and release requirements

The child safety promise must be implemented with application permissions and output controls. A friendly interface or a prompt alone does not create a safe environment. Complete a privacy and child-safety review before inviting families outside the household.

## Boundaries in Kid Mode

- No camera permissions or camera UI, book search, external links, purchases, ads, reward shopping or settings.

- No unrestricted AI conversation. Redirect ordinary off-topic input to the chosen book with a brief approved response.

- Do not ask for school, address, contact details, photographs or secrets. Do not offer private relationships or guilt-based reminders.

- For concerning disclosures, use an age-appropriate prewritten response encouraging help from a trusted grown-up; do not conduct an investigative interview.

- Enforce parent access on the server and restrict child sessions to one selected child. The PIN gate alone is not authorization.

## Proposed retention defaults

Process audio only for the current voice turn and discard app-held raw audio after transcription. Retain only structured completion evidence by default. Full transcripts and memorable quotes require an explicit parent opt-in with a proposed 30-day expiration for pilot transcripts. Parents can delete the child profile and associated records. Verify these promises against speech and model providers, including their own retention and logging behavior, before deployment.

## Consent and visibility

The parent receives a plain-language explanation of recording, providers, stored information and deletion before activating voice. Kid Mode shows when it is listening and provides Stop. Keep reward URLs private to grown-ups. Protect parent account recovery and do not expose child history to another family.

## Testing before wider access

Review applicable children’s privacy and consent requirements with qualified guidance before public release. Confirm provider terms permit the intended age group and use case, check data-processing options, and exercise deletion and access controls end to end. This specification proposes controls; it does not certify compliance or promise that AI responses are risk-free.

## Required safety checks

Test cross-family access, wrong-child sessions, direct parent-route requests from child tokens, PIN brute-force attempts, injected instructions inside book metadata, off-topic prompts, unsafe output fallbacks and microphone shutdown. A blocked or unreliable model response must fall back safely without awarding duplicate completion.

# Build backlog and acceptance criteria

| **Priority** | **Work item**                 | **Acceptance evidence**                                                               |
|--------------|-------------------------------|---------------------------------------------------------------------------------------|
| P0           | Family and parent permissions | Other family and child tokens cannot access parent routes or unrelated records.       |
| P0           | Quest and approved shelf      | Parent creates a quest; child sees only approved books and reward display assets.     |
| P0           | Kid mode and gate             | No prohibited controls; direct navigation still requires parent authority.            |
| P0           | Turn-based voice              | Child starts and stops; replay works; denial, silence and interruption recover.       |
| P0           | Grounded conversation         | Known book context supports questions; missing context reliably routes to review.     |
| P0           | Completion and review         | AI and parent decisions work; retrying the same action never adds a second count.     |
| P0           | Privacy controls              | Audio lifecycle and deletion verified; logs do not retain child transcript content.   |
| P1           | Celebration and polish        | Reward unlocks at goal; reduced motion and large touch targets work on trial devices. |
| P1           | Pilot instrumentation         | Record reading initiations, session outcomes, parent effort, latency and cost.        |

## Suggested two week sequence

Days 1–2: parent setup, data model, approved shelf and restricted child session. Days 3–5: child flow and voice prototype. Days 6–7: book grounding, assessment and parent override. Days 8–9: privacy controls, interruption handling and permission testing. Days 10–14: run the first home quest and fix observed friction. This is a planning estimate, not a delivery commitment; voice behavior is the main uncertainty.

## Release acceptance

A grown-up can set up and run a full quest on the actual family phone or tablet. A child can choose a cover and complete the voice flow after a brief demonstration. Unknown book facts never cause fabricated questions. Uncertainty reaches a usable parent review. Completion, reward unlock and deletion are correct. All P0 safety and permission checks pass before the home trial.

## When to cut scope

If voice is too slow, reduce response length and use prewritten prompts before expanding features. If automatic assessment is unreliable, keep voice reflection and parent completion for the pilot. If setup is slow, manually prepare a small shelf. Preserve the actual child experience while simplifying the administrative build.

# Home pilot and success measures

First observe a few ordinary reading days to establish a rough baseline. Then invite each child into a small quest with an attainable goal and a jointly chosen reward. Start with two or three short books when appropriate; five books is an example, not a requirement. Include reading together for the younger child.

## Run two quests

During the first quest, observe the full session and intervene when needed. Record each intervention rather than hiding it. On the second quest, use a comparable goal and reward and see whether the child needs less help. Test a later quest with a smaller or experiential reward to learn whether the conversation itself has appeal. Do not withhold normal family reading time to create motivation.

## What to record

| **Measure**             | **Pilot definition**                                                                        |
|-------------------------|---------------------------------------------------------------------------------------------|
| Voluntary reading       | Reading initiated by the child without a new parent reminder; note independent or shared.   |
| Meaningful completions  | Approved book completions per child per week, with reading mode and book length noted.      |
| Repeat interest         | Child asks for another quest or chooses to return after the first reward.                   |
| Conversation experience | Observed enjoyment, confusion, requests to stop and adult interventions.                    |
| Parent effort           | Minutes setting up and reviewing; number of prompts and corrections.                        |
| Assessment quality      | Parent disagrees with accepted completion or parent review, with reason.                    |
| Operational quality     | Latency per turn, interrupted sessions, failed speech turns and cost per completed session. |

## Continue or revise

Continue when the child willingly returns, reading initiation improves relative to the rough baseline and parent effort is manageable. Revise if reward chasing dominates, conversations feel like tests or frequent model errors require intervention. Stop or simplify a session if the child is distressed. Two children over two weeks provide usability insight, not statistical evidence of effectiveness or durable habit formation.

## A short observation sheet

For each session record date, child, book, who initiated reading, reading mode, prompt count, help required, what the child enjoyed, assessment outcome and one change to try. Ask What did you like? and Would you want to do this again? without coaching toward a positive response.

# Roadmap and decisions to revisit

## Phase 0 Prove the home loop

Deliver the specified web MVP, with voice, approved books and parent review. Exit when two quests reveal a repeatable enjoyable flow and the critical reliability and safety checks pass. Fix confusion before adding another feature.

## Phase 1 Improve the reading conversation

Tune question length, speech handling and latency using real sessions. Add accessibility improvements and gentle celebrations. Validate repeat use across several weeks; compare different reward types and goal sizes. Parent approval remains available even as assessment improves.

## Phase 2 Reduce grown up effort

Add parent-only book search, barcode or cover-photo intake with metadata confirmation, reusable rewards and faster quest creation. Preserve the approved-shelf boundary. A child reading an unlisted book asks a grown-up to add it; an unrestricted child intake flow is not planned.

## Phase 3 Introduce reading memories

With explicit parent permission, create recaps from accepted conversations and retain selected quotes. Buddy may refer to approved past ideas across books. Let parents inspect, correct and delete each memory. Report observed interests and examples; avoid presenting a validated reading-level assessment.

## Phase 4 Test personalization and broader use

Recommend books to the parent using approved interests and practical availability. Pilot with a small number of other families after the release review. Study whether benefits survive novelty and reward changes. Consider native apps only if device permissions, push notifications or installation friction justify the additional maintenance.

## Phase 5 Explore a sustainable business

Test a parent-paid subscription after repeat value is demonstrated. Use measured voice costs to set sensible limits. Keep purchases and any retailer links in Grown-up Mode and clearly disclose commercial relationships. Avoid child-directed advertising or incentives to keep the microphone active. Pricing and affiliate revenue remain unvalidated.

## Decisions for the first build

- Product name is BookQuest; the reading character is Buddy. GitHub repository name is bookquest. Public brand availability remains to be checked.

- Use a mobile-friendly web app first; test microphone and speech on the actual family devices.

- Voice belongs in the first child trial. Start with turn-based audio and short sessions.

- The parent approves the available books and owns every scan, search, purchase and setting.

- Treat completion as evidence of engagement, with parent review for uncertainty.

- Keep long-term memory off until parents explicitly choose what is retained.
