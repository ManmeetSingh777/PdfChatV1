import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Pinecone } from '@pinecone-database/pinecone'

// Initialize clients
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })

export async function POST(request: NextRequest) {
  try {
    const { documentId, type, chatContext, userPrompt } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    if (!['summary', 'letter', 'report'].includes(type)) {
      return NextResponse.json({ error: 'Type must be summary, letter, or report' }, { status: 400 })
    }

    console.log(`🚀 Generating ${type} for document: ${documentId}`)

    // Get all chunks for this document from Pinecone
    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini')
    
    // Query all chunks for this document (using a broad search)
    const queryResponse = await index.query({
      vector: new Array(768).fill(0), // Dummy vector
      topK: 100, // Get up to 100 chunks
      filter: { documentId: documentId },
      includeMetadata: true
    })

    console.log(`📚 Found ${queryResponse.matches.length} chunks for ${type} generation`)

    if (queryResponse.matches.length === 0) {
      return NextResponse.json({ error: 'No content found for this document' }, { status: 404 })
    }

    // Extract and combine text from all chunks
    const allText = queryResponse.matches
      .map(match => match.metadata?.text || '')
      .filter(text => text.length > 0)
      .join('\n\n')

    if (allText.length === 0) {
      return NextResponse.json({ error: 'No text content found in document' }, { status: 404 })
    }

    console.log(`📝 Total text length: ${allText.length} characters`)

    // Build chat context if provided
    let chatContextText = ''
    if (chatContext && chatContext.length > 0) {
      chatContextText = '\n\nCHAT CONVERSATION HISTORY:\n' + 
        chatContext.map((msg: any) => `${msg.type.toUpperCase()}: ${msg.content}`).join('\n')
      console.log(`💬 Including full chat context: ${chatContext.length} messages`)
    }

    // Add specific user prompt if provided (from chat tools) - this is the PRIMARY instruction
    let primaryPromptText = ''
    if (userPrompt) {
      primaryPromptText = `\n\nPRIMARY INSTRUCTION (Focus on this): ${userPrompt}`
      console.log(`🎯 Primary instruction: ${userPrompt}`)
    }

    // Generate different prompts based on type
    const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    let prompt = ''
    
    if (type === 'summary') {
      prompt = `You are PChan - a brilliant AI analyst who creates insightful summaries with personality and depth.

🎯 USER'S PRIMARY REQUEST:
${primaryPromptText}

🧠 PCHAN'S MISSION: Create a summary that goes beyond basic bullet points. Think critically, identify patterns, and provide insights that demonstrate real understanding.

📚 DOCUMENT CONTENT:
${allText.substring(0, 40000)}${chatContextText}

🎨 PCHAN'S SUMMARY STYLE:
1. **Opening Insight** - Start with your most compelling analysis of their request
2. **Core Findings** - 5-8 substantial bullet points using "•" 
3. **Smart Connections** - Link concepts in ways that show deep understanding
4. **Page Citations** - Reference (Page X) when relevant
5. **Bold Key Terms** - Use **bold** for crucial concepts
6. **Actionable Value** - Every point should be useful, not just informative
7. **PChan's Voice** - Confident, insightful, engaging (but professional)

APPROACH: Don't just extract facts - ANALYZE them. Show patterns, implications, and connections. Make the user think "wow, I never noticed that connection before." Be the AI that truly understands, not just retrieves.

Create a summary that demonstrates PChan's signature analytical depth and engaging personality.`
    
    } else if (type === 'letter') {
      prompt = `You are PChan - crafting a persuasive, professional letter with analytical depth and strategic thinking.

🎯 USER'S PRIMARY REQUEST:
${primaryPromptText}

🧠 PCHAN'S LETTER APPROACH: This isn't just a template letter - it's a strategic communication that demonstrates deep understanding and makes a compelling case.

📚 DOCUMENT CONTENT:
${allText.substring(0, 40000)}${chatContextText}

✍️ PCHAN'S LETTER STYLE:
1. **Strategic Opening** - "Dear [Recipient]," with immediate impact
2. **Compelling Introduction** - Hook them with your key insight
3. **Evidence-Based Body** - Support arguments with document citations (Page X)
4. **Bold Key Points** - Use **bold** for critical concepts
5. **Analytical Depth** - Show connections and implications, not just facts
6. **Confident Tone** - Professional but with PChan's intelligent personality
7. **Action-Oriented Close** - "Sincerely," with clear next steps

PCHAN'S EDGE: Make this letter memorable by showing real understanding of the subject matter. Connect dots that others might miss. Be persuasive through intelligence, not just politeness.

Write a letter that demonstrates PChan's analytical brilliance while maintaining professional decorum.`
    
    } else if (type === 'report') {
      prompt = `You are PChan - creating a strategic business report that showcases analytical brilliance and actionable insights.

🎯 USER'S PRIMARY REQUEST:
${primaryPromptText}

🧠 PCHAN'S REPORT PHILOSOPHY: This isn't just organized information - it's strategic intelligence that reveals patterns, predicts implications, and provides competitive advantage.

📚 DOCUMENT CONTENT:
${allText.substring(0, 40000)}${chatContextText}

📊 PCHAN'S REPORT STRUCTURE:
1. **Executive Summary** - Your most compelling insights about their request (2-3 paragraphs)
2. **Key Findings** - 4-6 strategic discoveries with **bold** key terms
3. **Pattern Analysis** - Connections and implications others might miss
4. **Risk Assessment** - Intelligent anticipation of challenges
5. **Strategic Recommendations** - Actionable next steps with reasoning
6. **Conclusion** - Forward-looking summary with PChan's perspective
7. **Page Citations** - Reference (Page X) for credibility

PCHAN'S ADVANTAGE: Don't just report what's in the document - interpret it. Show cause-and-effect relationships. Anticipate questions. Provide the "so what?" that transforms data into strategy.

Create a report that makes the reader think "this AI really gets it" - demonstrating PChan's signature analytical depth and strategic thinking.`
    }

    const result = await model.generateContent(prompt)
    const content = result.response.text()

    console.log(`✅ Generated ${type} (${content.length} characters)`)

    // Deduct 5 credits
    try {
      const creditsResponse = await fetch(`${request.nextUrl.origin}/api/credits/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: 5, 
          reason: `Generate document ${type}` 
        })
      })

      if (creditsResponse.ok) {
        console.log(`💰 Deducted 5 credits for ${type} generation`)
      } else {
        console.warn('⚠️ Failed to deduct credits, but continuing...')
      }
    } catch (error) {
      console.warn('⚠️ Credits deduction failed:', error)
    }

    // Extract sources from the chunks for citation
    const sources = queryResponse.matches.map(match => ({
      page: match.metadata?.pageEstimate || 1,
      text: match.metadata?.text?.substring(0, 200) + '...' || 'No text available'
    })).slice(0, 5) // Top 5 sources

    return NextResponse.json({
      content,
      type,
      charged: true,
      cost: 5,
      source: chatContext ? 'document+chat' : 'document',
      sources
    })

  } catch (error) {
    console.error('❌ Generate content error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}
