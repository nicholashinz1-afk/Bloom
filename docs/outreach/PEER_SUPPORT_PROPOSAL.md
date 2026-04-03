# Bloom Peer Support Ecosystem

**A proposal for building community-driven mental health support into Bloom.**

**Website:** bloomselfcare.app
**Source code:** github.com/nicholashinz1-afk/Bloom
**Contact:** bloomhabits@proton.me

---

## Why this exists

I built Bloom after a partial hospitalization program in 2025. The tools that helped me most weren't always the clinical ones. Sometimes it was just knowing someone else was showing up too. Someone who didn't judge, didn't fix, just... was there.

Bloom already has a buddy system. Two anonymous people paired together, checking in, sending nudges, sharing the quiet work of getting through each day. It works. But right now, when someone new joins and can't find a match, they get paired with me. I'm the only fallback. That doesn't scale, and honestly, the people who've been using Bloom for months are often better at this than I am. They've lived inside the app. They know what it feels like.

This proposal is about giving that experience somewhere to go. When someone has been showing up consistently, kept their community interactions kind, and built real buddy relationships, they should have the option to help welcome the next person. Not because they earned a badge. Because they're ready, and they want to.

The growth stages in Bloom already tell this story. You start as a Seed. You grow into a Seedling, a Sprout, eventually Rooted. The final stage is called Ecosystem: "you sustain others now." Right now that's just a label. This proposal makes it real.

---

## Where we are today

Bloom's community features launched in v3.5.0. Here's what exists:

### Bloom Buddy (1-on-1 peer encouragement)
- Anonymous pairing based on shared interests (self-care, mental health, habits) and check-in frequency
- Pre-written nudges ("Thinking of you," "You've got this," "You matter") and free-form messages (200 char max)
- Multi-tier content moderation: blocked (threats, grooming, contact exchange), flagged (self-harm triggers crisis resources), soft-flagged (crude content on public wall)
- Auto-ban after 3 violations in 24 hours. Immediate ban for credible threats.
- 3-step onboarding that explains what buddies are and aren't
- Shared milestone tracking (cumulative days both showed up)

### Encouragement Wall (public, anonymous)
- Short messages of encouragement (140 char max)
- Hearts (not upvotes, just warmth)
- Daily community prompts with gentle and direct voice variants
- Same moderation pipeline as buddy system
- Content warnings on flagged posts (blurred, user can choose to reveal)

### What's missing
- The only fallback buddy is the admin (me). One person can't sustain a community.
- There's no way for experienced users to give back, even when they want to.
- Levels are cosmetic. Reaching Rooted or Ecosystem doesn't unlock anything meaningful.
- There's no group support. Everything is 1-on-1 or broadcast-to-all.
- The app has no concept of earned trust. A day-one user and an 18-month user have identical community access.

---

## The ecosystem we want to build

Four phases, each building on the last. We ship Phase 1 first, prove it works, then expand.

### Phase 1: Welcome Buddy
**The foundation. Replaces single-admin fallback with a rotation of trusted peers.**

When someone has been using Bloom for about three months, kept their community interactions clean, and built at least one positive buddy relationship, they become eligible to opt in as a Welcome Buddy. When a new user can't find a match, the system pairs them with a Welcome Buddy instead of always falling back to the admin.

The Welcome Buddy sees a private note: "This person is new to Bloom. A little warmth goes a long way." The new user sees a completely normal buddy pairing. No badges, no titles, no hierarchy.

**Why this matters:** The people best equipped to welcome someone new are the people who've been where they are. Not a developer checking his phone between commits. Real peers who understand the app because they've lived inside it.

### Phase 2: Encouragement Roles
**Trusted users help shape the community's voice.**

- **Community Prompt Contributors:** Users who've been around ~5 months can submit daily prompts that enter the rotation pool (moderated before going live). Right now there are 20 prompts written by one person. The best prompts will come from the community itself.
- **Encouragement Seeders:** Subtle ability to amplify wall posts. Not upvoting. More like tending a garden. Making sure the kind words don't get buried.

### Phase 3: Support Circles
**Small async group spaces around shared experiences.**

Groups of 3-5 people, organized by theme (anxiety, grief, school stress, recovery, creative burnout). Not chat rooms. More like shared journals. Someone posts a reflection, others respond when they're ready. Everything is moderated before it becomes visible to the group.

Async is a deliberate choice:
- **For safety:** Every message passes through the moderation pipeline before anyone sees it. Zero exposure to harmful content.
- **For philosophy:** Bloom says "show up when you can." Real-time chat creates pressure to respond immediately. That's the opposite of what this app is about.
- **For infrastructure:** Bloom runs on Vercel serverless + Redis. Async fits perfectly. Real-time would require WebSockets and a fundamentally different architecture.

A trusted peer facilitates each circle. Not as a counselor. As someone who keeps the space warm, posts the first reflection, gently models what the space is for.

### Phase 4: Peer-Led Activities
**Experienced users guide others through Bloom's existing tools.**

- **Guided group sessions:** A peer leads a group breathing exercise, grounding session, or journaling prompt. Others participate at their own pace (async). The peer provides the framing and encouragement, not clinical instruction.
- **Companionship pairing:** Longer-term 1-on-1 relationships where someone further along walks alongside someone newer. Different from buddy (which is peer equals). We're careful with language here. "Companion," not "mentor." This isn't therapy and shouldn't feel like it.
- **Community health presence:** A simple, anonymous indicator. "3 experienced members are around right now." Not a list of names. Just a quiet signal that you're not alone.

---

## Trust system

This is the backbone. Without earned trust, none of this is safe. XP level alone doesn't make someone trustworthy. Someone could grind XP while being harmful in messages. Trust requires all of the following:

| What we check | Threshold | Why |
|---------------|-----------|-----|
| Growth stage | Rooted (15,000 XP) for Phase 1, higher for later phases | ~3 months of sustained engagement |
| Days showed up | 60+ | Proves sustained presence over time, can't be gamed in a week |
| Moderation history | Zero strikes in last 90 days | Clean community behavior, recently verified |
| Peer reports | Never blocked (0 reports resulting in block) | Never flagged by other community members |
| Buddy experience | At least one pairing with 14+ shared days | Actually used the system positively |
| Auto-ban history | Never auto-banned | No history of harmful community behavior |

### How trust works in practice

- **Calculated server-side** on every sync. Not stored on the user's device, not self-reported.
- **Opt-in only.** Meeting the criteria doesn't assign you a role. It makes you eligible. You choose.
- **Instantly revocable.** One moderation strike, one peer report, one auto-ban, and all roles are removed immediately. No warnings, no appeals through the app. The trust bar is high because the stakes are high.
- **Invisible to others.** No one can see who is a Welcome Buddy, a Seeder, or a Circle facilitator. There are no badges, no public lists, no leaderboards. The experience for new users is identical regardless of who they're paired with.
- **Admin override.** The admin dashboard can remove anyone from any role at any time.

### What makes this different from other platforms

Most peer support platforms use self-reported credentials ("I'm a trained listener") or volume metrics ("500 conversations completed"). Bloom's trust is behavioral and longitudinal. You can't fake three months of consistent, kind engagement. The moderation system has been watching the whole time.

---

## Safety architecture

This section is for the counselors, clinicians, and anyone who needs to know this is safe before recommending it.

### What peer supporters are NOT
- Not therapists. Not counselors. Not crisis responders.
- They cannot see anyone's journal, mood history, medications, or private data.
- They have no elevated permissions. Same message limits, same moderation rules, same content filtering.
- They are anonymous. No real names, no contact information, no way to connect outside Bloom.

### What peer supporters ARE
- People who've been showing up to their own self-care for months.
- People who've used the buddy system without a single moderation flag.
- People who chose to help, and can choose to stop at any time.

### Moderation is identical for everyone
- All messages (buddy, wall, circle) pass through the same multi-tier content filter.
- Blocked: threats, directed harm, slurs, grooming language, contact exchange attempts, spam.
- Flagged: self-harm language surfaces crisis resources to the recipient.
- Soft-flagged: crude content gets a content warning on the public wall, hard-blocked in buddy/circle.
- Auto-ban: 3+ blocked messages in 24 hours or any credible threat.
- Peer supporters get zero special treatment. If anything, trust revocation means they're held to a higher standard, because one violation removes their role entirely.

### Age restrictions
- Under 13: no community features at all.
- 13-15: solo features only (journaling, mood, habits, breathing). No buddy, no wall, no circles.
- 16+: full community access, including eligibility for peer support roles (if trust criteria are met).

### Crisis resources are always accessible
- The white heart button in Bloom's header provides immediate access to 988 Suicide & Crisis Lifeline, Crisis Text Line, and international resources via findahelpline.com.
- Long-press reveals discreet safety resources for users in unsafe environments (DV hotlines, web chat options that leave no call/text history).
- These are accessible everywhere: main app, lock screen, even behind the decoy mask.
- Peer supporters are never positioned as crisis support. The app handles crisis routing independently of any social feature.

### Grooming and exploitation protection
- Bloom's moderation blocks grooming patterns (age questions, location requests, requests for photos, secrecy language, meeting requests) in all community channels.
- Contact exchange is blocked server-side (phone numbers, social handles, email addresses) regardless of context.
- Client-side also warns users before sending personal information, with a two-step confirmation.
- These protections apply equally to peer supporters and regular users. Earning trust does not bypass safety filters.

### Compliance
- Credible threats are logged with metadata (timestamp, source, message excerpt) for potential law enforcement requests.
- Logs are retained for one year, accessible only to the admin.
- Alert system notifies admin via email, push notification, and webhook (Discord/Slack) for every credible threat.

---

## Technical overview

This section is for developers and potential collaborators.

### Current stack
- **Frontend:** Single-page app in `index.html` (~24K lines). No framework.
- **Backend:** Vercel serverless functions (`api/buddy.js`, `api/wall.js`, `api/claude.js`).
- **Storage:** Redis via Upstash (Vercel KV). Client-side: localStorage + IndexedDB backup.
- **Auth:** None. Device fingerprints for rate limiting and moderation tracking. Anonymous by design.
- **Moderation:** Shared module (`api/moderation.js`) with regex-based pattern matching. Multi-tier: block, flag, soft-flag.

### What changes for Phase 1 (Welcome Buddy)

**New in `api/buddy.js`:**
- `checkPeerTrust(buddyId)` function. Reads existing buddy profile, moderation strikes, and buddy lookup records. Returns eligibility boolean with reasons.
- Three new API actions: `peer-opt-in`, `peer-opt-out`, `peer-status`.
- Modified `find-match` fallback logic: before falling back to `ADMIN_BUDDY_ID`, check the peer roster. Pick a random eligible welcome buddy. Fall back to admin only if roster is empty.
- Trust re-check on every `sync` call. Auto-revoke if criteria no longer met.

**New Redis keys:**
- `bloom_peer_trust:{buddyId}` stores `{ eligible, optedIn, enrolledAt, welcomePairs }`.
- `bloom_peer_roster` stores an array of opted-in welcome buddy IDs.

**Client changes in `index.html`:**
- Level-up celebration at Rooted includes gentle invitation: "You've been showing up for a while. Want to help welcome someone new?"
- Settings toggle for Welcome Buddy (visible only when eligible).
- Private note in buddy card for welcome pairings.
- Feature highlight entry.

**Infrastructure impact:**
- Minimal. Two new Redis keys, a few KB of data. Well within Upstash free tier (10K commands/day).
- No new dependencies. No new serverless functions. Everything extends existing patterns.

### Future phase technical considerations

**Phase 3 (Support Circles)** is the biggest technical lift:
- New Redis data structures for circles: membership, message threads, facilitator assignment.
- New API endpoint (`api/circle.js`) or extended actions in `api/buddy.js`.
- All messages pre-moderated (async). No WebSocket requirement.
- Circle lifecycle: creation, joining, facilitator rotation, archiving.

**Phase 4 (Peer-Led Activities)** can likely reuse circle infrastructure:
- Guided sessions are circles with a structured prompt sequence.
- Companionship pairing reuses buddy pairing logic with longer-term matching criteria.

---

## Open questions

These are the things we'd love input on. If you're reading this, your perspective matters.

**For counseling professionals:**
1. What does responsible peer support look like in a digital mental health context? Are there frameworks or best practices we should be building on?
2. At what point does peer support risk creating a dependency dynamic? How do we design against that?
3. Are there specific scenarios where a peer supporter should be guided to disengage or redirect to professional resources? Beyond the existing crisis detection, what should trigger that?
4. How do you feel about the trust criteria? Too strict? Not strict enough? What would you add or remove?

**For developers and collaborators:**
5. The async-only approach for circles avoids real-time complexity but limits interactivity. Is there a middle ground worth exploring (e.g., short-lived sessions with pre-moderated messages and 1-2 second delivery delay)?
6. Without user accounts, trust is tied to device fingerprints. If someone switches devices, they lose their trust history. Is this acceptable, or do we need a lightweight identity system?
7. What's the right way to handle circle moderation at scale? One moderation call per message works for buddy (1-on-1), but circles multiply the surface area.

**For community members and users:**
8. Would you want to be a Welcome Buddy? What would make you say yes? What would make you hesitate?
9. What kind of support circles would be most meaningful to you? What themes or formats?
10. Is there anything about this proposal that feels like pressure, gamification, or hierarchy? If so, where? That's the opposite of what we want and we need to hear it.

---

## What's next

Phase 1 (Welcome Buddy) is ready to build. The trust system, API changes, and client UI are designed and scoped. We're starting there because it's the simplest, highest-impact change, and it proves whether earned trust translates into better community support.

Everything after Phase 1 depends on what we learn. If Welcome Buddies make the buddy experience better for new users, we expand. If we discover problems with the trust model, we fix them before adding complexity. If the community tells us circles aren't what they need, we listen.

This is a living document. It will change as we learn.

---

## Timeline

| Phase | What | Earliest start | Depends on |
|-------|------|---------------|------------|
| 1 | Welcome Buddy | Now | Nothing. Ready to build. |
| 2 | Encouragement Roles | After Phase 1 proves out | Phase 1 trust system, community prompt infrastructure |
| 3 | Support Circles | After Phase 2 | New API endpoint, circle data structures, facilitator guidelines |
| 4 | Peer-Led Activities | After Phase 3 | Circle infrastructure, activity templates, companionship matching |

No hard dates. Bloom is built by one person (with help from the community). Things ship when they're ready, not when a roadmap says they should.

---

## How to give feedback

- **Email:** bloomhabits@proton.me
- **GitHub:** github.com/nicholashinz1-afk/Bloom (issues, discussions, or PRs)
- **Ko-fi:** ko-fi.com/bloomselfcare (if you want to support the project financially)

Bloom is AGPL-3.0 licensed. Always free, always open source. If you want to help build this, the door is open.
