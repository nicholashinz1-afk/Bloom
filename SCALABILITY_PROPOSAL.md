# Bloom Scalability Proposal

> Bloom exists because mental health tools should be free, private, and gentle. Built by someone who's been through it, for people going through it. No company, no investors, no monetization — just a quiet place to show up for yourself. Bloom will always be free, and it will never sell, store, or exploit your data. If this app helps even one person feel a little less alone, it was worth building.

**How to help as many people as possible, with as little money as possible.**

---

## The Philosophy

Bloom exists because someone who's been through it wants to make the hard days a little easier for other people. There's no company behind this. No investors. No monetization strategy. Just a person who knows what it's like and built something they wished they'd had.

This proposal is built around one question: *How do we get Bloom into the hands of as many people as possible while keeping it completely free, forever?*

Every recommendation below is evaluated against three principles:
1. **The user experience stays warm and human** -- no degradation in the moments that matter
2. **It costs as close to $0 as possible** -- because there's no revenue to offset costs
3. **It's sustainable for one person to maintain** -- no operational complexity that burns you out

---

## Part 1: Where the Money Goes Today

Before optimizing, it helps to see where every dollar goes:

| Service | What It Does | Current Cost | What Scales With Users |
|---------|-------------|-------------|----------------------|
| Anthropic (Claude) | AI reflections, reframes, insights | ~$0.001-0.004/reflection | Every journal entry, every reframe |
| Vercel | Hosting + serverless functions | Free (100K invocations/mo) | Every API call, every page load |
| Upstash Redis | Buddy system, wall, telemetry | Free (10K commands/day) | Every buddy sync, every wall post |
| OneSignal | Push notifications | Free (unlimited web push) | Every notification sent |
| Hosting | bloomselfcare.app | Free (Vercel) | N/A |
| Custom domain | bloomselfcare.app | ~$14/year (Cloudflare) | N/A |

**The honest math:** At current usage patterns, Bloom can serve ~100-400 daily active users before anything breaks or costs real money. The AI reflections are the first cost wall. Vercel invocations are the second.

---

## Part 2: Technical Optimizations

### Tier 1 -- Reduce AI Costs by 80-90% (Biggest Impact)

**Strategy: Tiered LLM routing**

Not every AI response needs the most powerful model. Bloom's responses fall into clear tiers:

| Response Type | Frequency | Complexity | Best Fit |
|--------------|-----------|-----------|----------|
| Journal reflections | Daily | Low (1-4 sentences, empathetic) | Free open-source model |
| Cognitive reframes | On-demand | Low-Medium (2-3 sentences) | Free open-source model |
| Weekly insights | 1x/week | Medium (synthesizes a week of data) | Claude Haiku or Sonnet |
| Monthly reflections | 1x/month | Medium-High (synthesizes a month) | Claude Sonnet |

**Implementation: Cloudflare Workers AI as primary, Claude as premium**

Cloudflare Workers AI offers free inference for open-source models at the edge. For short, warm, empathetic responses, open models perform well.

```
Daily reflections + reframes  -->  Cloudflare Workers AI (open model) -- FREE
Weekly insights               -->  Claude Haiku       -- ~$0.001/call
Monthly reflections           -->  Claude Sonnet      -- ~$0.004/call
Fallback if Workers AI is down -->  Claude Haiku       -- graceful degradation
```

**Cost impact:**
- Before: ~$0.003/reflection x 12 reflections/user/month = $0.036/user/month
- After: ~$0.002/user/month (2 Claude calls for weekly/monthly, rest free via Workers AI)
- **$5/month supports ~2,500 daily active users instead of ~110**

**Guardrails stay intact:** `filterAIResponse()` runs on every response regardless of which model generated it. The system prompt, clinical language blocking, and crisis resource surfacing are all client-side.

**Fallback chain:**
1. Try Cloudflare Workers AI (free tier)
2. If that fails, try Claude Haiku (paid, reliable)
3. If everything fails, return the scripted fallback response (already implemented)

This means Bloom works even if every external AI service goes down.

---

### Tier 2 -- Reduce Serverless Invocations by 60-70%

**Already implemented:** Telemetry batching (queues events, flushes every 30s instead of per-event).

**Additional opportunities:**

**a) Pre-computed reflections**
Instead of calling an AI model live when a user saves a journal entry, queue the reflection and generate it in a batch during off-peak hours. The user sees "Your reflection will be ready next time you open Bloom" -- this is actually a *better* UX for some users, since it gives them a reason to come back.

**b) Buddy polling optimization**
Currently polls every 5 minutes when paired. Switch to a `visibilitychange`-based approach: only poll when the buddy tab is visible, and use a single long-poll or Server-Sent Events (SSE) connection instead of repeated fetches.

**c) Health checks -- move to passive monitoring**
Remove client-side health checks entirely. Use Vercel's built-in monitoring or a free uptime service (UptimeRobot, free tier: 50 monitors at 5-minute intervals) instead.

**Combined Vercel impact:**
- Before: ~30-50 function invocations per active user session
- After: ~8-15 invocations per session
- **100K free invocations supports ~300-400 DAU instead of ~110**

---

### Tier 3 -- Reduce Redis Commands

**a) Client-side wall caching**
Cache the wall messages in localStorage for 5 minutes. Only fetch from Redis when the cache expires. This cuts wall-related Redis commands by ~80%.

**b) Buddy message pagination**
Only fetch new messages (messages after the last known timestamp) instead of the full thread every time.

**c) Telemetry aggregation on client**
Instead of sending individual events, aggregate them client-side: "user used journal 3 times, breathing 1 time, mood_log 2 times" as a single daily summary event.

**Redis impact:**
- Before: ~10-15 commands per active user session
- After: ~3-5 commands per session
- **10K commands/day supports ~2,000-3,000 DAU instead of ~700-1,000**

---

### Tier 4 -- Architecture for Scale

**a) Move to Cloudflare Pages + Workers (long-term)**
Cloudflare's free tier is significantly more generous than Vercel's for this use case:
- **Unlimited static bandwidth** (vs Vercel's 100GB)
- **100,000 Worker requests/day** (vs Vercel's 100K/month)
- **Workers AI** gives you free open-model inference at the edge
- **KV storage** and **D1 database** on the free tier
- All on one platform, simpler to manage

This is a larger migration but would effectively make Bloom's infrastructure free for tens of thousands of users.

**b) Offline-first PWA enhancements**
Bloom already works offline for core features (habits, mood, journal). Lean into this harder:
- Pre-cache AI reflections for common scenarios (low mood, hard day, first journal)
- Generate a "reflection of the day" template that works without any API call
- Make the buddy system work with local-first sync (queue messages offline, send when online)

The more Bloom works without hitting a server, the more users it can support for free.

---

## Part 3: Non-Technical Strategies

### 3A -- Unlock Free Infrastructure Through Programs

These are real programs that exist today, ranked by how easy they are to set up:

**Immediate (this week):**

| Program | What You Get | How to Apply |
|---------|-------------|-------------|
| **Vercel OSS Sponsorship** | Pro plan features for free (~$240/yr value) | vercel.com/oss -- submit your public GitHub repo |
| **GitHub Sponsors** | Accept donations, 0% fees | Enable on your GitHub profile |
| **Upstash OSS Program** | Free Pro-tier Redis | Email oss@upstash.com with your repo |

**Short-term (this month):**

| Program | What You Get | How to Apply |
|---------|-------------|-------------|
| **Open Collective** | Fiscal sponsorship (acts as your nonprofit entity), transparent fundraising | opencollective.com -- apply as an open source project |
| **Cloudflare Project Galileo** | Enterprise-level protection for free | cloudflare.com/galileo -- explain the mental health mission |
| **Ko-fi / Buy Me a Coffee** | Simple donation button for users | Set up an account, add link to Bloom's settings page |

**Medium-term (requires nonprofit status or fiscal sponsor):**

| Program | What You Get | How to Apply |
|---------|-------------|-------------|
| **Google for Nonprofits** | $2,000/yr Cloud credits, Google Ad Grants ($10K/mo in ads) | google.com/nonprofits (via TechSoup validation) |
| **AWS for Nonprofits** | $2,000/yr AWS credits | aws.amazon.com/nonprofits (via TechSoup) |
| **Microsoft AI for Good** | Azure credits + technical support | microsoft.com/ai/ai-for-good |

**Open Collective update (March 2026):** Application was rejected. Project is too early-stage for fiscal sponsorship. They recommend Ko-fi, Patreon, or Buy Me a Coffee for individual-led projects, and invite reapplication once community involvement grows. **Revised immediate path:** GitHub Sponsors (via Stripe, no fiscal host needed) + Ko-fi for simple donations. Grants requiring nonprofit status are deferred until either (a) Open Collective accepts a future application, or (b) an alternative fiscal sponsor is found.

---

### 3B -- Grants That Fund Projects Like Bloom

Mental health tech grants exist specifically for projects like this. Most require nonprofit status (which Open Collective fiscal sponsorship provides):

**Best fits for Bloom:**

| Grant | Amount | Why Bloom Fits |
|-------|--------|---------------|
| **Mozilla Foundation** (Responsible Computing) | $10K-$50K | Open source, privacy-first, social impact |
| **Patrick J. McGovern Foundation** | $50K-$500K | AI for mental health, specifically funds this |
| **Google.org Impact Challenge** | Varies ($25K-$2M) | AI for social good, has funded mental health tools |
| **The Jed Foundation** | Partnerships + funding | Youth mental health tech |
| **Mental Health America Innovation** | Varies | Digital mental health tools |
| **Robert Wood Johnson Foundation** | $25K+ | Health equity through technology |
| **Fast Forward** (accelerator) | $25K + support | Tech nonprofits serving vulnerable populations |

Even one small grant ($10K-25K) would fund Bloom's infrastructure for **years** at the optimized cost levels described above.

---

### 3C -- Community-Powered Growth

**Open source the project (if not already)**
Making Bloom fully open source does three things:
1. Qualifies you for every OSS program listed above
2. Lets other developers contribute features, translations, accessibility improvements
3. Builds trust with users who care about privacy in a mental health app

**Translations and localization**
Mental health resources are desperately needed in non-English languages. Bloom's simple architecture makes it relatively easy to internationalize. Community translators could help Bloom reach millions more people.

**Partnerships with universities**
University counseling centers are overwhelmed. A free, private self-care app that students can use between sessions is exactly what they need. Partnerships could look like:
- University wellness centers recommend Bloom to students
- Psychology/CS students contribute to Bloom as capstone projects
- Researchers study Bloom's anonymized telemetry (with user consent) for publications

**Partnerships with crisis organizations**
Bloom already links to 988 and Crisis Text Line. Reaching out to these organizations about a formal partnership could lead to:
- Cross-promotion (they recommend Bloom for daily self-care between crises)
- Grant access through their networks
- Clinical guidance to improve Bloom's approach

---

## Part 4: The Roadmap

### Phase 1 -- Quick Wins (Week 1-2)
- [x] Switch to Haiku for daily reflections, keep Sonnet for weekly/monthly
- [x] Batch telemetry events
- [ ] Apply for Vercel OSS sponsorship
- [ ] Apply for Upstash OSS program
- [ ] Set up GitHub Sponsors
- [ ] Make the repo public (if not already)

**Result: ~400 DAU capacity, $0/month additional cost**

### Phase 2 -- Free AI Tier (Week 3-4)
- [ ] Add Cloudflare Workers AI as primary LLM for daily reflections
- [ ] Implement fallback chain (Workers AI -> Claude Haiku -> scripted)
- [ ] Add client-side wall caching
- [ ] Remove client-side health checks

**Result: ~2,000-3,000 DAU capacity, ~$0-2/month**

### Phase 3 -- Sustainability (Month 2-3)
- [x] Set up Ko-fi (ko-fi.com/bloomselfcare)
- [x] Set up GitHub Sponsors (via Stripe)
- [x] Add "Support Bloom" links in Settings and Today tabs
- [x] Apply for Awesome Foundation micro-grant ($1,000)
- [x] Add funding.json manifest to repo (FLOSS/fund discoverability)
- [x] Email Anthropic about social impact API credits
- [ ] Apply for Cloudflare Project Galileo
- [ ] Reapply to Open Collective once community grows (contributors, issues, discussions)
- [ ] Explore alternative fiscal sponsors (Software Freedom Conservancy, Hack Club, NumFOCUS)
- [ ] Apply for NLnet Foundation grant (needs technical co-applicant)
- [ ] Monitor NSF SBIR Digital Health for reopening (sole proprietors eligible, currently paused)
- [ ] Monitor Detroit Startup Fund for Round 3

**Result: Sustainable funding path, infrastructure credits covering costs**

### Phase 3B -- Merch Line (Ongoing)

A standalone apparel and accessories line with meaningful, poignant phrases. Operates as its own entity, separate from Bloom branding. No visible brand on the product. Just the words. 100% of profits fund Bloom's infrastructure and development.

**First phrase: "Stay."**

One word. One syllable. A period. It works because it means something different to everyone who reads it. For someone in crisis, it's the most important word there is. For someone having a hard day, it means stay present, stay here. For someone who keeps trying to be different, it means stay as you are. The person wearing it knows what it means to them, and the person reading it fills in their own meaning. That's what makes it powerful.

**Future phrases pipeline:**
1. "Gentle is strength."
2. "Be gentle."
3. "Still here."
4. "I am enough."
5. "Go gently."
6. "Enough."

**Brand approach:**
- Shop name: **SaidGently** (Etsy)
- No visible brand on the apparel. The phrases are the product.
- Separate entity from Bloom. Bloom's name does not appear on the merch.
- Link back to Bloom only via packaging insert: "Profits from this support Bloom, a free mental health app. bloomselfcare.app"
- Print-on-demand via Printful + Etsy. Zero inventory risk.
- Sole proprietor to start. Nonprofit structure deferred until revenue and community justify the overhead.

**Launch products (Phase 1):**
1. Heavyweight tee — Comfort Colors 1717, Spruce, soft amber DTG print, right chest. Fraunces Regular. ~$15 base, retail ~$34.99.
2. Heavyweight hoodie — Cotton Heritage M2580, Forest Green, soft amber DTG print, center chest. Fraunces Regular. ~$27 base, retail ~$49.99.
3. UPF 50+ sun hoodie — All-Over Print Sports Warmup Hoodie, forest canopy pattern with dappled light, "stay." on chest + right sleeve. ~$42 base, retail ~$69.99.
4. Fitted hat — Flexfit 6277, Olive, old gold flat embroidery. ~$16 base, retail ~$34.99.
5. Trucker hat — Richardson 112, Loden, old gold flat embroidery. ~$16 base, retail ~$32.99.
6. Waffle beanie — Richardson 146R, Rust, old gold flat embroidery. ~$15 base, retail ~$29.99.

Note: Fraunces Medium weight (500) used for hat embroidery since thin serif strokes need extra weight to hold up in thread.

**Design assets:** All print files and download pages in `/merch-assets/`. Etsy listing copy in `/merch-assets/etsy-listings.md`.

- [x] Create Printful account
- [x] Design heavyweight tee and hoodie print files (Fraunces Regular, "stay.")
- [x] Design all-over print sun hoodie (forest canopy pattern)
- [x] Design hat embroidery files (Fraunces Medium, black fill for digitization)
- [x] Set up all six products in Printful
- [x] Draft Etsy listing descriptions
- [ ] Pay Etsy $29 startup fee and claim SaidGently shop name
- [ ] Order samples from Printful (20% discount on samples)
- [ ] Photograph samples for listings
- [ ] Connect Printful to Etsy
- [ ] Publish listings with real product photos
- [ ] Add packaging insert linking to Bloom

### Phase 4 -- Reach (Month 3-6)
- [x] Purchase a custom domain (bloomselfcare.app)
- [x] Submit Bloom to PsyberGuide for credibility review (emailed March 2026)
- [x] Reach out to university counseling centers for feedback (MCTS Rose, Schoolcraft, Wayne State, DePauw, Interlochen)
- [ ] Internationalization framework + first community translations
- [ ] Reach out to crisis organizations for cross-promotion
- [ ] Apply for larger grants (McGovern Foundation, Google.org)
- [ ] Post on Product Hunt
- [ ] Post on Hacker News (Show HN)
- [ ] Set up Instagram account for Bloom
- [ ] Apply for Cloudflare Project Galileo
- [ ] Switch OneSignal Site URL to bloomselfcare.app
- [ ] Remove OneSignal diagnostic logging after notifications confirmed working

**Result: Thousands of users across multiple languages**

### Phase 5 -- Long-term Architecture (Month 6+)
- [ ] Evaluate migration to Cloudflare Pages + Workers (if Vercel limits are hit)
- [ ] Offline-first PWA enhancements
- [ ] Community contributor program for ongoing development

---

## Part 5: The Numbers

**What Bloom can support at each stage:**

| Stage | Monthly Cost | Daily Active Users | Total Users |
|-------|-------------|-------------------|-------------|
| Today (before optimizations) | ~$5 | ~100-110 | ~500 |
| After Phase 1 (done) | ~$3 | ~400 | ~2,000 |
| After Phase 2 | ~$0-2 | ~2,000-3,000 | ~10,000-15,000 |
| After Phase 3 (with credits/grants) | $0 | ~5,000-10,000 | ~25,000-50,000 |
| After Phase 4-5 (Cloudflare + grants) | $0 | ~50,000+ | ~200,000+ |

These aren't fantasy numbers. They're based on the actual free tier limits of real services, with conservative estimates.

**Bloom currently has zero hard costs.** Hosting is on Vercel's free subdomain, and all services are on free tiers. If a custom domain is added later (~$12/year), that would be the only fixed cost. Everything else can be covered by free tiers, OSS programs, and modest community donations.

---

## The Bottom Line

You don't need to be a company to help a lot of people. You don't need venture capital. You don't need to charge anyone anything.

What you need is:
1. **Smart architecture** that minimizes cost per user (tiered AI, caching, offline-first)
2. **Free infrastructure programs** designed exactly for projects like this (OSS sponsorships, nonprofit credits)
3. **Simple donation channels** to cover modest costs (Ko-fi, GitHub Sponsors via Stripe -- no fiscal host needed)
4. **Institutional credibility** to unlock partnerships and grants (see `docs/outreach/` for plan)
5. **Community** -- translators, contributors, university partners, crisis org partnerships

Bloom can realistically serve tens of thousands of people for effectively $0/month in ongoing costs. The path to getting there is mostly about applying to the right programs and making a few architectural changes -- not about spending money.

The hardest part is already done. You built the thing. Now it's about making sure it reaches the people who need it.

---

## Part 6: Institutional Credibility Roadmap

Open Collective rejected Bloom's fiscal sponsorship application (March 2026) -- the project is too early-stage for their model. This shifts the strategy: build credibility from the ground up before reapplying.

### Immediate (this week)

| Action | Why it matters | Status |
|--------|---------------|--------|
| One-pager with features, research basis, privacy model | Required for any institutional outreach | Done (`docs/outreach/BLOOM_ONE_PAGER.md`) |
| Outreach email templates (counseling centers, therapists, crisis orgs, grants) | Reduces friction for outreach | Done (`docs/outreach/EMAIL_TEMPLATES.md`) |
| Set up Ko-fi donation page | Simplest path to accepting support | Done (ko-fi.com/bloomselfcare) |
| Support link in Settings and Today tabs | Users can find it naturally | Done |

### Short-term (this month)

| Action | Why it matters | Status |
|--------|---------------|--------|
| ~~Apply for GitHub Sponsors~~ | ~~Developer-facing donations, 0% fees~~ | Done |
| Submit Bloom to PsyberGuide (psyberguide.org) | Credibility rating for digital mental health tools | Done (emailed info@psyberguide.org) |
| Email 5-10 university counseling centers asking for feedback | Feedback relationships turn into pilot programs | In progress (MCTS Rose, Schoolcraft, Wayne State, DePauw counseling services, Interlochen Dr. Kern sent) |
| Reach out to employer/parent company about wellness program adoption | Corporate adoption = immediate users + credibility for grant applications | Done (pitched internally) |
| Ask a licensed therapist/counselor to review Bloom and write a 2-3 sentence letter of support | One endorsement from a LCSW/psychologist opens institutional doors | In progress (therapist reviewing) |
| Add explicit "not a HIPAA covered entity / no PHI" statement to privacy policy | Makes institutional legal teams relax | Done |
| Add FAQ and feedback section in Settings | Users need a way to ask questions and give feedback | Done |
| Fix push notifications (OneSignal) | Service worker and CSP issues breaking subscriptions | In progress (fixes deployed, verifying) |
| Update onboarding tutorial to match current UX | Tutorial referenced old tab names and missing features | Done |
| Fix science section citations (10 errors) | Clinicians reviewing the app need accurate sources | Done |
| Remove em dashes from all user-facing text | Writing style consistency | Done |
| Redesign social media cards to match app tone | Instagram/social posts need clean, on-brand images | Done |
| Update og-image for link sharing | Old image had wrong tagline and URL | Done |
| Rename Weekly tab to History | Tab name didn't match its content | Done |
| Multi-hue mood colors | Old single-hue gradient was indistinguishable | Done |

### Medium-term (month 2-3)

| Action | Why it matters |
|--------|---------------|
| Run an informal pilot at one school (recommend Bloom to students for a semester) | "Used by X students at Y university" is the strongest credibility signal |
| Track anonymous usage data from the pilot (telemetry already exists) | Turns the pilot into a case study |
| Apply for Mozilla MOSS grant (doesn't require nonprofit status) | $10K-50K, open to individual maintainers |
| Explore alternative fiscal sponsors (Software Freedom Conservancy, Hack Club, NumFOCUS) | Alternatives to Open Collective for unlocking grant eligibility |
| Reach out to crisis organizations (988, Crisis Text Line) for cross-listing | They maintain lists of recommended digital tools |

### The credibility flywheel

```
Feedback from a professional
    → One-pager with their endorsement
        → Pilot at one small school
            → Case study from the pilot
                → Next school, next grant, reapply Open Collective
```

You only need one "yes" to start it. Start with small schools -- community colleges and smaller state universities are more responsive than large research universities.

### Outreach materials

All templates and materials are in `docs/outreach/`:
- `BLOOM_ONE_PAGER.md` -- Features, research basis, privacy model, institutional use cases
- `EMAIL_TEMPLATES.md` -- Ready-to-send templates for counseling centers, therapists, crisis orgs, and grant applications
