# Bloom Success Criteria

> "If this app helps even one person feel a little less alone, it was worth building."

That's the foundation. Everything below builds on it. These criteria exist to help measure whether Bloom is reaching the people it's meant to reach, not to optimize for vanity metrics. If any metric starts pulling against the mission (privacy, gentleness, no pressure), the metric goes, not the mission.

---

## What Success Looks Like

### 1. People actually use it

Not downloads. Not signups. Active use.

| Metric | Where We Are | Next Milestone | Stretch Goal |
|--------|-------------|---------------|-------------|
| Daily active users (DAU) | Early stage | 100 DAU | 1,000 DAU |
| Weekly active users (WAU) | Early stage | 500 WAU | 5,000 WAU |
| Return rate (users who come back within 7 days) | Unknown | 30% | 50% |

**How we measure this:** Anonymous telemetry (already implemented). No tracking IDs, no user profiles. Just aggregate counts.

**What we don't measure:** Session length. Bloom isn't trying to maximize time-on-app. Someone who checks in for 2 minutes and feels better is a success, not a bounce.

### 2. People find it helpful

The real question. Hard to measure without violating privacy, but there are signals.

| Signal | How We See It |
|--------|--------------|
| Users log moods consistently (not just once) | Telemetry: repeat mood_log events |
| Users complete journal entries (not just open the tab) | Telemetry: journal_save events |
| Users return after a hard day | Telemetry: hard_day_mode activations followed by next-day sessions |
| Community wall has genuine posts | Manual review of wall content |
| Buddy system has active pairs | Redis: paired buddy count |
| Users recommend Bloom to others | Organic search traffic, word-of-mouth referrals |

**What we don't chase:** Star ratings, app store reviews, NPS scores. These optimize for marketing, not mental health.

### 3. It stays free and private

This is non-negotiable. If Bloom can't sustain itself without compromising on this, we scale down before we sell out.

| Criteria | Status |
|----------|--------|
| Zero cost to users, forever | Yes |
| No accounts, no auth, no PII collected | Yes |
| Data stays on-device unless user explicitly shares (buddy, wall) | Yes |
| No ads, no tracking pixels, no analytics vendors | Yes |
| AGPL-3.0 license (no closed forks) | Yes |
| Infrastructure costs covered by free tiers, donations, or grants | Yes (currently $0/month) |

**Success here means:** Maintaining all of the above at 10,000 users. Then at 50,000. Then at 200,000.

### 4. It's accessible to everyone

Not just English speakers. Not just people with fast internet. Not just sighted users.

| Criteria | Status | Next Step |
|----------|--------|-----------|
| WCAG AA compliance | Done | Maintain through all changes |
| Screen reader support | Done | User testing with actual screen reader users |
| Works offline (core features) | Done | Expand offline AI fallbacks |
| Mobile-friendly (PWA) | Done | Test on low-end devices |
| Internationalization | Not started | First community translation |
| Crisis resources for non-US users | Partial (findahelpline.com) | Localized crisis numbers per language |

### 5. It earns institutional trust

Bloom can help more people if counselors, therapists, and universities feel comfortable recommending it.

| Milestone | Status |
|-----------|--------|
| One licensed professional reviews and endorses Bloom | In progress |
| PsyberGuide credibility review | Submitted |
| First university counseling center recommends Bloom to students | Outreach in progress |
| First crisis organization cross-lists Bloom | Not started |
| Mozilla or equivalent grant awarded | Not started |

### 6. It survives its creator

Bloom should not be a single point of failure.

| Criteria | Status |
|----------|--------|
| Codebase is public and documented | Yes |
| CLAUDE.md captures design philosophy and architecture | Yes |
| At least one other contributor has merged a PR | Not yet |
| Succession plan if maintainer steps away | Not yet |
| Infrastructure can run unattended for 30+ days | Yes (static hosting, no manual ops) |

---

## What Success Does NOT Look Like

These are traps. They look like progress but pull against the mission.

- **Maximizing engagement.** Bloom is not social media. If someone uses it less because they're doing better, that's a win.
- **Growing at the cost of quality.** 100 users who feel genuinely supported beats 10,000 who bounced after onboarding.
- **Accepting funding with strings.** No investors, no sponsors who want influence over the product, no "freemium" upsells.
- **Adding features for the sake of adding features.** Every feature should make someone's hard day a little easier. If it doesn't, it doesn't ship.
- **Chasing press or virality.** Bloom grows by being useful, not by being trendy. Word of mouth from one person who needed it is worth more than a front-page article.

---

## Ruled Out (Don't Re-Suggest These)

Channels that have been tried or investigated and don't work for Bloom:

| Channel | Why It Doesn't Work |
|---------|-------------------|
| Reddit (r/mentalhealth, r/anxiety, r/depression, r/selfcare, etc.) | These subreddits don't allow posting self-built services. Bloom would be flagged as self-promotion. |
| Open Collective fiscal sponsorship | Rejected (March 2026). Project too early-stage. Reapply when community grows. |

This list exists so we don't waste time circling back to the same dead ends.

---

## Review Cadence

These criteria should be revisited every 3 months. Not to hit targets, but to ask: is Bloom still serving the people it was built for? If yes, keep going. If something drifted, correct it.

---

*Last updated: March 2026*
