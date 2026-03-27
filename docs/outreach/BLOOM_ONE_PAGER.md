# Bloom — Free, Private Mental Health Self-Care

**Website:** bloom-zeta-rouge.vercel.app
**Source code:** github.com/nicholashinz1-afk/Bloom
**License:** AGPL-3.0 (open source forever)
**Contact:** bloomhabits@proton.me

---

## What is Bloom?

Bloom is a free, open-source progressive web app (PWA) for daily mental health self-care. It combines mood tracking, journaling, habit building, breathing exercises, and peer encouragement into a single, gentle tool — designed for people who are going through it.

Bloom runs in any browser. No download, no account, no sign-up. Users open the link and start.

---

## Core Features

| Feature | What it does | Research basis |
|---------|-------------|----------------|
| **Mood check-ins** | Daily emotion labeling with granular options | Affect labeling reduces amygdala activity (Lieberman et al., 2007) |
| **Journaling** | Prompted expressive writing with optional AI reflection | Expressive writing reduces anxiety (Pennebaker, 1997; meta-analysis of 146 studies, Frattaroli, 2006) |
| **Habit tracking** | Daily and weekly habits with cue-based reminders | Implementation intentions increase follow-through 2-3x (Gollwitzer, 1999) |
| **Non-punitive streaks** | Tracks total days (never consecutive) — missing a day changes nothing | Occasional misses don't affect habit formation (Lally et al., 2010) |
| **Breathing exercises** | 4-7-8 technique with guided animation | Diaphragmatic breathing reduces cortisol (Ma et al., 2017) |
| **Hard day mode** | Automatically reduces habits to top 2, surfaces crisis resources | Reduces cognitive load during low-capacity moments |
| **Bloom Buddy** | Anonymous peer accountability with encouragement nudges | Social support improves behavior change and wellbeing (Holt-Lunstad et al., 2010) |
| **Small wins** | Daily positive evidence logging | Progress principle (Amabile & Kramer, 2011); counteracts negativity bias |
| **Weekly reflection** | Structured look-back on weekends | Metacognitive reflection improves outcomes 23% (Di Stefano et al., 2014) |
| **Crisis resources** | Always-accessible 988, Crisis Text Line, international helplines | One tap from any screen via the heart button |

---

## Privacy Model

- **All personal data stays on the user's device** (localStorage + IndexedDB)
- No accounts, no sign-ups, no tracking, no analytics, no ads
- Journal entries, mood logs, and habit data are never uploaded to any server
- AI reflections (optional) send only the prompt text to Anthropic's Claude API — no identity linkage
- Community features (buddy, wall) store only display names and messages on the server
- Bloom is not a HIPAA-covered entity and collects no protected health information (PHI)
- Users can export/delete all their data at any time

---

## Design Philosophy

Bloom was built by someone who's been through it, for people going through it. Key principles:

- **No shame, no pressure** — missing a day is just missing a day
- **Hard days are expected** — low mood triggers gentler interactions, not motivational pressure
- **Venting is allowed** — moderation filters block directed harm, not emotional expression
- **Not a replacement for therapy** — disclaimer is prominent and permanent
- **Accessible** — WCAG AA compliant, keyboard navigable, screen reader tested, 44px touch targets

---

## Who Bloom is For

- College and university students managing stress, anxiety, or depression
- Anyone building basic self-care habits (hydration, sleep, nourishment, movement)
- People who can't access or afford therapy and need a starting point
- Support groups or counseling centers looking for a free tool to recommend
- Anyone having a hard day who needs a quiet place to show up for themselves

---

## For Counseling Centers & Institutions

Bloom can complement existing mental health services:

- **Zero cost** — No licensing fees, no per-seat pricing, no contracts
- **Zero IT overhead** — PWA runs in any browser, nothing to install or maintain
- **No data liability** — All data stays on the student's device; no PHI, no FERPA concerns
- **Crisis integration** — 988 Lifeline, Crisis Text Line, and international resources always one tap away
- **Open source** — Full source code is public and auditable under AGPL-3.0

### Possible use cases
- Recommended as a between-session tool for students in counseling
- Shared on counseling center websites as a free self-care resource
- Used in wellness workshops or orientation programming
- Offered as an alternative for students on therapy waitlists

---

## Technical Details

- Single-page PWA (~11K lines), deployed on Vercel (static + serverless)
- AI reflections via Anthropic Claude API (Haiku for daily, Sonnet for weekly/monthly)
- Community features backed by Redis/Upstash
- Push notifications via OneSignal (optional)
- Works offline after first load (service worker)

---

## About

Bloom exists because mental health tools should be free, private, and gentle. No company, no investors, no monetization. AGPL-3.0 licensed — it will always be open source and free.

If you'd like to learn more, provide feedback, or discuss a pilot: **bloomhabits@proton.me**
