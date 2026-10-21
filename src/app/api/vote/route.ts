import { NextResponse } from 'next/server'
import { castVote, getResults, hasRemoteStore, getPollClosed } from '@/lib/store'
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
  const closed = await getPollClosed()
  return NextResponse.json({ ...results, persistent: hasRemoteStore, closed })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  if (await getPollClosed()) {
    return NextResponse.json({ ok: false, reason: 'closed' }, { status: 403 })
  }

  const { device, os, browser } = parseUserAgent(request.headers.get('user-agent') || '')

  // Block desktop/PC voting (the fake-vote attack came from Windows PCs).
  // Note: a User-Agent can be faked, so this stops casual abuse, not a
  // determined attacker — pair it with a voting code for stronger protection.
  if (device === 'Desktop') {
    return NextResponse.json({ ok: false, reason: 'desktop_blocked' }, { status: 403 })
  }

  const ip = clientIp(request.headers)

  // CAPTCHA (Cloudflare Turnstile) — stops automated/bot voting. Enforced only
  // when TURNSTILE_SECRET_KEY is set, so the site keeps working until keys are
  // added.
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY
  if (turnstileSecret) {
    const token = String(body?.turnstileToken ?? '')
    if (!token) {
      return NextResponse.json({ ok: false, reason: 'captcha_required' }, { status: 400 })
    }
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, remoteip: ip }),
        cache: 'no-store',
      })
      const verify = (await verifyRes.json()) as { success?: boolean }
      if (!verify.success) {
        return NextResponse.json({ ok: false, reason: 'captcha_failed' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ ok: false, reason: 'captcha_failed' }, { status: 403 })
    }
  }

  const outcome = await castVote({
    candidateId: String(body?.candidateId ?? ''),
    voterId: String(body?.voterId ?? ''),
    lang: normalizeLang(body?.lang),
    networkType: normalizeNet(body?.networkType),
    device,
    os,
    browser,
    ipHash: hashIp(ip),
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
