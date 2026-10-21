// Vote storage.
//
// In production (e.g. Vercel) set an Upstash Redis / Vercel KV REST endpoint via
// env vars and votes persist there. With no env configured it falls back to a
// local JSON file, which is fine for `npm run dev` but will NOT persist on
// serverless hosting (read-only / ephemeral filesystem) — so configure the REST
// store before sharing the link.
//
// Privacy: we store only per-candidate counts and a set of random, client-
// generated voter ids used purely to stop the same browser voting twice. No
// name, phone number, IP address, or device details are stored.
import fs from 'fs'
import path from 'path'
import { CANDIDATE_IDS } from './candidates'

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

export const hasRemoteStore = Boolean(REST_URL && REST_TOKEN)

const COUNT_KEY = (id: string) => `vote:count:${id}`
const VOTERS_KEY = 'vote:voters'

export type Results = { counts: Record<string, number>; total: number }
export type VoteOutcome = {
  ok: boolean
  reason?: 'already_voted' | 'invalid_candidate' | 'invalid_voter'
  results: Results
}

function emptyCounts(): Record<string, number> {
  const c: Record<string, number> = {}
  for (const id of CANDIDATE_IDS) c[id] = 0
  return c
}

function totalOf(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0)
}

// ---------- Upstash / Vercel KV (REST) backend ----------
async function redisPipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Redis REST error ${res.status}`)
  const data = (await res.json()) as Array<{ result?: unknown; error?: string }>
  return data.map((d) => d.result)
}

async function redisResults(): Promise<Results> {
  const raw = await redisPipeline(CANDIDATE_IDS.map((id) => ['GET', COUNT_KEY(id)]))
  const counts = emptyCounts()
  CANDIDATE_IDS.forEach((id, i) => {
    counts[id] = Number(raw[i] ?? 0) || 0
  })
  return { counts, total: totalOf(counts) }
}

async function redisVote(candidateId: string, voterId: string): Promise<VoteOutcome> {
  const added = await redisPipeline([['SADD', VOTERS_KEY, voterId]])
  if (Number(added[0]) === 0) {
    return { ok: false, reason: 'already_voted', results: await redisResults() }
  }
  await redisPipeline([['INCR', COUNT_KEY(candidateId)]])
  return { ok: true, results: await redisResults() }
}

// ---------- Local file backend (dev fallback) ----------
const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'votes.json')

type FileData = { counts: Record<string, number>; voters: string[] }

function readFile(): FileData {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    return { counts: { ...emptyCounts(), ...parsed.counts }, voters: parsed.voters || [] }
  } catch {
    return { counts: emptyCounts(), voters: [] }
  }
}

function writeFile(data: FileData): void {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(data))
}

function fileResults(): Results {
  const data = readFile()
  return { counts: data.counts, total: totalOf(data.counts) }
}

function fileVote(candidateId: string, voterId: string): VoteOutcome {
  const data = readFile()
  if (data.voters.includes(voterId)) {
    return { ok: false, reason: 'already_voted', results: { counts: data.counts, total: totalOf(data.counts) } }
  }
  data.counts[candidateId] = (data.counts[candidateId] || 0) + 1
  data.voters.push(voterId)
  writeFile(data)
  return { ok: true, results: { counts: data.counts, total: totalOf(data.counts) } }
}

// ---------- Public API ----------
export async function getResults(): Promise<Results> {
  return hasRemoteStore ? redisResults() : fileResults()
}

export async function castVote(candidateId: string, voterId: string): Promise<VoteOutcome> {
  if (!CANDIDATE_IDS.includes(candidateId)) {
    return { ok: false, reason: 'invalid_candidate', results: await getResults() }
  }
  if (!voterId || typeof voterId !== 'string' || voterId.length < 8 || voterId.length > 100) {
    return { ok: false, reason: 'invalid_voter', results: await getResults() }
  }
  return hasRemoteStore ? redisVote(candidateId, voterId) : fileVote(candidateId, voterId)
}
