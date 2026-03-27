# Bloom

> Bloom exists because mental health tools should be free, private, and gentle. Built by someone who's been through it, for people going through it. No company, no investors, no monetization — just a quiet place to show up for yourself on hard days. Bloom will always be free, and it will never sell, store, or exploit your data. If this app helps even one person feel a little less alone, it was worth building.

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
- Moderation allows venting. Don't over-filter emotional language.

## Tabs

Today | Weekly | Wellness | Progress | Community | Settings

## Deployment

https://bloom-zeta-rouge.vercel.app

## License

AGPL-3.0-only. Anyone can use, modify, and share Bloom, but derivatives must remain open source under the same terms. Nobody can take Bloom and make it proprietary or monetize a closed fork. This is intentional. Bloom is free forever.

## Cost Model

- **AI reflections:** Default to `claude-haiku-4-5-20251001` for daily journal reflections and cognitive reframes (cheap, fast). Use `claude-sonnet-4-20250514` for weekly insights and monthly reflections (richer, synthesizes more data). Model whitelist in `api/claude.js` prevents abuse.
- **Telemetry:** Batched client-side (queue + flush every 30s or on page hide/unload via sendBeacon). Reduces Vercel invocations by ~50-70%.
- **Free tier limits:** Vercel 100K invocations/month, Upstash 10K commands/day, OneSignal unlimited web push.
- **Estimated capacity:** ~400 DAU on current setup. See `SCALABILITY_PROPOSAL.md` for full analysis.

## Sustainability

- **Open Collective:** Rejected (project too early-stage for fiscal sponsorship, reapply when community grows)
- **GitHub Sponsors:** Live (via Stripe)
- **Ko-fi:** Live at ko-fi.com/bloomselfcare — linked in Settings tab and Today tab
- **Vercel OSS:** Emailed partnerships@vercel.com for sponsorship
- **Upstash OSS:** Applied via oss@upstash.com
- **Contact:** bloomhabits@proton.me

## Scaling Roadmap

See `SCALABILITY_PROPOSAL.md` for the full proposal. Summary of phases:
1. **Quick wins (done)** — Haiku/Sonnet split, telemetry batching, accessibility fixes
2. **Free AI tier (next)** — Cloudflare Workers AI as primary LLM, Claude as fallback
3. **Sustainability** — Ko-fi/GitHub Sponsors, grants (Mozilla doesn't require nonprofit), reapply Open Collective when community grows
4. **Reach** — Internationalization, university partnerships, crisis org partnerships
5. **Architecture** — Cloudflare Pages + Workers migration if Vercel limits are hit

## Admin Access

- Admin dashboard at `/admin.html`, protected by `ADMIN_KEY` environment variable in Vercel
- Share the key to grant access, change the key in Vercel env vars to revoke
- Single shared key for now, no role-based access
