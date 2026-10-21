# Deengli Sarpanch Poll

An anonymous, mobile-first community poll for the Deengli Gram Panchayat Sarpanch
candidates, built with Next.js. Share one link; everyone votes and sees the live
tally.

**Candidates:** Ajay Swami · Anil Poonia · Sanjeev Poonia · Surendra Jhajharia

> **This is an unofficial community poll, not the official Gram Panchayat
> election.** The page says so clearly to voters.

The site is bilingual with a **first-visit language popup** (Hindi / English, also
switchable any time), voters can leave an optional message, and there is a
password-protected **admin dashboard** at `/admin`.

A returning voter sees **their own** vote and messages (stored in their own
browser) and the live results with a **"winning chance"** projection, and can add
further comments. None of that reveals other people's choices.

## What it does (and does not) collect

- **Collects:** vote counts; a random id generated in each voter's browser (to
  stop the same browser voting twice); **aggregate** device / OS / browser /
  network-type / language buckets; a one-way **hashed** IP (for distinct-network
  counts and duplicate-vote detection); and optional free-text messages.
- **Does NOT collect:** name, phone number, email, raw IP, SIM/carrier, or exact
  device model. **It never stores which candidate an individual chose alongside
  their device/network details or message** — the ballot stays secret.

> A browser cannot read a phone number, SIM, or carrier name without an installed
> app granting permission, so those are not collected regardless.

### Admin dashboard (`/admin`)

Open `/admin`, enter `ADMIN_PASSWORD`, and you get: live tallies, turnout,
distinct-network count, a repeat-network (possible duplicate) flag, aggregate
device/OS/browser/network/language breakdowns, votes-over-time, and the messages
list. All figures are aggregate — there is no per-voter identity log by design.

### One-vote-per-device — honest limits

Deduplication is done the way you asked — by the browser's stored data
(`localStorage`) plus a matching random id check on the server. This is the
standard lightweight method, and it is not foolproof: someone who clears their
browser data, uses a different browser, or uses another phone can vote again.
The only reliable way to guarantee one-vote-per-person is to verify identity
(e.g. phone OTP), which this poll deliberately does not do. Treat the result as
a good-faith community sentiment poll, not a tamper-proof ballot.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

With no database configured, votes are saved to a local file (`.data/votes.json`)
so you can try it out. The page shows a warning that storage is demo-only.

## Deploy so the whole village can vote (free)

A shared tally needs a small database, because serverless hosting does not keep
the local file. Steps:

1. **Create a free database.** Sign up at [upstash.com](https://upstash.com),
   create a **Redis** database, and copy its **REST URL** and **REST token**.
   (Or, on Vercel, add **KV** from the Storage tab — it fills these in for you.)
2. **Deploy to Vercel.** Push this repo to GitHub, then import it at
   [vercel.com/new](https://vercel.com/new). Next.js deploys with no config.
3. **Add the environment variables** in the Vercel project settings
   (Settings → Environment Variables):

   | Name | Value |
   | --- | --- |
   | `UPSTASH_REDIS_REST_URL` | your Upstash REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | your Upstash REST token |
   | `ADMIN_PASSWORD` | a strong password for `/admin` |
   | `IP_HASH_SALT` | any random string (optional but recommended) |

   (`KV_REST_API_URL` / `KV_REST_API_TOKEN` also work if you use Vercel KV.)
4. **Redeploy.** Vercel gives you a link like `https://your-poll.vercel.app` —
   that is the link to share in the village WhatsApp group.

See `.env.example` for the variable names.

## Change candidates, names, or symbols

Edit `src/lib/candidates.ts`. Each entry has an `id`, English name, Hindi name,
a display symbol, and an accent colour.

## How it is built

- `src/app/page.tsx` — the voting page (select → optional message → submit → results).
- `src/app/admin/page.tsx` — password-protected admin dashboard.
- `src/app/api/vote/route.ts` — `GET` returns the tally, `POST` records a vote.
- `src/app/api/admin/route.ts` — `GET` returns aggregate stats (needs the password).
- `src/lib/store.ts` — storage: Upstash/Vercel KV in production, local file in dev.
- `src/lib/analyze.ts` — derives aggregate device/network signals; hashes IPs.
- `src/lib/candidates.ts` — the candidate list.

## Resetting the poll

Clear the stored keys in your database (`vote:count:*` and `vote:voters`), or
delete and recreate the Upstash database, then redeploy.
