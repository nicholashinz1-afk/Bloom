# Bloom Incident Response Plan

## Purpose

This document outlines what to do when Bloom's automated systems detect a credible threat of violence through community features (buddy messages, encouragement wall). It exists because Bloom is a mental health app used by young people, and while the platform blocks and logs these threats automatically, a human needs to assess whether further action is required.

## How threats are detected

Bloom's moderation system has a dedicated `CREDIBLE_THREAT_PATTERNS` tier that catches specific, actionable threats of violence (mass harm, weapons + targets, named locations). When triggered:

1. The message is **blocked** (never posted or delivered)
2. The user is **immediately banned** from all community features
3. The full message, IP address, user agent, timestamp, and user identifier are **logged** to a dedicated Redis key (`bloom_mod:threat_log`) with 1-year retention
4. An **admin alert** is sent via webhook (if `ALERT_WEBHOOK_URL` is configured) and/or push notification (if `ADMIN_ONESIGNAL_ID` is configured)

## When you receive an alert

### Step 1: Review the threat (within minutes)

Open the admin dashboard (`/admin.html`) and check the Threat Log section. Read the full message and metadata.

Ask yourself:
- Is this a **specific** threat? (named location, time, method)
- Is this **credible**? (not obviously sarcastic, not song lyrics, not quoting something)
- Is this **imminent**? (happening now or in the near future)
- Does the user appear to have **means** or **access**? (mentions having weapons, being at a specific location)

### Step 2: Assess severity

**LOW severity** (no further action needed):
- Obvious trolling or testing the filters
- Song lyrics, movie quotes, or hypothetical language
- Vague frustration without specific targets ("I hate this place")
- The auto-ban and logging are sufficient

**MEDIUM severity** (document and monitor):
- Somewhat specific but unclear intent
- Could be interpreted as a threat but context suggests venting
- Save screenshots of the threat log entry
- Check if the same user ID has prior strikes (check Flagged Users section)
- Monitor for repeat behavior over the next 24-48 hours

**HIGH severity** (report to authorities):
- Specific target (named school, church, workplace, person)
- Specific method (shooting, bombing, stabbing)
- Specific timeframe ("tomorrow", "Monday", "after school")
- Evidence of means ("I have a gun", "I brought a knife")
- Prior escalating behavior from the same user ID

### Step 3: Report to authorities (HIGH severity only)

**For imminent threats (happening now or today):**
- Call 911 and provide:
  - The exact message text
  - The IP address from the log
  - The timestamp
  - Any other metadata available
  - That this came from an anonymous web-based mental health app

**For non-imminent but credible threats:**
- Submit a tip to the FBI Internet Crime Complaint Center: https://tips.fbi.gov
- Or call the FBI tip line: 1-800-CALL-FBI (1-800-225-5324)
- Provide the same information as above

**For threats involving schools:**
- Contact the FBI tip line (they coordinate with local agencies for school threats)
- If you can identify the school from the message content, you can also contact the school district directly

### Step 4: Preserve evidence

- **Do not delete** the threat log entry from Redis
- Take screenshots of the admin dashboard showing the threat entry
- Save the full metadata (timestamp, IP, user agent, message, user ID)
- If law enforcement contacts you, you can export the threat log via the admin API:
  ```
  POST /api/wall
  { "action": "threat-log", "adminKey": "[your-admin-key]" }
  ```

### Step 5: Document your response

Keep a simple record of what you did:
- Date/time you became aware
- What the threat said (summary)
- Your severity assessment
- What action you took (or why you took no action)
- Any reference numbers from law enforcement

This protects you legally by showing you had a process and followed it.

## What Bloom can and cannot provide to law enforcement

**Available:**
- Full message text (up to 500 characters)
- IP address (from Vercel's x-forwarded-for header, may be a VPN or proxy)
- User agent string (browser/device info)
- Timestamp (UTC milliseconds)
- User identifier (client-generated fingerprint or buddy ID, not a real identity)
- Moderation strike history for the same user ID

**Not available:**
- Real name, email, phone number, or physical address (Bloom has no accounts)
- Message history beyond what was blocked (normal messages are not logged with IP)
- Location data
- Device identifiers beyond user agent

**Important:** Bloom's user identifiers are client-generated random strings, not real identities. Law enforcement would need to subpoena Vercel (for server logs with IP-to-request mapping) or the user's ISP (for IP-to-identity resolution) to identify someone.

## Legal basis

Bloom's Terms of Use (visible in Settings and accepted during onboarding) disclose that:
- Credible threats of violence are logged with metadata
- Bloom reserves the right to report credible, imminent threats to law enforcement
- Bloom will cooperate with valid legal requests (subpoenas, court orders)
- This applies only to credible violent threats, not to venting, emotional expression, or self-harm language

## Setup

To receive real-time alerts, configure these environment variables in Vercel:

- `ALERT_WEBHOOK_URL`: A webhook URL that receives POST requests with JSON `{ text, content }`. Works with Discord webhooks, Slack incoming webhooks, Zapier, Make, or any email relay service.
- `ADMIN_ONESIGNAL_ID` (optional): Your OneSignal subscription ID for push notifications on threat detection.

## Review schedule

Review this plan every 6 months or after any incident. Update contact information and procedures as needed.

---

*Last updated: March 2026*
