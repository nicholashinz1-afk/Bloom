# Bloom

Mental health self-care PWA. Compassionate, no-shame, no-pressure design philosophy.

## Architecture

- **Single-page app** — vanilla JS with native ES modules (no build step, no framework)
- **`index.html`** — slim HTML shell (~370 lines), loads `js/app.js` as entry point
- **`bloom.css`** — consolidated stylesheet (~2600 lines)
- **`js/`** — 32 ES modules organized by domain (see below)
- **Deployed on Vercel** — static hosting + serverless API functions
- **Storage:** localStorage (primary) with IndexedDB backup mirror. No user accounts/auth.
- **Data stays local** unless user explicitly uses community features (buddy, wall)

## Frontend Module Structure

```
js/
├── app.js              — entry point (imports all, boots app)
├── state.js            — central state object, date helpers, load/save state
├── storage.js          — localStorage + IndexedDB wrappers
├── constants.js        — all static data (habits, levels, quotes, celebrations)
├── utils.js            — haptics, audio engine, helpers
├── icons.js            — SVG icon generators
├── ui.js               — ripple, confetti, animations
├── xp.js               — XP, levels, streaks visuals, flower SVG
├── streaks.js          — streak logic, milestones, welcome back
├── celebrate.js        — celebration effects, undo toast
├── habits.js           — habit toggle logic, completion checks
├── ai.js               — Claude API client, response rendering
├── telemetry.js        — anonymous usage tracking
├── theme.js            — color themes, seasonal accents
├── router.js           — tab switching, accessibility, focus traps
├── notifications.js    — reminders, push, session management
├── sheets.js           — bottom sheet management, science tooltips
├── whatsnew.js         — version announcements, guided tour, daily quote
├── backup.js           — export/import, encrypted backup, URL sharing
├── init.js             — OneSignal, migrations, service worker, safari checks
├── seasonal.js         — seasonal insights, weekly summary, custom check-ins
├── tabs/
│   ├── today.js        — daily habits, mood, water, food, self-care
│   ├── weekly.js       — weekly habit progress view
│   ├── wellness.js     — journal, breathing, grounding, body scan, reframing
│   ├── progress.js     — stats, XP, levels, flower, history, insights
│   ├── community.js    — encouragement wall + buddy list
│   └── settings.js     — preferences, data management, accessibility
└── features/
    ├── buddy.js        — buddy system client (pairing, messaging, nudges)
    ├── onboarding.js   — multi-step setup flow
    ├── hardday.js      — hard day mode, wind-down, monthly reflection
    ├── mood.js         — mood analytics, correlations, weekly review
    └── tutorial.js     — spotlight-based feature tour
```

**Inline onclick pattern:** HTML uses `onclick="fn()"` handlers. Each module attaches its interactive functions to `window` (e.g., `window.toggleHabit = toggleHabit`). This is a deliberate bridge pattern — migration to `addEventListener` is a future cleanup.

## API Endpoints (Vercel serverless)

- `api/claude.js` — proxies to Anthropic API (server-side key via `ANTHROPIC_API_KEY`)
- `api/buddy.js` — buddy pairing, messaging, nudges (Redis/Vercel KV via `REDIS_URL`)
- `api/wall.js` — community encouragement wall (same Redis backend)
- `api/diagnostics.js` — anonymous telemetry + admin dashboard
- `api/_shared/` — shared modules: moderation, Redis client, CORS, ID generation

## Key Environment Variables

- `ANTHROPIC_API_KEY` — Claude API (server-side only)
- `REDIS_URL` — Vercel KV / Upstash Redis
- `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` — push notifications
- `ADMIN_BUDDY_ID` — admin buddy for auto-pairing fallback

## Content Moderation

Moderation filters in `api/_shared/moderation.js` (shared by buddy.js and wall.js) use a three-tier approach:
1. **Blocked** — directed harm toward others, targeted slurs
2. **Flagged (allowed but surfaces crisis resources)** — self-harm language
3. **Allowed** — venting, frustration, general expression

This is intentional for a mental health app. Don't block words like "hurt", "harm", "stupid", etc.

## Security Headers

Configured in `vercel.json`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
CORS is locked to `bloomhabits.app` + `localhost:3000` in the API files.

## Crisis Resources

Crisis sheet (in index.html, id `crisis-sheet`) includes:
- 988 Suicide & Crisis Lifeline (US)
- Crisis Text Line (741741)
- 988lifeline.org chat
- findahelpline.com (international, 40+ languages)

Always accessible via the white heart button in the header.

## Accessibility

Basic ARIA/semantic HTML added (header, main, nav landmarks; tab roles; aria-labels).
More work needed — no full keyboard navigation, limited screen reader support beyond landmarks.

## Mental Health Design Principles

- No consecutive streaks (tracks total days, never goes down)
- Hard day mode reduces habits to top 2, no pressure
- Low mood auto-surfaces breathing exercises and crisis resources
- AI reflections use warm witness tone, never clinical advice
- Disclaimer: "not a substitute for professional mental health care"
- Moderation allows venting — don't over-filter emotional language

## Tabs

Today | Weekly | Wellness | Progress | Community | Settings

## Domain

https://bloomhabits.app
