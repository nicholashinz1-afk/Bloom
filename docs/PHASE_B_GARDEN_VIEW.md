# Phase B: The Garden View (Design Spec)

## The Idea

A full-screen immersive view of the user's growth stage illustration. Not a stats page. Not a game. A memory palace. A quiet room you can sit in, where your garden remembers everything you've done and reveals it back to you in gentle, surprising ways.

Accessed by tapping the flower illustration on the Progress tab. A subtle discovery hint appears once ("Tap your garden to step inside"), then never again. Swipe down or tap X to close.

---

## Why This Matters

Right now the growth stage SVG is a 200px illustration crammed between stats. It's informational. The garden view makes it experiential. For someone having a hard day, this should be a place you open just to feel held. The ambient particles drift through. Your flower breathes. You notice a butterfly you've never seen before. You tap it and it shows you something kind you wrote three weeks ago.

This is Bloom's equivalent of staring out a window at a garden. You don't go there to accomplish something. You go there to remember you're alive.

---

## Design & Illustration Style

### Visual Language

**Not cartoon. Not pixel art. Not flat design.**

Think: **nature illustration meets Studio Ghibli backgrounds meets field guide sketches.**

- Soft, organic shapes. Nothing perfectly geometric.
- Muted, earthy tones driven by the active theme's color palette (via `getThemeSVGColors()`).
- Subtle texture through overlapping translucent shapes (the current SVG system already does this with layered ellipses at varying opacities).
- Light and shadow suggested through opacity gradients, not hard lines.
- Small imperfections that make it feel hand-drawn. A slightly uneven leaf edge. A branch that curves unexpectedly.

### What It Should Feel Like

- **Seed level**: A windowsill. A small pot. One green thread of life pushing through dark soil. Quiet. Patient. "Something is beginning."
- **Mid levels (Blooming-Flourishing)**: A small garden bed. Flowers opening. A bee visiting. Morning light. "This is becoming something."
- **High levels (Evergreen-Canopy)**: A forest clearing. Tall trees. Dappled light. Birds. A stream. "You've built a world."
- **Ecosystem**: A full landscape. Mountains in the distance. Water. Diverse life everywhere. An ecosystem that sustains itself. "Everything is connected."

### Technical Approach

All SVG, inline, procedurally generated (extending the current `buildFlowerSVG()` pattern). No raster images. Theme colors drive all fills. SVG viewBox expands for the full-screen view (current: `30 40 140 190`, garden view: larger, maybe `0 0 400 600`).

Gentle CSS animations on SVG groups: leaf sway (`transform: rotate()` on a `<g>` with `transform-origin`), butterfly flutter, water ripple, bird hop. All `transform`+`opacity` only. All respect `prefers-reduced-motion`.

---

## The Memory Palace: What You Find When You Tap

This is the soul of the feature. The garden isn't static. It's filled with interactive elements that surface the user's own history. **Crucially, what's available changes every time you visit.**

### Tappable Elements by Category

**Permanent fixtures** (always there, content rotates):
- **The main plant/tree**: Tap to see your growth stage name, total XP, and how long you've been at this level. A single sentence: "You've been Flowering for 23 days."
- **The soil/ground**: Tap to see total days shown up. "247 days. This soil is rich."

**Rotating visitors** (different each visit, pulled from user data):
- **Butterflies**: Each one holds a journal excerpt. Tap and it unfolds a snippet from a past entry (random, from the last 30 days). Different butterflies each visit. If no journal entries, butterflies don't appear.
- **Fireflies / light motes**: Each one holds an affirmation the user has seen. Tap for a brief warm glow + the affirmation text. Pool refreshes each visit.
- **Flowers at the base**: Each represents a completed milestone or streak achievement. Tap for "Day 30. You kept showing up." Different milestones highlighted each visit.
- **Birds / small creatures**: Hold mood memories. "Last Tuesday you felt hopeful." Drawn from mood history. Different days surfaced each visit.
- **Stones / mushrooms**: Hold small wins or self-care completions. "You went outside 3 times this week." Rotated from weekly data.
- **Water features** (at higher levels): Hold weekly or monthly AI insights, if generated. Tap the stream and a reflection surfaces.
- **Clouds / sky elements** (at highest levels): Hold the longest streak, the total breath sessions, the biggest single day. Lifetime stats as sky objects.

### The Rotation System (Never Boring)

**Key principle: 3-5 tappable visitors per visit, drawn from a larger pool, randomly selected each time the garden is opened.**

```
On garden open:
1. Determine growth level → defines which element TYPES are available
2. For each available type, query user data for eligible content
3. Randomly select 3-5 items from the eligible pool
4. Place them in predefined positions within the SVG (with slight random offset for organic feel)
5. Each element has a gentle entrance animation (fade in + small scale, staggered)
```

**Level-gated content** (the world gets richer as you grow):

| Level Range | Available Elements |
|---|---|
| Seed-Sprout (0-2) | Main plant, soil. 1 firefly (affirmation). That's it. Sparse. Peaceful. |
| Budding-Blooming (3-4) | + 1-2 butterflies (journal excerpts). + 1 base flower (milestone). |
| Flowering-Flourishing (5-6) | + birds (mood memories). + more butterflies. + stones (small wins). |
| Rooted-Evergreen (7-8) | + mushrooms. + more varied flowers. Full creature variety. |
| Full Bloom-Grove (9-11) | + water features (AI insights). Richer ecology. More concurrent visitors. |
| Canopy-Ecosystem (12-13) | + sky elements (lifetime stats). Maximum richness. 5-7 concurrent visitors. |

**Revisit incentive**: Because visitors are randomly drawn from your history, you'll see different journal excerpts, different mood memories, different milestones each time. The garden becomes a way to accidentally rediscover something you wrote or felt weeks ago. This is therapeutic. It's not gamification. It's reflection.

### When There's Nothing To Show

If a user is new and has minimal data:
- Seed level garden is intentionally sparse. That's the design, not a gap.
- The main plant and soil are always tappable.
- A single firefly with a welcome affirmation appears.
- As they use the app, elements naturally populate. No "empty state" messaging needed. The emptiness IS the state. A seed in soil is enough.

---

## Interaction Design

### Entry
- Tap the flower SVG on the Progress tab
- Smooth transition: the flower scales up and the background fades to the garden view
- Ambient particles from Phase A continue in the garden (they're already full-screen fixed)

### In the Garden
- Tappable elements have a very subtle idle animation (gentle bob, slight glow, butterfly wing flutter) so users intuit they're interactive
- Tap an element → it responds with a small animation (scale up slightly, brief glow) + a text card appears below or above the element (soft fade in, Fraunces serif, translucent background)
- Tap elsewhere or wait 4s → the text card fades out
- Only one card visible at a time (tapping a new element dismisses the old card)
- No tooltips, no labels, no "tap to interact" overlays. The movement is the invitation.

### Exit
- Swipe down from anywhere → garden slides down, returns to Progress tab
- Tap X button (top-right, subtle, low opacity) → fade back to Progress tab
- The flower on Progress tab reflects whatever state the garden is in (same SVG, same level)

### Hard Day Mode
- Garden is always accessible, even on hard days
- In gentle mode, the garden's ambient particles are already slower/softer (from Phase A)
- Creature visitors might lean toward affirmations and gentle memories rather than stats
- The garden never shows anything that could feel like pressure ("you missed 3 days" would NEVER appear)

---

## What the Garden Never Does

- Never shows negative data. No "you missed days." No "your streak ended." No "you haven't journaled in a week."
- Never gamifies. No "collect all butterflies." No achievements to unlock. No progress bars inside the garden.
- Never demands attention. No notifications about the garden. No "your garden misses you."
- Never shows the same set of visitors twice in a row (randomization handles this naturally, but worth stating as a constraint).
- Never blocks access. No loading screens. The SVG renders instantly. Data queries happen after initial paint.

---

## Technical Architecture

### New Function: `openGardenView()`
- Creates a full-screen overlay (`position: fixed; inset: 0; z-index: 998`)
- Renders `buildGardenSVG(levelIdx)` (new function, extends `buildFlowerSVG` vocabulary)
- Queries user data for visitor content
- Randomly selects and places 3-5 visitors
- Attaches tap handlers to interactive SVG groups
- Entrance animation: scale from center + fade in (0.4s ease-out)

### New Function: `buildGardenSVG(levelIdx)`
- Larger viewBox than current flower SVGs
- Composites layers: sky/background → ground/terrain → main plant (reusing existing stage logic) → environmental elements → visitor placeholders
- Returns SVG string with `data-garden-slot` attributes on interactive groups
- Theme colors via `getThemeSVGColors()`

### New Function: `populateGardenVisitors(levelIdx)`
- Reads from: `state.wellnessData.journal`, `state.historyData` (mood), `state.xpData` (streaks/milestones), `state.wellnessData.breathSessions`, weekly/monthly insights
- Returns array of visitor objects: `{ type, position, content, animation }`
- Random selection with weighting (more recent data slightly more likely)

### Data Flow
```
Progress tab → tap flower → openGardenView()
  → buildGardenSVG(level) renders base scene
  → populateGardenVisitors(level) queries user data
  → visitors placed into SVG slots with staggered entrance
  → tap handlers attached
  → user explores
  → swipe/tap X → closeGardenView() → back to Progress tab
```

### Performance
- SVG renders synchronously (no async, no loading state)
- Visitor data queries are lightweight (reading from already-loaded state objects, not API calls)
- No canvas. No WebGL. Pure SVG + CSS animations.
- Ambient particles from Phase A are already running (no additional particle cost)
- Garden view is created on demand, destroyed on close (no persistent DOM when not viewing)

---

## Implementation Phases

### B1: The View (foundation)
- `openGardenView()` / `closeGardenView()` with smooth transitions
- `buildGardenSVG()` for all 14 levels (extending current `buildFlowerSVG` vocabulary into fuller scenes)
- Tap the main plant and soil (static content: level name, days shown up)
- Entry from Progress tab flower
- Ambient particles visible through the garden
- Theme-aware, reduced-motion-aware

### B2: The Visitors (memory palace)
- `populateGardenVisitors()` with random selection
- Butterflies (journal excerpts)
- Fireflies (affirmations)
- Base flowers (milestones)
- Tap interaction with text cards
- Level-gated availability
- Rotation system (different each visit)

### B3: The Full Ecology
- Birds (mood memories)
- Stones/mushrooms (small wins, weekly data)
- Water features (AI insights) at high levels
- Sky elements (lifetime stats) at highest levels
- Gentle idle animations on all interactive elements
- Seasonal touches (if time-of-year awareness is ever added)

---

## Open Questions for Implementation

1. **SVG complexity budget**: How detailed can the garden SVGs get before mobile Safari starts struggling? Need to profile. The current flower SVGs are ~50-100 SVG elements. Garden scenes might hit 200-300. Should be fine but needs testing.
2. **Text card design**: Where exactly does the text appear when you tap a visitor? Overlay at bottom of screen? Floating near the element? Both have tradeoffs (floating is more immersive but might clip on small screens).
3. **Sound**: Should tapping garden elements play gentle tones? The app already has a warm tone system (`playWarmTone`). A quiet note per tap could add to the atmosphere without being annoying.
4. **Onboarding**: The discovery hint ("Tap your garden to step inside") needs to feel natural, not like a tutorial. Maybe it appears as a subtle text under the flower SVG on the Progress tab, once, then stores `bloom_garden_hint_shown` and never appears again.
