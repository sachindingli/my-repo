'use client'

import { useEffect, useState } from 'react'
import styles from './admin.module.css'
import { CANDIDATES } from '@/lib/candidates'

type AdminData = {
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

const KEY_STORE = 'deengli_admin_key'

function Breakdown({ title, map }: { title: string; map: Record<string, number> }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, [, n]) => s + n, 0)
  return (
    <div className={styles.panel}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {entries.length === 0 && <p className={styles.empty}>No data yet</p>}
      {entries.map(([k, n]) => {
        const pct = total > 0 ? Math.round((n / total) * 100) : 0
        return (
          <div key={k} className={styles.statRow}>
            <span className={styles.statLabel}>{k}</span>
            <span className={styles.statBar}>
              <span className={styles.statFill} style={{ width: `${pct}%` }} />
            </span>
            <span className={styles.statNum}>
              {n} · {pct}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function Admin() {
  const [key, setKey] = useState('')
  const [data, setData] = useState<AdminData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load(k: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin', { headers: { 'x-admin-key': k }, cache: 'no-store' })
      if (res.status === 503) {
        setError('Admin password is not configured. Set ADMIN_PASSWORD in your environment and redeploy.')
        return
      }
      if (res.status === 401) {
        setError('Wrong password.')
        return
      }
      const json = await res.json()
      if (json.ok) {
        setData(json.data)
        try {
          sessionStorage.setItem(KEY_STORE, k)
        } catch {
          /* ignore */
        }
      } else {
        setError('Could not load.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORE)
      if (saved) {
        setKey(saved)
        void load(saved)
      }
    } catch {
      /* ignore */
    }
  }, [])

  function logout() {
    try {
      sessionStorage.removeItem(KEY_STORE)
    } catch {
      /* ignore */
    }
    setData(null)
    setKey('')
  }

  if (!data) {
    return (
      <main className={styles.page}>
        <div className={styles.loginShell}>
          <h1 className={styles.loginTitle}>Admin · Deengli Poll</h1>
          <p className={styles.loginHint}>Enter the admin password to view results.</p>
          <input
            className={styles.input}
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(key)}
            placeholder="Password"
            autoFocus
          />
          <button className={styles.loginBtn} onClick={() => load(key)} disabled={loading || !key}>
            {loading ? 'Loading…' : 'Open dashboard'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </main>
    )
  }

  const leaderId =
    data.total > 0
      ? CANDIDATES.reduce(
          (b, c) => ((data.counts[c.id] || 0) > (data.counts[b.id] || 0) ? c : b),
          CANDIDATES[0],
        ).id
      : null
  const timeEntries = Object.entries(data.timeHour).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <div className={styles.topActions}>
            <button className={styles.ghost} onClick={() => load(key)}>
              Refresh
            </button>
            <button className={styles.ghost} onClick={logout}>
              Lock
            </button>
          </div>
        </div>

        {!data.persistent && (
          <p className={styles.warn}>⚠ Demo storage — not shared/persistent. Configure a database (see README).</p>
        )}

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={styles.kpiNum}>{data.total}</span>
            <span className={styles.kpiLabel}>Total votes</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiNum}>{data.distinctNetworks}</span>
            <span className={styles.kpiLabel}>Distinct networks</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiNum}>{data.repeatNetworkVotes}</span>
            <span className={styles.kpiLabel}>Repeat-network votes</span>
          </div>
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Results</h3>
          {CANDIDATES.map((c) => {
            const n = data.counts[c.id] || 0
            const pct = data.total > 0 ? Math.round((n / data.total) * 100) : 0
            return (
              <div key={c.id} className={styles.statRow}>
                <span className={styles.statLabel}>
                  {c.name}
                  {leaderId === c.id && data.total > 0 && <span className={styles.lead}> ★</span>}
                </span>
                <span className={styles.statBar}>
                  <span className={styles.statFill} style={{ width: `${pct}%`, background: c.accent }} />
                </span>
                <span className={styles.statNum}>
                  {n} · {pct}%
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.grid}>
          <Breakdown title="Device" map={data.device} />
          <Breakdown title="OS" map={data.os} />
          <Breakdown title="Browser" map={data.browser} />
          <Breakdown title="Network type" map={data.net} />
          <Breakdown title="Language" map={data.lang} />
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Votes over time (hourly, UTC)</h3>
          {timeEntries.length === 0 && <p className={styles.empty}>No data yet</p>}
          {(() => {
            const max = Math.max(1, ...timeEntries.map(([, n]) => n))
            return timeEntries.map(([h, n]) => (
              <div key={h} className={styles.statRow}>
                <span className={styles.statLabelSmall}>{h}</span>
                <span className={styles.statBar}>
                  <span className={styles.statFill} style={{ width: `${Math.round((n / max) * 100)}%` }} />
                </span>
                <span className={styles.statNum}>{n}</span>
              </div>
            ))
          })()}
        </div>

        <div className={styles.panel}>
          <h3 className={styles.panelTitle}>Messages ({data.messages.length})</h3>
          <p className={styles.note}>
            Voluntary messages, stored separately from vote choices — they are not linked to any candidate.
          </p>
          {data.messages.length === 0 && <p className={styles.empty}>No messages yet</p>}
          <ul className={styles.msgList}>
            {data.messages.map((m, i) => (
              <li key={i} className={styles.msgItem}>
                <span className={styles.msgText}>{m.text}</span>
                <span className={styles.msgTime}>{new Date(m.ts).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className={styles.footerNote}>
          This dashboard shows aggregate figures only. It deliberately does not record which candidate any
          individual voter chose, and it never stores raw IPs or names.
        </p>
      </div>
    </main>
  )
}
