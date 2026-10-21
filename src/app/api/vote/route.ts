import { NextResponse } from 'next/server'
import { castVote, getResults, hasRemoteStore } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const results = await getResults()
  return NextResponse.json({ ...results, persistent: hasRemoteStore })
}

export async function POST(request: Request) {
  let body: { candidateId?: unknown; voterId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  const candidateId = String(body?.candidateId ?? '')
  const voterId = String(body?.voterId ?? '')
  const outcome = await castVote(candidateId, voterId)

  const status = outcome.ok ? 200 : outcome.reason === 'already_voted' ? 409 : 400
  return NextResponse.json(outcome, { status })
}
