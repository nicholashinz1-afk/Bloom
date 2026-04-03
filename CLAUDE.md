# Bloom

> Bloom exists because mental health tools should be free, private, and gentle. Built by someone who's been through it, for people going through it. No company, no investors, no monetization — just a quiet place to show up for yourself. Bloom will always be free, and it will never sell, store, or exploit your data. If this app helps even one person feel a little less alone, it was worth building.

Mental health self-care PWA. Compassionate, no-shame, no-pressure design philosophy.

## Architecture

- **Single-page app** — entire frontend lives in `index.html` (~24K lines)
- **Deployed on Vercel** — static hosting + serverless API functions
- **Storage:** localStorage (primary) with IndexedDB backup mirror. No user accounts/auth.
- **Data stays local** unless user explicitly uses community features (buddy, wall)

## API Endpoints (Vercel serverless)

- `api/_redis.js` — **shared Redis module.** All Redis helpers (`getRedis`, `kvGet`, `kvSet`, `kvDel`, `logModeration`) live here. New API endpoints must import from this module, never copy-paste Redis boilerplate.
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

Always accessible via the white heart button in the header. Tap = crisis sheet. Long-press (3s) = discreet safety resources (see below).

## Personal Safety Features

For users in unsafe environments (domestic violence, abuse, controlling relationships).

### Privacy Lock
- Opt-in in Settings > Privacy Lock
- **Biometric + PIN backup:** Uses WebAuthn (`navigator.credentials`) for device fingerprint/Face ID/PIN, with a 4-digit PIN as fallback
- **PIN only:** SHA-256 hashed, stored in `bloom_prefs.privacyLock`
- Locks on app boot (`main()`) and return from background (`handleVisibilityChange()`)
- Configurable timeout: immediate, 1 min, or 5 min
- Lock screen is minimal, shows no personal data. Crisis heart accessible on lock screen (both tap and long-press).
- No PIN recovery. User must clear app data if forgotten. Vault backup recommended.

### Discreet Safety Resources
- **Trigger:** Long-press white heart button for 2 seconds (works on both main header and lock screen)
- **`#safety-sheet`** bottom sheet with web chat primary, phone/text secondary
- Web chat resources (no call/text history): National DV Hotline (thehotline.org), RAINN (online.rainn.org), Love Is Respect (loveisrespect.org), Crisis Text Line (web chat), findahelpline.com
- Phone resources labeled "if you're in a safe place to call": DV Hotline, RAINN, Childhelp, Love Is Respect
- Long-press handler: `attachHeartLongPress()` applied to both `#crisis-heart` and `#lock-crisis-heart`

### Quick Exit (Decoy Mask)
- Button at top of safety sheet activates `#decoy-mask` overlay (z-index: 9999)
- Looks like a frozen app: dark screen, CSS spinner, "Loading..." text
- Long-press spinner for 3 seconds to unmask and return to safety sheet
- Session/chat stays alive underneath. Nothing is lost.
- Decoy mask sits above everything including lock screen

### Discoverability
- What's New tour cards (v3.7.0 safety features, v3.8.0 section builder) walk users through new features
- FAQ hint in Settings: "The white heart also has more resources if you hold it."
- First-time discovery toast on long-press

### Design principles for safety features
- Don't make the discreet trigger easier to find. The hidden gesture is intentional.
- Don't add visible labels, icons, or menu items that reference domestic violence, abuse, or "safety mode."
- The decoy mask must look boring and unremarkable. Don't add Bloom branding to it.
- Crisis heart must always be accessible, even on the lock screen, even behind the decoy mask.
- Web chat links are prioritized over phone/text because they leave no trace in call or SMS history.

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

## Voice Preference

Two voices: `'real'` (direct, no fluff) and `'reflective'` (gentle, warm). Stored in `state.prefs.voice`.

**This applies to everything.** Every piece of copy the user sees must respect their voice preference: AI reflection framing text, button labels, banner copy, toast messages, affirmations, journal prompts, community prompts, hard day responses. If you're adding or changing user-facing text, check whether it needs both voice variants.

- Voice does NOT need to be threaded to the Claude API. The server-side system prompts enforce a warm, non-clinical baseline that works for both voices. Voice modulation happens client-side through prompt pools and conditional copy.
- Existing voice-aware pools: `JOURNAL_PROMPTS` / `JOURNAL_PROMPTS_REAL`, `COMMUNITY_PROMPTS` / `COMMUNITY_PROMPTS_REAL`, `AFFIRMATIONS_DEFAULT` / `AFFIRMATIONS_REAL`, `SCRIPTED_LOW_MOOD_RESPONSES` / `SCRIPTED_LOW_MOOD_RESPONSES_REAL`, `WINDDOWN_AFFIRMATIONS` / `WINDDOWN_AFFIRMATIONS_REAL`.
- Pattern: `state.prefs?.voice === 'real' ? realVariant : gentleVariant`

## Special Dates

Users create special dates in Settings with a name, date, and type (celebration or hard day). Birthday is a default. `checkSpecialDates()` detects matches on load and populates `state._specialDateMatches`.

- Banners appear on the Today tab with response buttons tailored to the date type.
- When the user responds, a bottom sheet opens with an AI-generated reflection (context: `special_date` in `api/claude.js`). The reflection engages with the emotional meaning of the date, not just the label.
- Voice preference applies to the framing text around the reflection (via `getSpecialDateFraming()`), not the AI call itself.
- Existing behavior is preserved: 'hard' activates hard day mode, 'celebrate' fires confetti, 'complicated' offers a journal entry.
- Special date reflections use Haiku (fires rarely, 1-2x/year per date).

## Scoring & Leveling System (Sunlight XP)

The system exists to recognize showing up, not to gamify progress. It should never discourage someone from continuing. Every action is always recognized, never zero.

### Growth Stages (botanically accurate)

Seed (0) → Seedling (175) → Sprout (525) → Budding (1,200) → Blooming (2,600) → Flowering (5,000) → Flourishing (9,000) → Rooted (15,000) → Evergreen (25,000) → Full Bloom (35,000) → Perennial (47,000) → Grove (61,000) → Canopy (77,000) → Ecosystem (95,000)

Names follow how a plant actually grows, then expand into broader natural systems. Don't rename stages to anything that implies arrival before the journey warrants it. Gaps between stages grow gently so no level ever feels like a wall. A high-water mark (`peakLevelIdx` in xpData) prevents users from ever being demoted when habit scaling adjusts thresholds upward.

### XP values

- **Habits/self-care:** 15 XP each. Medication: 20 XP. All self-care is equally valued.
- **Mood check-in:** 10 XP (once/day). **Sleep logging:** 5 XP (once/day).
- **Journal entry:** 20 XP (once/day). **Reflection:** 15 XP (once/day).
- **Water goal:** 10 XP. **Food tracking:** 10 XP. **Small wins:** 10 XP. **Affirmations:** 10 XP.
- **Skill-building (breathing, grounding, body scan, reframe):** 15-20 XP first session/day, 5 XP for repeats.
- **Self-care act:** 10 XP. **Comeback bonus:** 25 XP.

### Hard day boost

All XP earns 1.5x when hard day mode or gentle mode is active. Showing up on a hard day is harder, so it counts for more. Don't remove this.

### Diminishing returns

Repeatable activities (breathing, grounding, body scan, reframe) use `addActivityXP()`: full XP on first session per day, 5 XP for every repeat. Never zero. This prevents curve distortion without punishing someone for doing more.

### Streak consistency bonus

Daily bonus based on current consecutive run: +15 XP at 7+ days, +30 at 14+, +50 at 30+. This rewards steadiness without punishing missed days (daysShowedUp never goes down).

### Scaling

`getScaledLevels()` adjusts thresholds proportionally based on configured habits (`getDailyXPPotential()`). Baseline is 175 XP/day. If a user has more habits enabled, thresholds scale up to keep the timeline roughly the same. Don't use dynamic scaling based on actual engagement. It punishes people for doing more.

## Tabs

Daily | History | Wellness | Progress | Community | Settings

## Development Checklist

- **Onboarding review:** Any major UX or feature change must include a review of the onboarding tutorial to make sure it's still accurate and up to date. New features that change the Today tab, add new tabs, or modify core flows (mood, journal, habits) are especially likely to need onboarding updates.
- **Feature highlights:** When adding a new feature that users might not discover on their own, add an entry to the `FEATURE_HIGHLIGHTS` array in `index.html`. Include both voice variants (gentle + real) and a contextual relevance check if appropriate.

## Section Builder (v3.8.0)

Settings > Customize your sections. Lets users move items between Daily, Weekly, and Self-Care. Items adopt the behavior (XP, scheduling, tracking) of their destination section.

- **Data model:** `state.prefs.sectionOverrides` maps item IDs to their new section. Promoted items are stored in `customDailyHabits` (with `originalId`), `promotedWeeklyHabits`, or `customSelfCare` (with `originalId`).
- **XP:** Items earn XP at the rate of their destination section (daily: 15/slot, weekly: 20, self-care: 20). `getDailyXPPotential()` accounts for all of this.
- **Scheduling:** Inline controls in the Section Builder. Daily gets time slot chips (AM/Mid/PM/Any), weekly gets day-of-week chips, self-care gets routine chips (AM/PM/Any).
- **Settings integration:** Each settings section (Daily, Weekly, Self-Care) shows a "Moved here" subsection for promoted items with full scheduling controls and Reset buttons. Items moved away show as dimmed "(moved to X)" with a Reset button.
- **Visibility gate:** Immediate for Ready/Exploring/Custom readiness paths. Gentle path unlocks at week 2 (with "show me everything now" override).
- **"Make it mine" onboarding:** Fourth readiness option during setup. Includes section builder step so users can customize from day one.
- **What's New tour cards:** Support back/forward navigation. Users can swipe through in both directions.

### Emoji Picker

Custom task add inputs (daily habits, weekly tasks, self-care, nourishment, section builder) have an emoji picker button. Curated sets per section type, no party/alcohol/gambling emojis. Categories: hygiene, routine, movement, connection, kindness, meals, etc.

### Implementation notes

- Promoted items with `originalId` are excluded from the main settings reorder list and custom items sections. They only appear in the "Moved here" subsections and Section Builder.
- `getOrderedDailyHabits()` normalizes `name` to `label` for custom habits and skips promoted items.
- `toggleWeeklyHabitDay` / `setWeeklyHabitDay` work with promoted IDs like `pw_brush_teeth`. If these functions are ever refactored to validate against `WEEKLY_HABITS`, promoted items would break.
- Emoji picker popover opens upward. Works because add inputs are always at the bottom of their sections. Would clip if inputs moved to the top of a panel.
## Living Feedback (Phase 4B) -- IMPLEMENTED

All 10 Phase 4B living feedback items are now implemented, plus an ambient particle ecosystem.

### Ambient Particle Ecosystem

A persistent, theme-aware particle system (`#ambient-particles`) floats behind all content. CSS-animated, 6-13 particles (density scales with growth level), recycling via `animationiteration` events. No canvas, no JS animation loops. Pure compositor.

**Theme-specific particle identities** (each theme has 2-3 particle types):
- **Forest**: drifting leaves, golden light motes, fireflies
- **Ocean**: bioluminescent plankton, lateral current particles, deep glows
- **Rose**: falling petals, warm pollen, pink light motes
- **Amber**: golden dust motes, ember glows, drifting rays
- **Pastel**: cotton orbs, soft bubbles, tiny twinkles
- **Pride**: prismatic particles (rainbow cycling), aurora wisps

**Growth-stage-aware density**: Seed-Budding (6 particles), Blooming-Rooted (9), Evergreen-Ecosystem (13).

**Gentle mode response**: `updateAmbientMood(true)` slows particles 1.5x and softens via CSS `filter: saturate(0.7) brightness(1.1)`. The world gets quieter, not darker.

**Key functions**: `initAmbientParticles()`, `updateAmbientMood()`, `ambientBurst()` (brief extra particles on interaction).

### Phase 4B Living Micro-Feedback (all 10 implemented)

Uses `applyLivingFeedback(el, type, duration)` helper. Respects `prefers-reduced-motion`. CSS keyframes: `livingGlow`, `livingShimmer`, `livingBreathe`, `livingPulse`.

1. **Habit completion glow** -- `toggleHabit()`, glow on habit row + ambient burst
2. **Mood check-in breathing glow** -- `logMood()`, mood card breathes after check-in
3. **Journal saved shimmer** -- `saveJournal()`, light sweep across journal card
4. **XP earned pulse** -- `addXP()`, gentle scale bump on XP bar
5. **Growth stage badge glow** -- `renderProgressTab()`, persistent breathe at Flowering+ (idx >= 5)
6. **Streak milestone glow** -- `updateStreak()`, glow at 7/14/30/60/100 day runs
7. **Water/food goal completion glow** -- `tapWater()`/`tapFood()`, glow on goal met
8. **All-done ambient glow** -- `checkAllDone()`, persistent breathe on Today tab
9. **Breathing exercise afterglow** -- `stopBreathing()`/`stopInlineBreathing()`, calm lingers
10. **Community wall post glow** -- `postToWall()`, glow on submitted message

### Rules (still apply)
- All living feedback respects `prefers-reduced-motion` (particles hidden, glows disabled).
- Animations use `transform` + `opacity` for GPU compositing. `box-shadow` used in keyframes at low iteration counts (matches existing `buddyLevelPulse` pattern).
- Purely decorative. No layout shifts. No interaction blocking. Screen readers unaffected.
- Organic feel (light through leaves), not gamified.

### Phase B: Evolving SVG Growth Illustrations (Future)

Not yet implemented. Vision: refactor `buildFlowerSVG()` into `buildEcosystemSVG(levelIdx)` where each growth stage adds environmental richness to the scene. Seed starts as dark soil with a single seed. By Ecosystem, it's a full landscape with trees, water, mountains, diverse wildlife. Each level composites SVG layers: ground, plants, creatures, atmosphere, light effects. Think nature illustration/Studio Ghibli, not cartoon. Elements never disappear as you level up, they mature. Theme colors drive all SVG fills via `getThemeSVGColors()`.

## Known Issues / Fixes Needed

- **Replace blocking dialogs with non-blocking modals.** There are ~12 `alert()` and ~7 `confirm()` calls still in the codebase (buddy safety checks, vault setup, data deletion, community features). These block the main thread on mobile Safari and Chrome, causing the app to appear frozen. All are user-initiated actions (not startup/background), so not critical, but should be converted to non-blocking bottom sheets or modal dialogs for better mobile UX. Key locations: buddy message safety confirms (~line 21209-21212, double-confirm chain), community data deletion (~line 22224-22225, double-confirm), vault passphrase prompt (~line 16864), and various alert() calls for copy/export feedback.

- **Detailed medication mode doesn't bridge to completion system.** `checkAllDone()` and `getCompletionRate()` (around line ~7880-7950) use the simple medication system's keys (`medication_am`, `medication_pm`, etc. from `MEDICATION_HABIT`). In detailed mode, individual meds use slot-qualified keys (`medId:slot`). Completing all individual meds in detailed mode does not set the simple keys, so the "all done" celebration and completion percentage don't account for detailed medication progress. Fix: when all meds in a slot are checked off in detailed mode, also set `td.medication_<slot>` = true so the completion system picks it up.

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

## Performance Patterns

Established during the v3.8.1 performance audit. Follow these patterns in new code.

- **Listener cleanup on re-init:** When a function adds event listeners and may be called again (e.g. after a re-render), use an `AbortController` stored on the element to abort previous listeners before adding new ones. See `initHabitDragReorder()` for the pattern.
- **Guard repeated enhancement:** When a MutationObserver triggers a function that enhances DOM elements, mark processed elements with a `data-enhanced` attribute and skip them on re-runs. See `enhanceToggles()`.
- **RAF-based debounce for renders:** Functions called from many onclick handlers (like `reRenderSettingsPreservingScroll`) should coalesce via `requestAnimationFrame` to avoid redundant work.
- **GPU-accelerated animations:** Use `transform` and `opacity` for transitions and keyframes. Avoid animating `width`, `height`, `top`, `left`, `box-shadow`, or `background-position`. Use `transform: scaleX()` / `scaleY()` / `translateX()` instead.
- **Specific transition properties:** Never use `transition: all` in CSS class definitions. Specify exact properties (e.g. `transition: background-color 0.2s, transform 0.2s`). Inline styles in JS templates are lower priority but should follow this when touched.
- **Batch DOM insertions:** Use `DocumentFragment` when adding multiple elements (see `launchConfetti`). Use a single cleanup timer instead of per-element timers.
- **IndexedDB writes are batched:** The `save()` function writes to localStorage immediately (synchronous, no data loss risk) but batches IndexedDB backup writes with a 500ms debounce. Pending writes flush on `visibilitychange` and `pagehide`.
- **Non-blocking Google Fonts:** Fonts load via `<link rel="preload" as="style">` with `onload` swap. The page paints immediately with system fonts and swaps in Fraunces/Instrument Sans when they arrive. Don't convert this back to a blocking `<link rel="stylesheet">`.
- **Deferred non-critical checks:** Only `checkNewWeek()`, `checkWelcomeBack()`, `checkSpecialDates()`, and `updateStreak()` run before `renderTodayTab()` (they set state it reads). Everything else (modals, affirmations, milestones, reminders, nudges) is deferred to after first paint via `requestAnimationFrame` or `setTimeout`. Don't move deferred checks back into the critical path.
- **Progressive Today tab rendering:** On first load, `renderTodayTab()` paints only the mood/sleep card and gentle mode toggle (above the fold), then fills in the rest via `requestAnimationFrame` in `renderTodayTabRest()`. Subsequent re-renders (habit taps, etc.) do a full synchronous render. The split is controlled by `renderTodayTab._initialized`.

### Known remaining performance items

- ~50 inline `transition: all` instances in JS template strings. Low priority. Clean up incrementally as those templates are touched for other reasons.
- No custom service worker. The app relies on OneSignal's SW. Adding a dedicated SW with cache-first for static assets and network-first for API calls would be the biggest remaining win (1-2s faster repeat visits, offline support).
- `reRenderSettingsPreservingScroll` still rebuilds entire Settings + Today tab HTML on every change. It's debounced now (1 frame), but the long-term fix is surgical DOM updates instead of full innerHTML rebuilds.
- The `mood-chart-bar` CSS class uses `transition: height` (layout-triggering) but couldn't be verified in use during the audit. Convert to `transform: scaleY()` if the usage is confirmed.

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
