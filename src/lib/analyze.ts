// Server-side helpers to derive *aggregate*, non-identifying signals from a
// request. We intentionally never store raw IPs or tie any of this to the
// candidate a voter chose — only hashed IPs (for duplicate detection) and
// coarse device/OS/browser buckets (for aggregate stats).
import crypto from 'crypto'

const SALT = process.env.IP_HASH_SALT || process.env.ADMIN_PASSWORD || 'deengli-poll-salt'

export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}

// One-way hash: lets us count distinct networks and flag repeats without ever
// storing or revealing the real address.
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`${SALT}:${ip}`).digest('hex').slice(0, 24)
}

export function parseUserAgent(ua: string): { device: string; os: string; browser: string } {
  const s = ua || ''
  const isTablet = /ipad|tablet/i.test(s) || (/android/i.test(s) && !/mobile/i.test(s))
  const isMobile = /mobile|iphone|ipod/i.test(s) || (/android/i.test(s) && /mobile/i.test(s))
  const device = isTablet ? 'Tablet' : isMobile ? 'Mobile' : 'Desktop'

  let os = 'Other'
  if (/android/i.test(s)) os = 'Android'
  else if (/iphone|ipad|ipod/i.test(s)) os = 'iOS'
  else if (/windows/i.test(s)) os = 'Windows'
  else if (/mac os|macintosh/i.test(s)) os = 'macOS'
  else if (/linux/i.test(s)) os = 'Linux'

  let browser = 'Other'
  if (/edg/i.test(s)) browser = 'Edge'
  else if (/opr|opera/i.test(s)) browser = 'Opera'
  else if (/chrome|crios/i.test(s)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(s)) browser = 'Firefox'
  else if (/safari/i.test(s)) browser = 'Safari'

  return { device, os, browser }
}

const ALLOWED_NET = new Set(['slow-2g', '2g', '3g', '4g', '5g', 'wifi', 'unknown'])
export function normalizeNet(v: unknown): string {
  const s = String(v || 'unknown').toLowerCase()
  return ALLOWED_NET.has(s) ? s : 'unknown'
}

export function normalizeLang(v: unknown): string {
  return v === 'en' ? 'en' : 'hi'
}

export function cleanMessage(v: unknown): string {
  if (typeof v !== 'string') return ''
  // strip control chars, collapse whitespace, cap length
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500)
}
