import { Document, Chunk } from './types'
import { updateDoc, getSettings, setSettings } from './store'

// Sample chunks for fake documents
const SAMPLE_CHUNKS: Chunk[] = [
  { page: 1, text: "This document outlines the key terms and conditions of the agreement between the parties." },
  { page: 1, text: "The effective date of this contract shall be January 1, 2024, and will remain in effect for one year." },
  { page: 2, text: "Payment terms require all invoices to be settled within 30 days of receipt." },
  { page: 2, text: "Late payments will incur a 1.5% monthly interest charge on the outstanding balance." },
  { page: 3, text: "Either party may terminate this agreement with 60 days written notice." },
  { page: 3, text: "Upon termination, all outstanding obligations must be fulfilled within 30 days." },
  { page: 4, text: "Confidential information shared between parties must be protected for 5 years." },
  { page: 4, text: "This includes trade secrets, customer lists, and proprietary business methods." },
  { page: 5, text: "Any disputes will be resolved through binding arbitration in accordance with state law." },
  { page: 5, text: "The prevailing party in any dispute shall be entitled to reasonable attorney fees." },
]

function generateFakeChunks(title: string): Chunk[] {
  // For sample documents, return predefined chunks
  if (title.toLowerCase().includes('sample') || title.toLowerCase().includes('contract')) {
    return SAMPLE_CHUNKS
  }
  
  // For uploaded documents, generate random chunks
  const numChunks = Math.floor(Math.random() * 7) + 6 // 6-12 chunks
  const chunks: Chunk[] = []
  
  for (let i = 0; i < numChunks; i++) {
    const page = Math.floor(Math.random() * 8) + 1 // Pages 1-8
    chunks.push({
      page,
      text: `Content from ${title} on page ${page}. This is simulated document content for demonstration purposes.`
    })
  }
  
  return chunks
}

export function startIngest(doc: Document): void {
  const settings = getSettings()
  const shouldFail = settings.failNextUpload
  
  // Reset the failure setting after use
  if (shouldFail) {
    setSettings({ ...settings, failNextUpload: false })
  }
  
  // Simulate processing time
  setTimeout(() => {
    if (shouldFail) {
      updateDoc(doc.id, { status: 'failed' })
    } else {
      const chunks = generateFakeChunks(doc.title)
      updateDoc(doc.id, { 
        status: 'ready', 
        chunks,
        pages: Math.max(...chunks.map(c => c.page))
      })
    }
  }, 7000) // 7 second processing time
}
