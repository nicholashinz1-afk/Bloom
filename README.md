# Bloom

**Self-care. No pressure.**

Bloom is a free, private mental health self-care app. Track habits without pressure, journal with AI reflections, breathe through tough moments. No accounts, no data collection, no cost. Just a quiet place to show up for yourself.

**[Use Bloom](https://bloomselfcare.app)**

---

## What Bloom Does

- **Habit tracking without streaks.** Tracks total days, never consecutive. Missing a day doesn't reset anything.
- **Hard day mode.** Scales your habits down to your top 2 when things are rough. No guilt.
- **Journaling with AI reflections.** Warm, supportive companion (powered by Claude). Never clinical advice.
- **Breathing exercises.** Guided breathwork that surfaces automatically when you're having a tough time.
- **Anonymous buddy system.** Optional peer support. Fully anonymous, moderated for safety.
- **Community encouragement wall.** Leave and read anonymous notes of encouragement.
- **Crisis resources.** 988, Crisis Text Line, and international resources. Always one tap away.

## Privacy

Your data stays on your device. Bloom uses localStorage with no accounts, no authentication, and no analytics. The only data that leaves your device is journal text sent to Claude for reflections (server-side, not stored) and optional community features (buddy system, encouragement wall).

## Tech

- Single-page PWA (one HTML file, works offline, installable)
- Deployed on Vercel (static + serverless API)
- AI reflections via Claude (Haiku for daily, Sonnet for weekly/monthly)
- Community features backed by Redis (Vercel KV)
- WCAG AA accessible (4.5:1 contrast, keyboard nav, screen reader support)

## Run Locally

```bash
# Clone
git clone https://github.com/nicholashinz1-afk/bloom.git
cd bloom

# Serve (any static server works)
npx serve .

# For API features, set environment variables:
# ANTHROPIC_API_KEY, REDIS_URL (see CLAUDE.md for full list)
```

## Support Bloom

Bloom is free forever. If you'd like to help keep it running:

- **[Ko-fi](https://ko-fi.com/bloomselfcare)** — tips and donations
- **Star this repo** — visibility helps
- **Share it** — tell someone who might need it
- **Contribute** — PRs welcome, see the issues tab

## Crisis Resources

If you or someone you know is struggling:

- **988 Suicide & Crisis Lifeline** — call or text 988 (US)
- **Crisis Text Line** — text 741741
- **International** — [findahelpline.com](https://findahelpline.com) (40+ languages)

## License

[AGPL-3.0-only](LICENSE). Bloom is open source and always will be. Anyone can use, modify, and share it, but derivatives must remain open source under the same terms.

---

*Built from lived experience, for people going through it. If this helps even one person feel a little less alone, it was worth building.*

*bloomhabits@proton.me*
