'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { CANDIDATES } from '@/lib/candidates'

type Lang = 'hi' | 'en'
type Results = { counts: Record<string, number>; total: number; persistent?: boolean }

const VOTER_KEY = 'deengli_voter_id'
const VOTED_KEY = 'deengli_voted_for'
const LANG_KEY = 'deengli_lang'

const T = {
  hi: {
    panchayat: 'ग्राम पंचायत देंगली',
    title: 'सरपंच चुनाव',
    subtitle: 'देंगली गाँव · जनमत संग्रह · 2026',
    privacyTitle: 'गुप्त मतदान',
    privacy:
      'हम आपका नाम या मोबाइल नंबर नहीं पूछते। आपने किसे वोट दिया यह आपकी पहचान या डिवाइस के साथ कभी नहीं जोड़ा जाता। मतदान को निष्पक्ष रखने के लिए बुनियादी तकनीकी जानकारी (ब्राउज़र, डिवाइस, नेटवर्क) और IP का सुरक्षित रूप दर्ज किया जाता है। एक डिवाइस से एक वोट।',
    prompt: 'अपने उम्मीदवार को चुनें',
    messageLabel: 'संदेश (वैकल्पिक)',
    messagePlaceholder: 'आयोजकों के लिए कोई संदेश… (गुप्त रखा जाएगा, वोट से अलग)',
    submit: 'वोट जमा करें',
    submitting: 'जमा हो रहा है…',
    pickFirst: 'पहले एक उम्मीदवार चुनें',
    viewResults: 'परिणाम देखें',
    resultsTitle: 'परिणाम',
    votes: 'वोट',
    yourVote: 'आपका वोट',
    leading: 'आगे',
    refresh: 'ताज़ा करें',
    already: 'इस डिवाइस से पहले ही वोट दिया जा चुका है।',
    genericErr: 'कुछ गड़बड़ हुई, फिर कोशिश करें।',
    networkErr: 'नेटवर्क की समस्या — कनेक्शन जाँचें।',
    disclaimer: 'अनौपचारिक जनमत संग्रह — यह आधिकारिक ग्राम पंचायत चुनाव नहीं है।',
    demoWarn: 'डेमो स्टोरेज — वोट अभी साझा नहीं हो रहे। लिंक शेयर करने से पहले डेटाबेस सेट करें (README देखें)।',
  },
  en: {
    panchayat: 'Deengli Gram Panchayat',
    title: 'Sarpanch Poll',
    subtitle: 'Deengli Village · Community Poll · 2026',
    privacyTitle: 'Secret ballot',
    privacy:
      'We never ask for your name or phone number, and we never store which candidate you chose together with your identity or device. To keep the poll fair, basic technical info (browser, device, network) and a protected form of your IP are recorded. One vote per device.',
    prompt: 'Choose your candidate',
    messageLabel: 'Message (optional)',
    messagePlaceholder: 'A message for the organisers… (kept private, separate from your vote)',
    submit: 'Submit vote',
    submitting: 'Submitting…',
    pickFirst: 'Please pick a candidate first',
    viewResults: 'View current results',
    resultsTitle: 'Live Results',
    votes: 'votes',
    yourVote: 'your vote',
    leading: 'leading',
    refresh: 'Refresh',
    already: 'This device has already voted.',
    genericErr: 'Something went wrong, please try again.',
    networkErr: 'Network problem — check your connection.',
    disclaimer: 'Unofficial community poll — this is not the official Gram Panchayat election.',
    demoWarn: 'Demo storage — votes are not shared yet. Configure a database before sharing the link (see README).',
  },
} as const

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
function networkType(): string {
  try {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
    return conn?.effectiveType || 'unknown'
  } catch {
    return 'unknown'
  }
}

export default function Home() {
  const [lang, setLang] = useState<Lang>('hi')
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const t = T[lang]

  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY)
      if (l === 'en' || l === 'hi') setLang(l)
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

  function changeLang(l: Lang) {
    setLang(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }

  async function fetchResults() {
    try {
      const res = await fetch('/api/vote', { cache: 'no-store' })
      if (res.ok) setResults(await res.json())
    } catch {
      /* ignore */
    }
  }

  async function submitVote() {
    if (submitting || votedFor) return
    if (!selected) {
      setNotice(t.pickFirst)
      return
    }
    setNotice(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: selected,
          voterId: getVoterId(),
          lang,
          networkType: networkType(),
          message,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        try {
          localStorage.setItem(VOTED_KEY, selected)
        } catch {
          /* ignore */
        }
        setVotedFor(selected)
        setResults(data.results)
        setShowResults(true)
      } else if (data.reason === 'already_voted') {
        setVotedFor((prev) => prev || selected)
        setResults(data.results)
        setShowResults(true)
        setNotice(t.already)
      } else {
        setNotice(t.genericErr)
      }
    } catch {
      setNotice(t.networkErr)
    } finally {
      setSubmitting(false)
    }
  }

  const counts = results?.counts ?? {}
  const total = results?.total ?? 0
  const leaderId =
    total > 0
      ? CANDIDATES.reduce((b, c) => ((counts[c.id] || 0) > (counts[b.id] || 0) ? c : b), CANDIDATES[0]).id
      : null

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.langRow}>
          <button
            className={`${styles.langBtn} ${lang === 'hi' ? styles.langActive : ''}`}
            onClick={() => changeLang('hi')}
          >
            हिंदी
          </button>
          <button
            className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
            onClick={() => changeLang('en')}
          >
            English
          </button>
        </div>

        <header className={styles.header}>
          <p className={styles.kicker}>{t.panchayat}</p>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
        </header>

        <div className={styles.privacy} role="note">
          <strong>{t.privacyTitle}.</strong> {t.privacy}
        </div>

        {!showResults ? (
          <section aria-label="Vote" className={styles.list}>
            <p className={styles.prompt}>{t.prompt}</p>
            {CANDIDATES.map((c) => (
              <button
                key={c.id}
                className={`${styles.card} ${selected === c.id ? styles.cardSelected : ''}`}
                style={{ ['--accent' as string]: c.accent }}
                onClick={() => setSelected(c.id)}
                disabled={submitting}
                aria-pressed={selected === c.id}
              >
                <span className={styles.symbol} aria-hidden="true">
                  {c.symbol}
                </span>
                <span className={styles.names}>
                  <span className={styles.nameHi}>{lang === 'hi' ? c.nameHi : c.name}</span>
                  <span className={styles.nameEn}>{lang === 'hi' ? c.name : c.nameHi}</span>
                </span>
                <span className={styles.radio} aria-hidden="true">
                  {selected === c.id ? '●' : '○'}
                </span>
              </button>
            ))}

            <label className={styles.msgLabel} htmlFor="msg">
              {t.messageLabel}
            </label>
            <textarea
              id="msg"
              className={styles.msgBox}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder={t.messagePlaceholder}
              rows={3}
              maxLength={500}
              disabled={submitting}
            />

            <button
              className={styles.submit}
              onClick={submitVote}
              disabled={submitting || !selected}
            >
              {submitting ? t.submitting : t.submit}
            </button>

            <button className={styles.resultsLink} onClick={() => setShowResults(true)}>
              {t.viewResults}
            </button>
          </section>
        ) : (
          <section aria-label="Results" className={styles.results}>
            <div className={styles.resultsHead}>
              <h2 className={styles.resultsTitle}>{t.resultsTitle}</h2>
              <span className={styles.total}>
                {total} {t.votes}
              </span>
            </div>
            {CANDIDATES.map((c) => {
              const n = counts[c.id] || 0
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              return (
                <div key={c.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.rowName}>
                      <span aria-hidden="true">{c.symbol}</span>{' '}
                      {lang === 'hi' ? c.nameHi : c.name}
                      {votedFor === c.id && <span className={styles.youTag}>{t.yourVote}</span>}
                      {leaderId === c.id && total > 0 && (
                        <span className={styles.leadTag}>{t.leading}</span>
                      )}
                    </span>
                    <span className={styles.rowPct}>
                      {pct}% · {n}
                    </span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.fill} style={{ width: `${pct}%`, background: c.accent }} />
                  </div>
                </div>
              )
            })}
            <button className={styles.refresh} onClick={() => void fetchResults()}>
              {t.refresh}
            </button>
          </section>
        )}

        {notice && <p className={styles.notice}>{notice}</p>}

        <footer className={styles.footer}>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
          {results && results.persistent === false && <p className={styles.warn}>⚠ {t.demoWarn}</p>}
        </footer>
      </div>
    </main>
  )
}
