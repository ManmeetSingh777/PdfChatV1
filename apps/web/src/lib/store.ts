import { Document, Settings } from './types'

const STORAGE_KEYS = {
  docs: 'pdfchat_docs',
  credits: 'pdfchat_credits',
  settings: 'pdfchat_settings'
}

// Documents
export function getDocs(): Document[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEYS.docs)
  return stored ? JSON.parse(stored) : []
}

export function setDocs(docs: Document[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.docs, JSON.stringify(docs))
}

export function addDoc(doc: Document): void {
  const docs = getDocs()
  docs.push(doc)
  setDocs(docs)
}

export function updateDoc(id: string, updates: Partial<Document>): void {
  const docs = getDocs()
  const index = docs.findIndex(d => d.id === id)
  if (index >= 0) {
    docs[index] = { ...docs[index], ...updates, updatedAt: Date.now() }
    setDocs(docs)
  }
}

export function deleteDoc(id: string): void {
  const docs = getDocs()
  const filtered = docs.filter(d => d.id !== id)
  setDocs(filtered)
}

// Credits
export function getCredits(): number {
  if (typeof window === 'undefined') return 25
  const stored = localStorage.getItem(STORAGE_KEYS.credits)
  return stored ? parseInt(stored, 10) : 25
}

export function setCredits(credits: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.credits, credits.toString())
}

// Settings
export function getSettings(): Settings {
  if (typeof window === 'undefined') return { failNextUpload: false, slowChat: false }
  const stored = localStorage.getItem(STORAGE_KEYS.settings)
  return stored ? JSON.parse(stored) : { failNextUpload: false, slowChat: false }
}

export function setSettings(settings: Settings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
}
