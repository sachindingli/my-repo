// Vote + aggregate-analytics storage.
//
// In production set an Upstash Redis / Vercel KV REST endpoint via env vars and
// everything persists there. With no env configured it falls back to a local
// JSON file — fine for `npm run dev`, but it will NOT persist on serverless
// hosting, so configure the REST store before sharing the link.
//
// Privacy by design: we store per-candidate counts, a set of random browser
// voter-ids (to stop one browser voting twice), AGGREGATE device/os/browser/
// network/language/time buckets, hashed IPs (distinct-count + duplicate flag
// only), and optional free-text messages kept SEPARATE from any vote choice.
// We never store a voter's identity, raw IP, or which candidate an individual
// picked alongside any device/network detail.
import fs from 'fs'
import path from 'path'
import { CANDIDATE_IDS } from './candidates'

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
export const hasRemoteStore = Boolean(REST_URL && REST_TOKEN)

const K = {
  counts: 'vote:counts',
  voters: 'vote:voters',
  ipset: 'stat:ipset',
  dupip: 'stat:dupip',
  device: 'stat:device',
  os: 'stat:os',
  browser: 'stat:browser',
  net: 'stat:net',
  lang: 'stat:lang',
  timeHour: 'stat:timeHour',
  messages: 'messages',
}

export type Results = { counts: Record<string, number>; total: number }
export type VoteOutcome = {
  ok: boolean
  reason?: 'already_voted' | 'invalid_candidate' | 'invalid_voter'
  results: Results
}
export type VoteInput = {
  candidateId: string
  voterId: string
  lang: string
  networkType: string
  device: string
  os: string
  browser: string
  ipHash: string
  message?: string
}
export type AdminData = {
  counts: Record<string, number>
  total: number
  device: Record<string, number>
  os: Record<string, number>
  browser: Record<string, number>
  net: Record<string, number>
  lang: Record<string, number>
  timeHour: Record<string, number>
  distinctNetworks: number
  repeatNetworkVotes: number
  messages: { text: string; ts: number }[]
  persistent: boolean
}

function emptyCounts(): Record<string, number> {
  const c: Record<string, number> = {}
  for (const id of CANDIDATE_IDS) c[id] = 0
  return c
}
function totalOf(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}
function hourKey(): string {
  return new Date().toISOString().slice(0, 13).replace('T', ' ')
}

// ---------- Upstash / Vercel KV (REST) backend ----------
async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Redis REST error ${res.status}`)
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>
  return data.map((d) => d.result)
}

// HGETALL may come back as a flat [field, val, ...] array or as an object.
function toNumMap(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (Array.isArray(raw)) {
    for (let i = 0; i + 1 < raw.length; i += 2) out[String(raw[i])] = Number(raw[i + 1]) || 0
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) out[k] = Number(v) || 0
  }
  return out
}

async function redisResults(): Promise<Results> {
  const [raw] = await pipeline([['HGETALL', K.counts]])
  const counts = { ...emptyCounts(), ...toNumMap(raw) }
  return { counts, total: totalOf(counts) }
}

async function redisVote(i: VoteInput): Promise<VoteOutcome> {
  const [added] = await pipeline([['SADD', K.voters, i.voterId]])
  if (Number(added) === 0) return { ok: false, reason: 'already_voted', results: await redisResults() }

  const batch: (string | number)[][] = [
    ['HINCRBY', K.counts, i.candidateId, 1],
    ['HINCRBY', K.device, i.device, 1],
    ['HINCRBY', K.os, i.os, 1],
    ['HINCRBY', K.browser, i.browser, 1],
    ['HINCRBY', K.net, i.networkType, 1],
    ['HINCRBY', K.lang, i.lang, 1],
    ['HINCRBY', K.timeHour, hourKey(), 1],
    ['SADD', K.ipset, i.ipHash],
  ]
  if (i.message) {
    batch.push(['RPUSH', K.messages, JSON.stringify({ text: i.message, ts: Date.now() })])
    batch.push(['LTRIM', K.messages, -1000, -1])
  }
  const out = await pipeline(batch)
  const ipNew = Number(out[7])
  if (ipNew === 0) await pipeline([['INCR', K.dupip]])
  return { ok: true, results: await redisResults() }
}

async function redisAdmin(): Promise<AdminData> {
  const out = await pipeline([
    ['HGETALL', K.counts],
    ['HGETALL', K.device],
    ['HGETALL', K.os],
    ['HGETALL', K.browser],
    ['HGETALL', K.net],
    ['HGETALL', K.lang],
    ['HGETALL', K.timeHour],
    ['SCARD', K.ipset],
    ['GET', K.dupip],
    ['LRANGE', K.messages, -200, -1],
  ])
  const counts = { ...emptyCounts(), ...toNumMap(out[0]) }
  const messages = (Array.isArray(out[9]) ? (out[9] as unknown[]) : [])
    .map((s) => {
      try {
        return JSON.parse(String(s)) as { text: string; ts: number }
      } catch {
        return null
      }
    })
    .filter((m): m is { text: string; ts: number } => !!m)
    .reverse()
  return {
    counts,
    total: totalOf(counts),
    device: toNumMap(out[1]),
    os: toNumMap(out[2]),
    browser: toNumMap(out[3]),
    net: toNumMap(out[4]),
    lang: toNumMap(out[5]),
    timeHour: toNumMap(out[6]),
    distinctNetworks: Number(out[7]) || 0,
    repeatNetworkVotes: Number(out[8]) || 0,
    messages,
    persistent: true,
  }
}

// ---------- Local file backend (dev fallback) ----------
const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'votes.json')
type FileData = {
  counts: Record<string, number>
  voters: string[]
  ipHashes: string[]
  dupip: number
  device: Record<string, number>
  os: Record<string, number>
  browser: Record<string, number>
  net: Record<string, number>
  lang: Record<string, number>
  timeHour: Record<string, number>
  messages: { text: string; ts: number }[]
}

function readFile(): FileData {
  const base: FileData = {
    counts: emptyCounts(), voters: [], ipHashes: [], dupip: 0,
    device: {}, os: {}, browser: {}, net: {}, lang: {}, timeHour: {}, messages: [],
  }
  try {
    const p = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    return { ...base, ...p, counts: { ...emptyCounts(), ...(p.counts || {}) } }
  } catch {
    return base
  }
}
function writeFile(d: FileData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(d))
}
function bump(map: Record<string, number>, key: string): void {
  map[key] = (map[key] || 0) + 1
}
function fileResults(): Results {
  const d = readFile()
  return { counts: d.counts, total: totalOf(d.counts) }
}
function fileVote(i: VoteInput): VoteOutcome {
  const d = readFile()
  if (d.voters.includes(i.voterId)) {
    return { ok: false, reason: 'already_voted', results: { counts: d.counts, total: totalOf(d.counts) } }
  }
  d.voters.push(i.voterId)
  bump(d.counts, i.candidateId)
  bump(d.device, i.device)
  bump(d.os, i.os)
  bump(d.browser, i.browser)
  bump(d.net, i.networkType)
  bump(d.lang, i.lang)
  bump(d.timeHour, hourKey())
  if (d.ipHashes.includes(i.ipHash)) d.dupip += 1
  else d.ipHashes.push(i.ipHash)
  if (i.message) {
    d.messages.push({ text: i.message, ts: Date.now() })
    if (d.messages.length > 1000) d.messages = d.messages.slice(-1000)
  }
  writeFile(d)
  return { ok: true, results: { counts: d.counts, total: totalOf(d.counts) } }
}
function fileAdmin(): AdminData {
  const d = readFile()
  return {
    counts: d.counts, total: totalOf(d.counts),
    device: d.device, os: d.os, browser: d.browser, net: d.net, lang: d.lang,
    timeHour: d.timeHour, distinctNetworks: d.ipHashes.length, repeatNetworkVotes: d.dupip,
    messages: d.messages.slice(-200).reverse(), persistent: false,
  }
}

// ---------- Public API ----------
export async function getResults(): Promise<Results> {
  return hasRemoteStore ? redisResults() : fileResults()
}

export async function castVote(i: VoteInput): Promise<VoteOutcome> {
  if (!CANDIDATE_IDS.includes(i.candidateId)) {
    return { ok: false, reason: 'invalid_candidate', results: await getResults() }
  }
  if (!i.voterId || i.voterId.length < 8 || i.voterId.length > 100) {
    return { ok: false, reason: 'invalid_voter', results: await getResults() }
  }
  return hasRemoteStore ? redisVote(i) : fileVote(i)
}

export async function getAdminData(): Promise<AdminData> {
  return hasRemoteStore ? redisAdmin() : fileAdmin()
}

// A voter who has already voted may append an extra comment. It is stored in the
// same messages list (still NOT linked to their candidate choice).
export async function addComment(
  voterId: string,
  message: string,
): Promise<{ ok: boolean; reason?: 'invalid_voter' | 'not_voted' | 'empty' }> {
  if (!voterId || voterId.length < 8 || voterId.length > 100) return { ok: false, reason: 'invalid_voter' }
  if (!message) return { ok: false, reason: 'empty' }

  if (hasRemoteStore) {
    const [is] = await pipeline([['SISMEMBER', K.voters, voterId]])
    if (Number(is) === 0) return { ok: false, reason: 'not_voted' }
    await pipeline([
      ['RPUSH', K.messages, JSON.stringify({ text: message, ts: Date.now() })],
      ['LTRIM', K.messages, -1000, -1],
    ])
    return { ok: true }
  }

  const d = readFile()
  if (!d.voters.includes(voterId)) return { ok: false, reason: 'not_voted' }
  d.messages.push({ text: message, ts: Date.now() })
  if (d.messages.length > 1000) d.messages = d.messages.slice(-1000)
  writeFile(d)
  return { ok: true }
}
