'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { CANDIDATES } from '@/lib/candidates'

type Results = { counts: Record<string, number>; total: number; persistent?: boolean }

const VOTER_KEY = 'deengli_voter_id'
const VOTED_KEY = 'deengli_voted_for'

function makeId(): string {
  const c = typeof crypto !== 'undefined' ? crypto : undefined
  if (c && 'randomUUID' in c) return c.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

function getVoterId(): string {
  try {
    let id = localStorage.getItem(VOTER_KEY)
    if (!id) {
      id = makeId()
      localStorage.setItem(VOTER_KEY, id)
    }
    return id
  } catch {
    return makeId()
  }
}

export default function Home() {
  const [results, setResults] = useState<Results | null>(null)
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    try {
      const v = localStorage.getItem(VOTED_KEY)
      if (v) {
        setVotedFor(v)
        setShowResults(true)
      }
    } catch {
      /* storage unavailable */
    }
    void fetchResults()
  }, [])

  async function fetchResults() {
    try {
      const res = await fetch('/api/vote', { cache: 'no-store' })
      if (res.ok) setResults(await res.json())
    } catch {
      /* ignore */
    }
  }

  async function vote(candidateId: string) {
    if (submitting || votedFor) return
    setNotice(null)
    setSubmitting(candidateId)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, voterId: getVoterId() }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        try {
          localStorage.setItem(VOTED_KEY, candidateId)
        } catch {
          /* ignore */
        }
        setVotedFor(candidateId)
        setResults(data.results)
        setShowResults(true)
      } else if (data.reason === 'already_voted') {
        setVotedFor((prev) => prev || candidateId)
        setResults(data.results)
        setShowResults(true)
        setNotice('इस डिवाइस से पहले ही वोट दिया जा चुका है · This device has already voted.')
      } else {
        setNotice('कुछ गड़बड़ हुई, फिर कोशिश करें · Something went wrong, please try again.')
      }
    } catch {
      setNotice('नेटवर्क की समस्या · Network problem. Check your connection and retry.')
    } finally {
      setSubmitting(null)
    }
  }

  const counts = results?.counts ?? {}
  const total = results?.total ?? 0
  const leaderId =
    total > 0
      ? CANDIDATES.reduce((best, c) => ((counts[c.id] || 0) > (counts[best.id] || 0) ? c : best), CANDIDATES[0]).id
      : null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <p className={styles.kicker}>ग्राम पंचायत देंगली</p>
          <h1 className={styles.title}>सरपंच चुनाव</h1>
          <p className={styles.subtitle}>Deengli Village · Sarpanch Poll · 2026</p>
        </header>

        <div className={styles.privacy} role="note">
          <strong>गुप्त मतदान · Secret ballot.</strong> We do not ask for or store your
          name, phone number, or any personal details — only the vote count. One vote per
          device.
        </div>

        {!showResults ? (
          <section aria-label="Candidates" className={styles.list}>
            <p className={styles.prompt}>अपने उम्मीदवार को चुनें · Tap your candidate to vote</p>
            {CANDIDATES.map((c) => (
              <button
                key={c.id}
                className={styles.card}
                style={{ ['--accent' as string]: c.accent }}
                onClick={() => vote(c.id)}
                disabled={submitting !== null}
              >
                <span className={styles.symbol} aria-hidden="true">
                  {c.symbol}
                </span>
                <span className={styles.names}>
                  <span className={styles.nameHi}>{c.nameHi}</span>
                  <span className={styles.nameEn}>{c.name}</span>
                </span>
                <span className={styles.action}>{submitting === c.id ? '…' : 'वोट'}</span>
              </button>
            ))}
          </section>
        ) : (
          <section aria-label="Results" className={styles.results}>
            <div className={styles.resultsHead}>
              <h2 className={styles.resultsTitle}>परिणाम · Live Results</h2>
              <span className={styles.total}>{total} वोट</span>
            </div>
            {CANDIDATES.map((c) => {
              const n = counts[c.id] || 0
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              return (
                <div key={c.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.rowName}>
                      <span aria-hidden="true">{c.symbol}</span> {c.name}
                      {votedFor === c.id && <span className={styles.youTag}>आपका वोट</span>}
                      {leaderId === c.id && total > 0 && <span className={styles.leadTag}>आगे</span>}
                    </span>
                    <span className={styles.rowPct}>
                      {pct}% · {n}
                    </span>
                  </div>
                  <div className={styles.bar}>
                    <div
                      className={styles.fill}
                      style={{ width: `${pct}%`, background: c.accent }}
                    />
                  </div>
                </div>
              )
            })}
            <button className={styles.refresh} onClick={() => void fetchResults()}>
              ताज़ा करें · Refresh
            </button>
          </section>
        )}

        {notice && <p className={styles.notice}>{notice}</p>}

        {!showResults && (
          <button className={styles.resultsLink} onClick={() => setShowResults(true)}>
            परिणाम देखें · View current results
          </button>
        )}

        <footer className={styles.footer}>
          <p className={styles.disclaimer}>
            अनौपचारिक जनमत संग्रह — यह आधिकारिक ग्राम पंचायत चुनाव नहीं है।
            <br />
            Unofficial community poll — this is not the official Gram Panchayat election.
          </p>
          {results && results.persistent === false && (
            <p className={styles.warn}>
              ⚠ Demo storage only — votes are not shared yet. Configure a database before
              sharing the link (see README).
            </p>
          )}
        </footer>
      </div>
    </main>
  )
}
