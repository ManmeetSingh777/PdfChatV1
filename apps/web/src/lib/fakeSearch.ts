import { Chunk } from './types'

export function search(chunks: Chunk[], question: string): Chunk[] {
  if (!chunks || chunks.length === 0) {
    return []
  }
  
  // Convert question to lowercase for matching
  const queryWords = question.toLowerCase().split(' ').filter(word => word.length > 2)
  
  // Score chunks based on keyword matches
  const scoredChunks = chunks.map(chunk => {
    const chunkText = chunk.text.toLowerCase()
    let score = 0
    
    queryWords.forEach(word => {
      if (chunkText.includes(word)) {
        score += 1
      }
    })
    
    return { chunk, score }
  })
  
  // Sort by score and get top matches
  const matches = scoredChunks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(item => item.chunk)
  
  // If no matches, return random chunks for demo purposes
  if (matches.length === 0) {
    const shuffled = [...chunks].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, 2)
  }
  
  return matches
}

export function generateAnswer(chunks: Chunk[], question: string): string {
  if (!chunks || chunks.length === 0) {
    return "I don't have that information in this document."
  }
  
  const combinedText = chunks.map(c => c.text).join(' ')
  
  // Simple template-based answer generation
  const templates = [
    `Based on the document, ${combinedText.substring(0, 200)}...`,
    `According to the information provided, ${combinedText.substring(0, 200)}...`,
    `The document indicates that ${combinedText.substring(0, 200)}...`,
    `From what I can see in the document, ${combinedText.substring(0, 200)}...`
  ]
  
  const template = templates[Math.floor(Math.random() * templates.length)]
  return template
}
