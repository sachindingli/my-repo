'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { CANDIDATES, NOTA, VOTE_OPTIONS } from '@/lib/candidates'
import { winChances } from '@/lib/forecast'

type Lang = 'hi' | 'en'
type Results = { counts: Record<string, number>; total: number; persistent?: boolean; closed?: boolean }
type Msg = { text: string; ts: number }

const VOTER_KEY = 'deengli_voter_id'
const VOTED_KEY = 'deengli_voted_for'
const LANG_KEY = 'deengli_lang'
const MSGS_KEY = 'deengli_my_messages'
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

const T = {
  hi: {
    chooseLang: 'भाषा चुनें',
    chooseLangSub: 'Please choose your language',
    panchayat: 'ग्राम पंचायत डिंगली',
    title: 'सरपंच चुनाव',
    subtitle: 'डिंगली गाँव · जनमत संग्रह · 2026',
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
    desktopBlocked: 'कंप्यूटर/लैपटॉप से वोट बंद है। कृपया अपने मोबाइल फ़ोन से वोट करें।',
    ipLimit: 'इस नेटवर्क से बहुत वोट आ चुके हैं। कृपया बाद में या किसी और नेटवर्क से कोशिश करें।',
    captchaRequired: 'कृपया नीचे दी गई जाँच (मैं रोबोट नहीं हूँ) पूरी करें।',
    votingClosed: 'मतदान बंद हो चुका है।',
    closedBanner: 'मतदान बंद',
    unreliableNote: 'नोट: इस poll में बहुत सारे स्वतः/नकली वोट आए थे, इसलिए ये आँकड़े भरोसेमंद नतीजा नहीं हैं।',
    genericErr: 'कुछ गड़बड़ हुई, फिर कोशिश करें।',
    networkErr: 'नेटवर्क की समस्या — कनेक्शन जाँचें।',
    disclaimer: 'अनौपचारिक जनमत संग्रह — यह आधिकारिक ग्राम पंचायत चुनाव नहीं है।',
    demoWarn: 'डेमो स्टोरेज — वोट अभी साझा नहीं हो रहे। लिंक शेयर करने से पहले डेटाबेस सेट करें (README देखें)।',
    currentlyLeading: 'अभी आगे',
    winChance: 'जीत की संभावना',
    forecastNote: 'वर्तमान वोटों के आधार पर अनुमान — आधिकारिक भविष्यवाणी नहीं।',
    yourSubmission: 'आपका मतदान',
    youVotedFor: 'आपने वोट दिया',
    yourMessages: 'आपके संदेश',
    noMessage: 'कोई संदेश नहीं',
    addComment: 'और टिप्पणी जोड़ें',
    addCommentPh: 'अपनी टिप्पणी लिखें…',
    add: 'जोड़ें',
    adding: 'जोड़ा जा रहा है…',
    commentAdded: 'टिप्पणी जोड़ी गई',
    madeBy: 'बनाया गया —',
  },
  en: {
    chooseLang: 'Choose language',
    chooseLangSub: 'अपनी भाषा चुनें',
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
    desktopBlocked: 'Voting from computer/laptop is disabled. Please vote from your mobile phone.',
    ipLimit: 'Too many votes from this network already. Please try later or from another network.',
    captchaRequired: 'Please complete the "I am not a robot" check below.',
    votingClosed: 'Voting is closed.',
    closedBanner: 'Voting closed',
    unreliableNote: 'Note: this poll received many automated/fake votes, so these numbers are not a reliable result.',
    genericErr: 'Something went wrong, please try again.',
    networkErr: 'Network problem — check your connection.',
    disclaimer: 'Unofficial community poll — this is not the official Gram Panchayat election.',
    demoWarn: 'Demo storage — votes are not shared yet. Configure a database before sharing the link (see README).',
    currentlyLeading: 'Currently leading',
    winChance: 'Winning chance',
    forecastNote: 'Rough projection from current votes — not an official forecast.',
    yourSubmission: 'Your vote',
    youVotedFor: 'You voted for',
    yourMessages: 'Your messages',
    noMessage: 'No message',
    addComment: 'Add another comment',
    addCommentPh: 'Write your comment…',
    add: 'Add',
    adding: 'Adding…',
    commentAdded: 'Comment added',
    madeBy: 'Made by —',
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
function readMyMessages(): Msg[] {
  try {
    const raw = localStorage.getItem(MSGS_KEY)
    return raw ? (JSON.parse(raw) as Msg[]) : []
  } catch {
    return []
  }
}
function saveMyMessages(msgs: Msg[]): void {
  try {
    localStorage.setItem(MSGS_KEY, JSON.stringify(msgs))
  } catch {
    /* ignore */
  }
}

export default function Home() {
  const [ready, setReady] = useState(false)
  const [lang, setLang] = useState<Lang>('hi')
  const [langChosen, setLangChosen] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [results, setResults] = useState<Results | null>(null)
  const [votedFor, setVotedFor] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [myMessages, setMyMessages] = useState<Msg[]>([])
  const [comment, setComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)
  const [commentDone, setCommentDone] = useState(false)
  const [captcha, setCaptcha] = useState('')

  const t = T[lang]

  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY)
      if (l === 'en' || l === 'hi') setLang(l)
      else setLangChosen(false)
      const v = localStorage.getItem(VOTED_KEY)
      if (v) {
        setVotedFor(v)
        setShowResults(true)
      }
      setMyMessages(readMyMessages())
    } catch {
      /* storage unavailable */
    }
    setReady(true)
    void fetchResults()
  }, [])

  // Load + render the Cloudflare Turnstile CAPTCHA widget (only if configured).
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || showResults || votedFor) return
    if (!document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script')
      s.id = 'cf-turnstile-script'
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
      s.async = true
      s.defer = true
      document.head.appendChild(s)
    }
    const iv = setInterval(() => {
      const w = (window as unknown as {
        turnstile?: { render: (el: string, opts: Record<string, unknown>) => void }
      }).turnstile
      const el = document.getElementById('cf-turnstile-box')
      if (w && el && !el.hasChildNodes()) {
        w.render('#cf-turnstile-box', {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (tok: string) => setCaptcha(tok),
          'error-callback': () => setCaptcha(''),
          'expired-callback': () => setCaptcha(''),
        })
        clearInterval(iv)
      }
    }, 300)
    const stop = setTimeout(() => clearInterval(iv), 15000)
    return () => {
      clearInterval(iv)
      clearTimeout(stop)
    }
  }, [showResults, votedFor])

  function pickLang(l: Lang) {
    setLang(l)
    setLangChosen(true)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* ignore */
    }
  }

  async function fetchResults() {
    try {
      const res = await fetch('/api/vote', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setResults(data)
        if (data.closed) setShowResults(true)
      }
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
    if (TURNSTILE_SITE_KEY && !captcha) {
      setNotice(t.captchaRequired)
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
          turnstileToken: captcha,
        }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        try {
          localStorage.setItem(VOTED_KEY, selected)
        } catch {
          /* ignore */
        }
        if (message.trim()) {
          const next = [...myMessages, { text: message.trim(), ts: Date.now() }]
          setMyMessages(next)
          saveMyMessages(next)
        }
        setVotedFor(selected)
        setResults(data.results)
        setShowResults(true)
      } else if (data.reason === 'already_voted') {
        setVotedFor((prev) => prev || selected)
        setResults(data.results)
        setShowResults(true)
        setNotice(t.already)
      } else if (data.reason === 'desktop_blocked') {
        setNotice(t.desktopBlocked)
      } else if (data.reason === 'ip_limit') {
        setNotice(t.ipLimit)
      } else if (data.reason === 'captcha_required' || data.reason === 'captcha_failed') {
        setNotice(t.captchaRequired)
        setCaptcha('')
      } else if (data.reason === 'closed') {
        setShowResults(true)
        setNotice(t.votingClosed)
      } else {
        setNotice(t.genericErr)
      }
    } catch {
      setNotice(t.networkErr)
    } finally {
      setSubmitting(false)
    }
  }

  async function addComment() {
    const text = comment.trim()
    if (!text || addingComment) return
    setAddingComment(true)
    setCommentDone(false)
    try {
      const res = await fetch('/api/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voterId: getVoterId(), message: text }),
      })
      if (res.ok) {
        const next = [...myMessages, { text, ts: Date.now() }]
        setMyMessages(next)
        saveMyMessages(next)
        setComment('')
        setCommentDone(true)
      } else {
        setNotice(t.genericErr)
      }
    } catch {
      setNotice(t.networkErr)
    } finally {
      setAddingComment(false)
    }
  }

  const counts = results?.counts ?? {}
  const total = results?.total ?? 0
  const leader =
    total > 0
      ? CANDIDATES.reduce((b, c) => ((counts[c.id] || 0) > (counts[b.id] || 0) ? c : b), CANDIDATES[0])
      : null
  const chances = winChances(counts)
  const votedCandidate = VOTE_OPTIONS.find((c) => c.id === votedFor) || null

  return (
    <main className={styles.page}>
      {ready && !langChosen && (
        <div className={styles.modalBg} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>भाषा चुनें / Choose language</h2>
            <div className={styles.modalBtns}>
              <button className={styles.modalBtn} onClick={() => pickLang('hi')}>
                हिंदी
              </button>
              <button className={styles.modalBtn} onClick={() => pickLang('en')}>
                English
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.shell}>
        <div className={styles.langRow}>
          <button
            className={`${styles.langBtn} ${lang === 'hi' ? styles.langActive : ''}`}
            onClick={() => pickLang('hi')}
          >
            हिंदी
          </button>
          <button
            className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
            onClick={() => pickLang('en')}
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

            <button
              className={`${styles.card} ${styles.notaCard} ${selected === NOTA.id ? styles.cardSelected : ''}`}
              style={{ ['--accent' as string]: NOTA.accent }}
              onClick={() => setSelected(NOTA.id)}
              disabled={submitting}
              aria-pressed={selected === NOTA.id}
            >
              <span className={styles.symbol} aria-hidden="true">
                {NOTA.symbol}
              </span>
              <span className={styles.names}>
                <span className={styles.nameHi}>{lang === 'hi' ? NOTA.nameHi : NOTA.name}</span>
              </span>
              <span className={styles.radio} aria-hidden="true">
                {selected === NOTA.id ? '●' : '○'}
              </span>
            </button>

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

            {TURNSTILE_SITE_KEY && <div id="cf-turnstile-box" className={styles.captcha} />}

            <button className={styles.submit} onClick={submitVote} disabled={submitting || !selected}>
              {submitting ? t.submitting : t.submit}
            </button>

            <button className={styles.resultsLink} onClick={() => setShowResults(true)}>
              {t.viewResults}
            </button>
          </section>
        ) : (
          <section aria-label="Results" className={styles.results}>
            {results?.closed && (
              <div className={styles.closedBanner}>
                <strong>🔒 {t.closedBanner}</strong>
                <span className={styles.unreliable}>{t.unreliableNote}</span>
              </div>
            )}
            {leader && (
              <div className={styles.winner} style={{ ['--accent' as string]: leader.accent }}>
                <span className={styles.crown} aria-hidden="true">
                  👑
                </span>
                <div className={styles.winnerInfo}>
                  <span className={styles.winnerLabel}>{t.currentlyLeading}</span>
                  <span className={styles.winnerName}>
                    {leader.symbol} {lang === 'hi' ? leader.nameHi : leader.name}
                  </span>
                </div>
                <div className={styles.chanceBox}>
                  <span className={styles.chanceNum}>{chances[leader.id]}%</span>
                  <span className={styles.chanceLabel}>{t.winChance}</span>
                </div>
              </div>
            )}

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
                      <span aria-hidden="true">{c.symbol}</span> {lang === 'hi' ? c.nameHi : c.name}
                      {votedFor === c.id && <span className={styles.youTag}>{t.yourVote}</span>}
                      {leader?.id === c.id && total > 0 && (
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
            {(() => {
              const n = counts[NOTA.id] || 0
              const pct = total > 0 ? Math.round((n / total) * 100) : 0
              return (
                <div className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.rowName}>
                      <span aria-hidden="true">{NOTA.symbol}</span>{' '}
                      {lang === 'hi' ? NOTA.nameHi : NOTA.name}
                      {votedFor === NOTA.id && <span className={styles.youTag}>{t.yourVote}</span>}
                    </span>
                    <span className={styles.rowPct}>
                      {pct}% · {n}
                    </span>
                  </div>
                  <div className={styles.bar}>
                    <div className={styles.fill} style={{ width: `${pct}%`, background: NOTA.accent }} />
                  </div>
                </div>
              )
            })()}
            <p className={styles.forecastNote}>{t.forecastNote}</p>
            <button className={styles.refresh} onClick={() => void fetchResults()}>
              {t.refresh}
            </button>

            {votedCandidate && (
              <div className={styles.mine}>
                <h3 className={styles.mineTitle}>{t.yourSubmission}</h3>
                <p className={styles.mineVote}>
                  {t.youVotedFor}:{' '}
                  <strong>
                    {votedCandidate.symbol} {lang === 'hi' ? votedCandidate.nameHi : votedCandidate.name}
                  </strong>
                </p>
                <p className={styles.mineSub}>{t.yourMessages}</p>
                {myMessages.length === 0 ? (
                  <p className={styles.mineEmpty}>{t.noMessage}</p>
                ) : (
                  <ul className={styles.mineList}>
                    {myMessages.map((m, i) => (
                      <li key={i} className={styles.mineItem}>
                        <span>{m.text}</span>
                        <span className={styles.mineTime}>{new Date(m.ts).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <label className={styles.msgLabel} htmlFor="comment">
                  {t.addComment}
                </label>
                <textarea
                  id="comment"
                  className={styles.msgBox}
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value.slice(0, 500))
                    setCommentDone(false)
                  }}
                  placeholder={t.addCommentPh}
                  rows={2}
                  maxLength={500}
                  disabled={addingComment}
                />
                <button
                  className={styles.addBtn}
                  onClick={addComment}
                  disabled={addingComment || !comment.trim()}
                >
                  {addingComment ? t.adding : t.add}
                </button>
                {commentDone && <p className={styles.added}>✓ {t.commentAdded}</p>}
              </div>
            )}
          </section>
        )}

        {notice && <p className={styles.notice}>{notice}</p>}

        <footer className={styles.footer}>
          <p className={styles.disclaimer}>{t.disclaimer}</p>
          {results && results.persistent === false && <p className={styles.warn}>⚠ {t.demoWarn}</p>}
          <div className={styles.credits}>
            <span className={styles.creditName}>{t.madeBy} Sachin Jangir</span>
            <div className={styles.creditLinks}>
              <a
                className={styles.creditLink}
                href="https://instagram.com/thesachinjangir"
                target="_blank"
                rel="noopener noreferrer"
              >
                📷 Instagram: @thesachinjangir
              </a>
              <a
                className={styles.creditLink}
                href="https://wa.me/917023973072"
                target="_blank"
                rel="noopener noreferrer"
              >
                💬 WhatsApp: +91 70239 73072
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  )
}
