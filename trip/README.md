# Traverse City trip plan

A private, shared trip planner for one specific trip: Grand Beach Resort on East
Grand Traverse Bay, Saturday August 15 through Wednesday August 19, driving up
from Metro Detroit with a preschooler and an early-elementary kid.

Two people (Momma and Daddy) open the same URL on their own phones. They vote
options up, down, or maybe; ruled-out options drop into a drawer; locked-in
options feed a real day-by-day plan. There is a shared packing list and a box
for adding new spots.

This deploys as its **own Vercel project**, separate from Bloom. It lives in the
Bloom repo only because that is where the work happened.

## Deploying

1. New Vercel project, same Git repo.
2. Set **Root Directory** to `trip`. This is the important step. Without it,
   Vercel builds Bloom instead.
3. Framework preset: **Other**. There is no build step.
4. Add the environment variables below, then deploy.

## Environment variables

| Variable | Required | What it does |
| --- | --- | --- |
| `REDIS_URL` | Yes, for sharing | Upstash / Vercel KV connection string. Without it the app still works fully, but each phone keeps its own state and the header says "saving on this phone". |
| `ANTHROPIC_API_KEY` | Yes, for lookups | Powers the "Look it up" button. Without it, "Add it myself" still works. |
| `TRIP_PASSCODE` | Recommended | Shared passcode. The URL is public, so without this anyone who finds it can edit your list. Each phone enters it once. |
| `TRIP_ID` | No | Redis key namespace. Defaults to `tc2026`. Change it to start a clean trip without losing this one. |

**Use a separate free Upstash database, not Bloom's.** Free tier limits are per
database, and there is no reason for a family trip list to draw down the quota a
live mental health app depends on.

## How the sharing works

Redis holds one JSON document plus a small integer revision counter.

- **Writes are deltas.** `{op:'vote', id, value}` and friends get applied
  server-side. Both phones are expected to be voting at the same time, and a
  whole-document PUT would silently drop one person's change.
- **Reads do not poll on a timer by default.** The page refreshes on load, on tab
  focus, and after your own writes.
- **Burst mode:** while the tab is visible *and* someone touched something in the
  last two minutes, it checks the revision counter every 10 seconds and only
  pulls the full document when the number actually moved. It stops on its own
  when you go idle, so an open tab in a back pocket costs nothing.
- **Offline is the normal case, not an error path.** localStorage is what renders,
  always. Writes queue when there is no signal and flush on reconnect, focus, or
  the next change. Cell service around Sleeping Bear is genuinely bad, so the app
  never blocks on the network.

Realistic heavy planning day lands well under 1,000 Redis commands against a
10,000/day free limit.

## Honesty rules in the code

The lookup endpoint (`api/add.js`) is prompted to **never** return an address,
phone number, hours, price, or URL. A model guessing a restaurant's hours is
worse than no answer, especially on a trip where you would drive there. It
returns a rough area, a one-line read on whether the place works with these two
kids, and a couple of tags it is confident about. Unrecognized places come back
flagged as unconfirmed rather than invented.

Every Map and Menu button runs a **live search** rather than opening a stored
address or website, so no link in this app can go stale or 404.

## Editing the content

All the seeded content is at the top of `index.html` in plain arrays:

- `SPOTS`: every restaurant, activity, and drive stop. `tags` decides which
  lists and which day slots it can fill. `q` is the map-search suffix for places
  that are not in Traverse City itself. `indoor: true` puts it in the rainy-day
  picker.
- `DAYS` and `DEFAULT_PLAN`: the day structure and the starting suggestions.
- `PACKING`: the packing list groups.

Adding a spot to `SPOTS` is enough. It appears in its lists, in the relevant day
pickers, and in the vote counts with no other changes.

## A note on `api/_redis.js`

Bloom's convention is that all Redis helpers live in one shared module and are
never copy-pasted. This project has its own small copy because it deploys with
`trip/` as the root directory and cannot import across that boundary. It is
deliberately limited to what these two endpoints need.

## Local development

There is no build step, so any static server plus the Vercel CLI works:

```sh
cd trip
vercel dev
```
