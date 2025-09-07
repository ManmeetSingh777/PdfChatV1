import { NextRequest, NextResponse } from 'next/server'
import { Pinecone } from '@pinecone-database/pinecone'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize clients
console.log('🔧 Initializing chat API with keys:', {
  pinecone: process.env.PINECONE_API_KEY ? 'SET' : 'MISSING',
  gemini: process.env.GEMINI_API_KEY ? 'SET' : 'MISSING',
  indexName: process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini'
})

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
})

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { documentId, question } = await request.json()

    if (!documentId || !question) {
      return NextResponse.json(
        { error: 'Missing documentId or question' },
        { status: 400 }
      )
    }

    console.log(`💬 Chat request: "${question}" for document ${documentId}`)

    // Step 1: Generate embedding for the question using Gemini
    const questionEmbedding = await generateQuestionEmbedding(question)

    // Step 2: Search Pinecone for relevant chunks
    const relevantChunks = await searchRelevantChunks(documentId, questionEmbedding)

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer: "I don't have information to answer that question based on this document.",
        sources: [],
        charged: false
      })
    }

    // Step 3: Generate answer using Gemini with context
    const answer = await generateAnswer(question, relevantChunks)

    // Step 4: Determine if we should charge (only for good answers)
    const isGoodAnswer = !answer.toLowerCase().includes("i don't have") && 
                        !answer.toLowerCase().includes("i don't know") &&
                        !answer.toLowerCase().includes("not enough information") &&
                        relevantChunks.length > 0

    // Step 5: Extract sources with page numbers
    const sources = relevantChunks.map(chunk => ({
      page: chunk.metadata?.pageEstimate || 1,
      text: chunk.metadata?.text || ''
    }))

    // Step 6: Handle credits (charge for good answers, don't charge for poor ones)
    if (isGoodAnswer) {
      // Charge 1 credit for a good answer
      try {
        const creditResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/credits/spend`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 1,
            reason: `Chat question: "${question.slice(0, 50)}..."`
          })
        })

        if (!creditResponse.ok) {
          const creditError = await creditResponse.json()
          console.log(`💰 Credit charge failed: ${creditError.error}`)
        } else {
          const creditResult = await creditResponse.json()
          console.log(`💰 Charged 1 credit - Balance: ${creditResult.balance}`)
        }
      } catch (creditError) {
        console.error('Failed to charge credits:', creditError)
      }
    } else {
      console.log(`💰 No charge - poor/no answer for: "${question}"`)
    }

    console.log(`✅ Generated answer with ${sources.length} sources - Charged: ${isGoodAnswer}`)

    return NextResponse.json({
      answer,
      sources: sources.slice(0, 3), // Limit to top 3 sources
      charged: isGoodAnswer
    })

  } catch (error) {
    console.error('❌ Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}

// Generate embedding for user question
async function generateQuestionEmbedding(question: string): Promise<number[]> {
  try {
    const model = gemini.getGenerativeModel({ model: 'text-embedding-004' })
    const result = await model.embedContent(question)
    return result.embedding.values
  } catch (error) {
    console.error('Failed to generate question embedding:', error)
    throw error
  }
}

// Search Pinecone for relevant chunks
async function searchRelevantChunks(documentId: string, questionEmbedding: number[]) {
  try {
    const indexName = process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini'
    console.log(`🔍 Using Pinecone index: ${indexName}`)
    console.log(`🔍 Searching for document: ${documentId}`)
    
    const index = pinecone.index(indexName)
    
    const searchResult = await index.query({
      vector: questionEmbedding,
      topK: 5, // Get top 5 most relevant chunks
      filter: { documentId: documentId },
      includeMetadata: true
    })

    console.log(`🔍 Found ${searchResult.matches?.length || 0} relevant chunks`)
    return searchResult.matches || []
  } catch (error) {
    console.error('Failed to search Pinecone:', error)
    throw error
  }
}

// Generate answer using Gemini with context
async function generateAnswer(question: string, chunks: any[]): Promise<string> {
  try {
    const context = chunks
      .map((chunk, index) => `[Source ${index + 1}, Page ${chunk.metadata?.pageEstimate}]: ${chunk.metadata?.text}`)
      .join('\n\n')

    const prompt = `You are PChan - a brilliant, charismatic AI with deep analytical abilities. You don't just retrieve information; you THINK, analyze, and provide insights with personality and flair.

🧠 PCHAN'S PERSONALITY:
- Confident and intelligent, never arrogant
- Uses creative analogies and examples  
- Thinks critically, connects concepts
- Occasionally witty or subtly humorous
- Direct and cuts through noise
- Forms strong evidence-based opinions
- Remembers you're discussing a DOCUMENT, not having a casual chat

📚 DOCUMENT CONTEXT:
${context}

❓ USER'S QUESTION: "${question}"

🎯 PCHAN'S APPROACH:
1. ANALYZE the question deeply using the document's knowledge
2. THINK about patterns, implications, and connections
3. PROVIDE insights that go beyond simple retrieval
4. Be engaging and memorable while staying accurate
5. If you need to infer or speculate, do so confidently but mention it
6. If the document lacks info, use reasoning to still be helpful
7. Reference specific pages when relevant

Answer as PChan would - smart, insightful, and with character:`

    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const result = await model.generateContent(prompt)
    
    return result.response.text()
  } catch (error) {
    console.error('Failed to generate answer:', error)
    throw error
  }
}
