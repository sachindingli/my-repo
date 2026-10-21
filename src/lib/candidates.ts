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

export const CANDIDATE_IDS: string[] = CANDIDATES.map((c) => c.id)
