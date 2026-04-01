# Show HN Post

## Title (80 char limit)

Show HN: Bloom -- Free, open-source mental health self-care app (no accounts)

## Body

I built Bloom after going through a partial hospitalization program (PHP) in Troy, MI in 2025. Five days a week, sitting in a room with people having the hardest stretch of their lives, working on staying alive and functional. It saved my life.

In that program, we practiced naming our feelings every day, worked on building small habits (showering, drinking water, going outside -- things that feel impossible when you're depressed), and made co-regulation cards for crisis moments. Every feature in Bloom comes from something I needed or something someone in that room needed.

The problem with existing mental health apps: Calm is $70/year. Headspace is $70/year. BetterHelp is $300/month. And the free ones want your email, your data, and your engagement metrics. When you're barely holding on, the last thing you need is an app that punishes you for missing a day.

What Bloom does:

- Mood tracking (naming your feelings is one of the most effective emotional regulation techniques)
- Journaling with AI reflections (warm, not clinical)
- Habit tracking that never punishes you for missing a day (tracks total days, never goes down)
- Hard day mode: when you're struggling, it reduces everything to your top 2 habits and offers breathing exercises and crisis resources
- Breathing exercises (4-7-8), grounding (5-4-3-2-1), body scan meditation, cognitive reframing
- Crisis resources always one tap away (988, Crisis Text Line, international)
- Buddy system for mutual accountability
- Anonymous encouragement wall

What it doesn't do:

- No accounts, no email, no signup
- No data collection (everything stays in localStorage on your device)
- No ads, no subscription, no freemium upsell
- No streak pressure (missing a day is just missing a day)
- No clinical language, no diagnoses, no "you should seek help" guilt

The entire app is a single HTML file (~11K lines), deployed on Vercel. AI reflections use Claude Haiku for daily entries and Sonnet for weekly/monthly summaries. When mood is very low, the app switches to hand-written scripted responses instead of AI, because that's when the stakes are highest and a bad generation matters most.

Tech: PWA (works offline), WCAG AA accessible, AGPL-3.0 licensed. Built with vanilla JS, no framework. Serverless API on Vercel, Redis for community features.

I'm a husband and dad of three in metro Detroit. I work in tech, I live with MS, and I'm not trying to start a company. Bloom is free forever.

Site: https://bloomselfcare.app
Source: https://github.com/nicholashinz1-afk/bloom
