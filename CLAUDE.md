# Bloom

> Bloom exists because mental health tools should be free, private, and gentle. Built by someone who's been through it, for people going through it. No company, no investors, no monetization — just a quiet place to show up for yourself. Bloom will always be free, and it will never sell, store, or exploit your data. If this app helps even one person feel a little less alone, it was worth building.

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

Moderation filters in `api/buddy.js` and `api/wall.js` use a multi-tier approach:
1. **Blocked** — directed harm toward others, targeted slurs
2. **Blocked** — grooming/predatory language (age, location, school questions, secrecy, requests to meet)
3. **Blocked** — contact exchange (phone numbers, social media handles, requests to move off-platform)
4. **Blocked (buddy only)** — crude/sexual content is hard-blocked in 1-on-1 buddy messages, soft-flagged on the public wall
5. **Auto-ban** — 3+ blocked messages within 24 hours triggers automatic restriction from all community features
6. **Flagged (allowed but surfaces crisis resources)** — self-harm language
7. **Soft-flagged (wall only, allowed with content warning)** — crude/off-topic content
8. **Allowed** — venting, frustration, general expression

Client-side also warns users before sending personal info (phone, email, SSN, addresses, social handles) with a two-step confirmation. Server-side blocks it regardless.

This is intentional for a mental health app used by young people. Don't block words like "hurt", "harm", "stupid", etc. Don't weaken grooming or contact exchange protections.

## Security Headers

Configured in `vercel.json`: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
CORS is locked to `bloomselfcare.app` + `bloom-zeta-rouge.vercel.app` + `localhost:3000` in the API files.

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

Daily | History | Wellness | Progress | Community | Settings

## Development Checklist

- **Onboarding review:** Any major UX or feature change must include a review of the onboarding tutorial to make sure it's still accurate and up to date. New features that change the Today tab, add new tabs, or modify core flows (mood, journal, habits) are especially likely to need onboarding updates.
- **Feature highlights:** When adding a new feature that users might not discover on their own, add an entry to the `FEATURE_HIGHLIGHTS` array in `index.html`. Include both voice variants (gentle + real) and a contextual relevance check if appropriate.

## Deployment

https://bloomselfcare.app

## License

AGPL-3.0-only. Anyone can use, modify, and share Bloom, but derivatives must remain open source under the same terms. Nobody can take Bloom and make it proprietary or monetize a closed fork. This is intentional. Bloom is free forever.

## Cost Model

- **AI reflections:** Default to `claude-haiku-4-5-20251001` for daily journal reflections and cognitive reframes (cheap, fast). Use `claude-sonnet-4-20250514` for weekly insights and monthly reflections (richer, synthesizes more data). Model whitelist in `api/claude.js` prevents abuse.
- **Do not downgrade Sonnet to Haiku for weekly/monthly.** These are the moments users feel seen. Sonnet is better at weaving specific details (mood data, habit counts, journal excerpts) into something personal. The quality difference matters for a mental health app.
- **Do not replace Haiku with open-source models (e.g. Cloudflare Workers AI) for daily reflections.** Haiku reliably follows complex system prompts including crisis detection instructions. Open models are less consistent with nuanced instruction-following. For a mental health app where someone might journal on their worst day, that reliability gap is not worth the cost savings.
- **Cost at scale:** ~$0.06/user/month on current Haiku+Sonnet split. ~$240/month at 1,000 DAU.
- **Telemetry:** Batched client-side (queue + flush every 30s or on page hide/unload via sendBeacon). Reduces Vercel invocations by ~50-70%.
- **Free tier limits:** Vercel 100K invocations/month, Upstash 10K commands/day, OneSignal unlimited web push.
- **Estimated capacity:** ~400 DAU on current setup. See `SCALABILITY_PROPOSAL.md` for full analysis.

## Sustainability

- **Ko-fi:** Live at ko-fi.com/bloomselfcare. Linked in Settings tab and Today tab.
- **Open Collective:** Rejected (project too early-stage for fiscal sponsorship, reapply when community grows)
- **GitHub Sponsors:** Live (via Stripe)
- **Vercel OSS:** Emailed partnerships@vercel.com for sponsorship
- **Upstash OSS:** Applied via oss@upstash.com
- **Merch line:** Shop name: SaidGently. Standalone apparel with meaningful phrases (separate entity from Bloom, no visible brand on product). First phrase: "Stay." 100% of profits fund Bloom. Print-on-demand via Printful + Etsy. Launch products: heavyweight tee (CC 1717, spruce), heavyweight hoodie (CH M2580, forest green), UPF 50+ sun hoodie (AOP, forest canopy pattern), UPF 50+ sun hoodie sunrise variant (AOP, loud edition), fitted hat (Flexfit 6277, olive), trucker hat (Richardson 112, loden), waffle beanie (Richardson 146R, rust). All hats old gold flat embroidery. Design assets in `/merch-assets/`.
- **Contact:** bloomhabits@proton.me

## Scaling Roadmap

See `SCALABILITY_PROPOSAL.md` for the full proposal. Summary of phases:
1. **Quick wins (done)** — Haiku/Sonnet split, telemetry batching, accessibility fixes
2. **Free AI tier (next)** — Cloudflare Workers AI as primary LLM, Claude as fallback
3. **Sustainability** — Ko-fi/GitHub Sponsors, Awesome Foundation (applied), Anthropic credits (emailed), funding.json (done), merch line (planning, first phrase: "Stay."), NLnet (needs tech co-applicant), NSF SBIR (paused), Detroit Startup Fund (watch for Round 3)
4. **Reach** — School outreach (DePauw — emailed, Interlochen — discovery call April 6 at 9:30 AM, 30 min, Dr. Kern counseling director), internationalization, crisis org partnerships

## Interlochen Call Prep (Dr. Kern, April 6)

### His Two Concerns (from his email)
1. **Parental consent for pilots:** Our answer is Bloom doesn't need a pilot. No accounts, no data collection, no deployment. Everything stays on the student's device. Three-tier age gate (under 13 blocked, 13-15 solo only, 16+ full). A counselor can recommend it like they'd recommend a breathing exercise.
2. **Getting teenagers to engage consistently:** Our answer is the voice preference system. Students pick how the app talks to them at setup. Direct voice vs gentle voice. Shapes every touchpoint. Plus daily community prompt (private journaling with social presence), no-guilt "days shown up" (never resets), Hard Day Mode (app gets gentler when you're low), quick check-in (mood + one thought, 10 seconds).

### Key Talking Points
- Nick is IAA alum, class of '09. Built Bloom after partial hospitalization program in 2025.
- Bloom is free, always will be. AGPL open source. No company, no investors.
- All data local. AI reflections sent to Anthropic API but not stored. Community features are opt-in and anonymous.
- Crisis resources always one tap away (white heart button). 988, Crisis Text Line, findahelpline.com.
- v3.5.0 shipped with voice preference, community prompt, shared milestones, quick check-in, theme-aware visuals.

### Questions to Ask Dr. Kern
1. "What does your current between-session toolkit look like for students?" (understand gaps)
2. "When students are on a waitlist for counseling, what do you point them to?" (Bloom fits here)
3. "What would make you comfortable recommending a tool like this to a student?" (let him set the bar)
4. "Are there specific concerns about AI-powered tools in a counseling context?" (get ahead of skepticism)
5. "How do arts students at Interlochen typically handle the emotional intensity of the program?" (shows you understand IAA culture)
6. "Would it help if I put together a short safety overview for your team?" (offer value, don't ask for commitment)
7. "What does consistent engagement actually look like for the tools that do work with your students?" (learn what success means to him)
8. "Are there specific times of year or transitions where students struggle most?" (orientation, auditions, juries, homesickness)
9. "If a student told you an app helped them, what would that look like?" (define the outcome he cares about)
10. "Is there anything I should know about what your students are dealing with that I might not think of as an outsider?" (humility, let him teach you)

### Soft Ask (Don't Ask for a Pilot)
"I'm not looking for a formal pilot or anything that creates work for your team. What I'd love is your honest feedback as a counseling professional. If you think it's something worth sharing with students, great. If you see gaps, I want to hear that too. I'm an alum, I care about this place, and I want to build something that actually helps."

### If He's Enthusiastic
Float: "If you ever wanted to share it with a few students informally and let me know how it lands, that would be incredibly valuable."
5. **Architecture** — Cloudflare Pages + Workers migration if Vercel limits are hit

**IMPORTANT:** When updating the project roadmap or sustainability status, always update BOTH `SCALABILITY_PROPOSAL.md` AND `admin.html`. These must stay in sync.

## Admin Access

- Admin dashboard at `/admin.html`, protected by `ADMIN_KEY` environment variable in Vercel
- Share the key to grant access, change the key in Vercel env vars to revoke
- Single shared key for now, no role-based access

## Writing Style

- **No em dashes.** Use periods, commas, or restructure the sentence instead. Em dashes are widely perceived as AI-generated writing.
- **Tone:** Real, personal, and warm, but still professional. Write like a person who genuinely cares, not a brand trying to sound relatable. Think "friend who happens to know what they're talking about," not "corporate wellness blog."
- **Keep it grounded.** Don't oversell, don't hype. Let the work speak for itself. Simple, honest language over polished marketing speak.
- **It's okay to be human.** Bloom was built from lived experience. The writing should reflect that. Be direct, be genuine, skip the fluff.
