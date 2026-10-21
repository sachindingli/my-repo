// Candidates for the Deengli Gram Panchayat Sarpanch poll.
// Symbols are decorative placeholders for the community poll — change them
// freely; they are not official election symbol allotments.
export type Candidate = {
  id: string
  name: string
  nameHi: string
  symbol: string
  accent: string
}

export const CANDIDATES: Candidate[] = [
  { id: 'ajay', name: 'Ajay Swami', nameHi: 'अजय स्वामी', symbol: '🌾', accent: '#e8590c' },
  { id: 'anil', name: 'Anil Poonia', nameHi: 'अनिल पूनिया', symbol: '🪔', accent: '#1864ab' },
  { id: 'sanjeev', name: 'Sanjeev Poonia', nameHi: 'संजीव पूनिया', symbol: '☀️', accent: '#2b8a3e' },
  { id: 'surendra', name: 'Surendra Jhajharia', nameHi: 'सुरेंद्र झाझड़िया', symbol: '🚜', accent: '#9c36b5' },
]

// NOTA ("None of the Above") — a valid vote option, counted and shown, but it is
// not a candidate, so it can never be the "leader" or part of the winning chance.
export const NOTA: Candidate = {
  id: 'nota',
  name: 'None of the Above (NOTA)',
  nameHi: 'इनमें से कोई नहीं (NOTA)',
  symbol: '🚫',
  accent: '#868e96',
}

export const CANDIDATE_IDS: string[] = CANDIDATES.map((c) => c.id)

// All selectable vote options (candidates + NOTA).
export const VOTE_OPTIONS: Candidate[] = [...CANDIDATES, NOTA]
export const VOTE_OPTION_IDS: string[] = VOTE_OPTIONS.map((o) => o.id)
