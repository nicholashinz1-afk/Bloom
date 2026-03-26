# Bloom

Mental health self-care PWA. Compassionate, no-shame, no-pressure design philosophy.

## Architecture

- **Single-page app** — entire frontend lives in `index.html` (~11K lines)
- **Deployed on Vercel** — static hosting + serverless API functions
- **Storage:** localStorage (primary) with IndexedDB backup mirror. No user accounts/auth.
- **Data stays local** unless user explicitly uses community features (buddy, wall)

## API Endpoints (Vercel serverless)

- `api/claude.js` — proxies to Anthropic API (server-side key via `ANTHROPIC_API_KEY`)
- `api/buddy.js` — buddy pairing, messaging, nudges (Redis/Vercel KV via `REDIS_URL`)
- `api/wall.js` — community encouragement wall (same Redis backend)

## Key Environment Variables

- `ANTHROPIC_API_KEY` — Claude API (server-side only)
- `REDIS_URL` — Vercel KV / Upstash Redis
- `ONESIGNAL_APP_ID` / `ONESIGNAL_REST_API_KEY` — push notifications
- `ADMIN_BUDDY_ID` — admin buddy for auto-pairing fallback

## Content Moderation

Moderation filters in `api/buddy.js` and `api/wall.js` use a three-tier approach:
1. **Blocked** — directed harm toward others, targeted slurs
2. **Flagged (allowed but surfaces crisis resources)** — self-harm language
3. **Allowed** — venting, frustration, general expression

This is intentional for a mental health app. Don't block words like "hurt", "harm", "stupid", etc.

## Security Headers

Configured in `vercel.json`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
CORS is locked to `bloom-zeta-rouge.vercel.app` + `localhost:3000` in the API files.

## Crisis Resources

Crisis sheet (in index.html, id `crisis-sheet`) includes:
- 988 Suicide & Crisis Lifeline (US)
- Crisis Text Line (741741)
- 988lifeline.org chat
- findahelpline.com (international, 40+ languages)

Always accessible via the white heart button in the header.

## Accessibility

- Semantic HTML: h1/h2 headings, header/main/nav landmarks, tab roles, aria-labels on all inputs
- Keyboard navigation: all tabs, sheets, and features reachable; focus trapping in dialogs; focus restoration on close
- WCAG AA color contrast (4.5:1 minimum), high contrast mode toggle, larger text mode toggle
- 44px minimum touch targets, prefers-reduced-motion support
- Crisis resources always keyboard and screen reader accessible

## Mental Health Design Principles

- No consecutive streaks (tracks total days, never goes down)
- Hard day mode reduces habits to top 2, no pressure
- Low mood auto-surfaces breathing exercises and crisis resources
- AI reflections use warm witness tone, never clinical advice
- Disclaimer: "not a substitute for professional mental health care"
- Moderation allows venting — don't over-filter emotional language

## Tabs

Today | Weekly | Wellness | Progress | Community | Settings

## Deployment

https://bloom-zeta-rouge.vercel.app
