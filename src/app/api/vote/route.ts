import { NextResponse } from 'next/server'
import { castVote, getResults, hasRemoteStore } from '@/lib/store'
import {
  clientIp,
  hashIp,
  parseUserAgent,
  normalizeNet,
  normalizeLang,
  cleanMessage,
} from '@/lib/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results = await getResults()
  return NextResponse.json({ ...results, persistent: hasRemoteStore })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  const { device, os, browser } = parseUserAgent(request.headers.get('user-agent') || '')

  // Block desktop/PC voting (the fake-vote attack came from Windows PCs).
  // Note: a User-Agent can be faked, so this stops casual abuse, not a
  // determined attacker — pair it with a voting code for stronger protection.
  if (device === 'Desktop') {
    return NextResponse.json({ ok: false, reason: 'desktop_blocked' }, { status: 403 })
  }

  const outcome = await castVote({
    candidateId: String(body?.candidateId ?? ''),
    voterId: String(body?.voterId ?? ''),
    lang: normalizeLang(body?.lang),
    networkType: normalizeNet(body?.networkType),
    device,
    os,
    browser,
    ipHash: hashIp(clientIp(request.headers)),
    message: cleanMessage(body?.message),
  })

  const status = outcome.ok
    ? 200
    : outcome.reason === 'already_voted'
      ? 409
      : outcome.reason === 'ip_limit'
        ? 429
        : 400
  return NextResponse.json(outcome, { status })
}
