# Deengli Sarpanch Poll

An anonymous, mobile-first community poll for the Deengli Gram Panchayat Sarpanch
candidates, built with Next.js. Share one link; everyone votes and sees the live
tally.

**Candidates:** Ajay Swami · Anil Poonia · Sanjeev Poonia · Surendra Jhajharia

> **This is an unofficial community poll, not the official Gram Panchayat
> election.** The page says so clearly to voters.

## What it does (and does not) collect

- **Collects:** only the vote counts, plus a random id generated in each voter's
  browser that is used purely to stop the same browser voting twice.
- **Does NOT collect:** name, phone number, email, IP address, SIM/network, or
  device model. Nothing personal is asked for or stored.

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

   (`KV_REST_API_URL` / `KV_REST_API_TOKEN` also work if you use Vercel KV.)
4. **Redeploy.** Vercel gives you a link like `https://your-poll.vercel.app` —
   that is the link to share in the village WhatsApp group.

See `.env.example` for the variable names.

## Change candidates, names, or symbols

Edit `src/lib/candidates.ts`. Each entry has an `id`, English name, Hindi name,
a display symbol, and an accent colour.

## How it is built

- `src/app/page.tsx` — the voting page (voting cards → live results).
- `src/app/api/vote/route.ts` — `GET` returns the tally, `POST` records a vote.
- `src/lib/store.ts` — storage: Upstash/Vercel KV in production, local file in dev.
- `src/lib/candidates.ts` — the candidate list.

## Resetting the poll

Clear the stored keys in your database (`vote:count:*` and `vote:voters`), or
delete and recreate the Upstash database, then redeploy.
