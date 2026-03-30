# Incident Response Plan

## Contact

- **Primary contact:** bloomhabits@proton.me
- **Admin dashboard:** bloomselfcare.app/admin.html (requires ADMIN_KEY)

## 1. Crisis Content Escalation

When moderation detects serious threat language (directed harm, credible threats of violence):

1. The message is automatically blocked and the user receives a strike
2. After 3 strikes in 24 hours, the user is automatically banned from community features
3. The incident is logged to the diagnostics system with full metadata (timestamp, fingerprint, content hash)
4. Admin reviews flagged content via the admin dashboard
5. For credible, imminent threats: contact local law enforcement if enough identifying information exists. Otherwise, ensure crisis resources are surfaced to the user

**Self-harm language** is handled differently. These messages are flagged (not blocked) and crisis resources are gently surfaced to the user. On the public wall, self-harm flagged messages are held from public view to prevent contagion risk.

## 2. Data Breach Procedure

Bloom stores community data (buddy messages, wall posts, user fingerprints) in Redis via Vercel KV. All personal data (journals, mood, habits) is stored locally on users' devices and is never transmitted to Bloom's servers.

**If Redis is compromised:**

1. Assess scope: Determine what data was accessed (buddy messages, wall posts, fingerprints, display names)
2. Contain: Rotate Redis credentials immediately via Vercel environment variables
3. Notify: Update the app with a banner notifying users of the breach as soon as reasonably possible
4. Communicate: Email any known affected users (if contact information is available through buddy display names)
5. Document: Record the timeline, scope, and response actions taken
6. Review: Assess whether additional protections (encryption at rest, access logging) should be implemented

**What could be exposed in a Redis breach:**
- Buddy display names and messages
- Wall posts (anonymous, but text content visible)
- User fingerprints (random client-generated IDs, not personally identifiable)
- Moderation strike history

**What cannot be exposed (never stored server-side):**
- Journal entries, mood logs, habit data, affirmations
- Real names, email addresses, phone numbers (Bloom has no accounts)

## 3. Service Outage Communication

**If Vercel or Redis is down:**

1. The app continues to function for all local features (journaling, mood tracking, habits, breathing exercises). Only AI reflections and community features are affected.
2. AI calls fail gracefully with a warm fallback message. No spinner gets stuck (try/finally ensures cleanup).
3. If the outage is extended (>1 hour), post a status update to the Bloom GitHub repository.
4. No user data is lost during outages. LocalStorage and IndexedDB maintain all personal data on-device.

## 4. Admin Key Compromise

If the ADMIN_KEY is suspected compromised:

1. Immediately change the ADMIN_KEY in Vercel environment variables
2. Redeploy the application
3. Review admin dashboard access logs (diagnostics endpoint) for unauthorized actions
4. Audit any moderation actions taken during the suspected compromise window

## 5. Dependency Vulnerability

Bloom has minimal dependencies (only the `redis` npm package for serverless functions). If a vulnerability is disclosed:

1. Check if the vulnerability affects Bloom's usage pattern
2. Update the dependency promptly
3. Redeploy

## Review Schedule

This document should be reviewed and updated:
- After any incident
- When new community features are added
- At least annually
