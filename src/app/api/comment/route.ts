import { NextResponse } from 'next/server'
import { addComment } from '@/lib/store'
import { cleanMessage } from '@/lib/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  const message = cleanMessage(body?.message)
  if (!message) return NextResponse.json({ ok: false, reason: 'empty' }, { status: 400 })

  const out = await addComment(String(body?.voterId ?? ''), message)
  const status = out.ok ? 200 : out.reason === 'not_voted' ? 403 : 400
  return NextResponse.json(out, { status })
}
