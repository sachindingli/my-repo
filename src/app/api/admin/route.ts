import { NextResponse } from 'next/server'
import { getAdminData } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const password = process.env.ADMIN_PASSWORD
  if (!password) {
    return NextResponse.json(
      { ok: false, reason: 'not_configured' },
      { status: 503 },
    )
  }
  const key = request.headers.get('x-admin-key') || ''
  if (key !== password) {
    return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 })
  }
  const data = await getAdminData()
  return NextResponse.json({ ok: true, data })
}
