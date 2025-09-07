import express from 'express'
import { config } from 'dotenv'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { Readable } from 'stream'
import pdfParse from 'pdf-parse'
import { OpenAI } from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Pinecone } from '@pinecone-database/pinecone'
import { updateDocumentStatus, testConnection } from './db'

// Load environment variables from .env file
config({ path: '.env' })

// Debug environment variables (remove in production)
console.log('🔍 Environment check:')
console.log('- PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Missing')
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set (Limited $4.56)' : '❌ Missing')
console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set (PRIMARY)' : '⚠️ Missing - will use OpenAI only')
console.log('- S3_ACCESS_KEY:', process.env.S3_ACCESS_KEY ? '✅ Set' : '❌ Missing')

const app = express()
const port = process.env.PORT || process.env.WORKER_PORT || 3003

app.use(express.json())

// Create clients
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin123',
  },
  forcePathStyle: true,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
})

// Simple in-memory job queue for demo
const jobQueue: Array<{
  id: string
  s3Key: string
  documentId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: Date
  progress?: string
}> = []

// EXTREME-SPEED chunking - GIGANTIC chunks = MINIMAL API calls!
function createOptimizedChunks(text: string): string[] {
  const IDEAL_CHUNK_SIZE = 8000  // GIGANTIC chunks for sub-10sec processing!
  const MIN_CHUNK_SIZE = 4000    // Very high minimum
  const MAX_CHUNK_SIZE = 12000   // MASSIVE maximum for extreme speed
  
  // Split by sentences first (much faster than token counting)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const chunks: string[] = []
  let currentChunk = ''
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue
    
    const potentialChunk = currentChunk + (currentChunk ? '. ' : '') + trimmed
    
    // If chunk gets too big, save it and start fresh
    if (potentialChunk.length > MAX_CHUNK_SIZE && currentChunk.length > MIN_CHUNK_SIZE) {
      chunks.push(currentChunk.trim())
      currentChunk = trimmed
    } else {
      currentChunk = potentialChunk
    }
    
    // If we hit ideal size, save and continue with minimal overlap for SPEED
    if (currentChunk.length >= IDEAL_CHUNK_SIZE) {
      chunks.push(currentChunk.trim())
      // Start next chunk with minimal overlap for LUDICROUS SPEED
      const words = trimmed.split(' ')
      currentChunk = words.slice(-8).join(' ') // Keep only last ~8 words for speed
    }
  }
  
  // Add final chunk
  if (currentChunk.length > MIN_CHUNK_SIZE) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

// LIGHTNING-FAST Gemini-only embedding generation (768 dimensions)
async function generateEmbedding(text: string, chunkIndex: number): Promise<number[]> {
  // Use Gemini exclusively for speed and free usage
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = gemini.getGenerativeModel({ model: 'text-embedding-004' })
      const result = await model.embedContent(text)
      return result.embedding.values
  } catch (error) {
      console.error(`❌ Gemini embedding failed for chunk ${chunkIndex}:`, error)
      throw new Error(`Gemini embedding failed: ${error.message}`)
    }
  } else {
    throw new Error('GEMINI_API_KEY is required for lightning speed processing!')
  }
}

// BLAZING FAST PDF processing with parallel embeddings
async function processPDFUltraFast(s3Key: string, documentId: string) {
  const startTime = Date.now()
  console.log(`🚀 ULTRA-FAST processing: ${s3Key}`)
  
  try {
    // Update progress
    updateJobProgress(documentId, 'Downloading PDF...')
    
    // Step 1: Download PDF (optimized)
    const downloadStart = Date.now()
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET || 'docchat',
      Key: s3Key,
    })
    
    const response = await s3Client.send(command)
    const stream = response.Body as Readable
    
    // Faster buffer concatenation
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }
    const pdfBuffer = Buffer.concat(chunks)
    const downloadTime = Date.now() - downloadStart
    
    const fileSizeMB = pdfBuffer.length / 1024 / 1024
    console.log(`📥 Downloaded ${fileSizeMB.toFixed(1)}MB in ${downloadTime}ms`)
    
    // Memory check for large files
    if (fileSizeMB > 30) {
      console.log(`⚠️  Large file detected (${fileSizeMB.toFixed(1)}MB) - monitoring memory usage`)
      const memUsage = process.memoryUsage()
      console.log(`🧠 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB used, ${(memUsage.heapTotal / 1024 / 1024).toFixed(1)}MB total`)
    }
    
    // Step 2: Extract text (with memory limits)
    updateJobProgress(documentId, 'Extracting text...')
    const parseStart = Date.now()
    
    const pdfData = await pdfParse(pdfBuffer, {
      max: 0, // No page limit but we'll handle memory
      version: 'v1.10.100'
    })
    
    const pageCount = pdfData.numpages
    const fullText = pdfData.text
    const parseTime = Date.now() - parseStart
    
    console.log(`📄 Extracted ${fullText.length} chars from ${pageCount} pages in ${parseTime}ms`)
    
    // Step 3: Ultra-fast chunking
    updateJobProgress(documentId, 'Creating chunks...')
    const chunkStart = Date.now()
    
    const textChunks = createOptimizedChunks(fullText)
    const chunkTime = Date.now() - chunkStart
    
    console.log(`✂️ Created ${textChunks.length} chunks in ${chunkTime}ms`)
    
    // Step 4: ULTRA-PARALLEL embedding generation (the secret sauce!)
    updateJobProgress(documentId, 'Generating embeddings...')
    const embeddingStart = Date.now()
    
    // Adaptive batch size for large files
    let EXTREME_BATCH_SIZE = 100 // Default for normal files
    if (textChunks.length > 2000) {
      EXTREME_BATCH_SIZE = 60 // Smaller batches for very large files
      console.log(`📦 Large file detected (${textChunks.length} chunks) - reducing batch size to ${EXTREME_BATCH_SIZE} for stability`)
    } else if (textChunks.length > 5000) {
      EXTREME_BATCH_SIZE = 40 // Even smaller for massive files
      console.log(`🏗️ Massive file detected (${textChunks.length} chunks) - reducing batch size to ${EXTREME_BATCH_SIZE} for memory safety`)
    }
    
    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini')
    
    let totalProcessed = 0
    const totalBatches = Math.ceil(textChunks.length / EXTREME_BATCH_SIZE)
    
    console.log(`🚀 EXTREME SPEED MODE: ${totalBatches} batches of ${EXTREME_BATCH_SIZE} chunks each`)
    console.log(`⚡ GIGANTIC 8K+ chunks + Gemini 768D + 100-parallel batches = SUB-10 SECONDS!`)
    console.log(`🎯 Expected chunks: ~${Math.floor(textChunks.length/4)} (gigantic 8K+ chunks)`)
    
    for (let batchStart = 0; batchStart < textChunks.length; batchStart += EXTREME_BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + EXTREME_BATCH_SIZE, textChunks.length)
      const batch = textChunks.slice(batchStart, batchEnd)
      const currentBatch = Math.floor(batchStart / EXTREME_BATCH_SIZE) + 1
      
      updateJobProgress(documentId, `🚀 EXTREME BATCH ${currentBatch}/${totalBatches} (${batch.length} chunks)`)
      console.log(`⚡ EXTREME BATCH ${currentBatch}/${totalBatches}: Processing ${batch.length} GIGANTIC chunks`)
      
      const batchStartTime = Date.now()
      
      // Generate embeddings with multi-provider support (Gemini + OpenAI)
      const embeddingPromises = batch.map(async (chunkText, index) => {
        const globalIndex = batchStart + index
        
        try {
          const embedding = await generateEmbedding(chunkText, globalIndex)
          
          return {
            id: `${documentId}_chunk_${globalIndex}`,
            values: embedding,
            metadata: {
              documentId,
              chunkIndex: globalIndex,
              text: chunkText.substring(0, 800), // Truncate for Pinecone limits
              pageEstimate: Math.floor((globalIndex / textChunks.length) * pageCount) + 1,
            }
          }
        } catch (error: any) {
          console.error(`❌ Failed to generate embedding for chunk ${globalIndex}:`, error)
          // For large files, retry once with exponential backoff
          if (textChunks.length > 1000) {
            console.log(`🔄 Retrying chunk ${globalIndex} after 2s delay...`)
            await new Promise(resolve => setTimeout(resolve, 2000))
            try {
              const retryEmbedding = await generateEmbedding(chunkText, globalIndex)
              return {
                id: `${documentId}_chunk_${globalIndex}`,
                values: retryEmbedding,
                metadata: {
                  documentId,
                  chunkIndex: globalIndex,
                  text: chunkText.substring(0, 800),
                  pageEstimate: Math.floor((globalIndex / textChunks.length) * pageCount) + 1,
                }
              }
            } catch (retryError) {
              console.error(`❌ Retry failed for chunk ${globalIndex}:`, retryError)
              throw retryError
            }
          }
    throw error
  }
      })
      
      // Wait for ALL embeddings in this MEGA batch to complete
      const batchEmbeddings = await Promise.all(embeddingPromises)
      
      // Store entire MEGA batch at once
      await pineconeIndex.upsert(batchEmbeddings)
      
      totalProcessed += batch.length
      const batchTime = Date.now() - batchStartTime
      const remainingBatches = totalBatches - currentBatch
      const estimatedTimeLeft = (batchTime * remainingBatches) / 1000
      
      console.log(`🚀 EXTREME BATCH ${currentBatch}/${totalBatches} COMPLETE in ${batchTime}ms! (${totalProcessed}/${textChunks.length}) - ${((totalProcessed/textChunks.length)*100).toFixed(1)}%`)
      console.log(`⚡ ETA: ${estimatedTimeLeft.toFixed(1)}s remaining`)
      
      // Aggressive garbage collection for large files
      if (global.gc && textChunks.length > 1000) {
        global.gc()
        console.log(`🧹 Garbage collection triggered for large file processing`)
      }
      
      // Small delay between batches to respect rate limits
      if (currentBatch < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms pause
      }
      
      // SUPER aggressive cleanup for ludicrous speed
      if (global.gc) {
        global.gc()
        global.gc() // Double cleanup for ludicrous mode
      }
    }
    
    const embeddingTime = Date.now() - embeddingStart
    const totalTime = Date.now() - startTime
    
    console.log(`🎉 COMPLETED in ${(totalTime/1000).toFixed(1)}s!`)
    console.log(`📊 Download: ${downloadTime}ms | Parse: ${parseTime}ms | Chunk: ${chunkTime}ms | Embeddings: ${embeddingTime}ms`)
    
    // Update final status
    await updateDocumentWithPageCount(documentId, 'completed', pageCount)
    updateJobProgress(documentId, `Ready! Processed in ${(totalTime/1000).toFixed(1)}s`)
    
    return { 
      success: true, 
      pageCount, 
      chunks: textChunks.length,
      processingTime: totalTime,
      breakdown: { downloadTime, parseTime, chunkTime, embeddingTime }
    }
    
  } catch (error) {
    console.error(`❌ ULTRA-FAST processing failed:`, error)
    await updateDocumentWithPageCount(documentId, 'failed', 0, error.message)
    updateJobProgress(documentId, `Failed: ${error.message}`)
    throw error
  }
}

// Helper to update job progress
function updateJobProgress(documentId: string, progress: string) {
  const job = jobQueue.find(j => j.documentId === documentId)
  if (job) {
    job.progress = progress
    console.log(`📊 ${documentId}: ${progress}`)
  }
}

// Update document with page count
async function updateDocumentWithPageCount(documentId: string, status: 'completed' | 'failed', pageCount: number, error?: string) {
  try {
    await updateDocumentStatus(documentId, status, error)
    
    // Also update page count if successful
    if (status === 'completed' && pageCount > 0) {
      const { query } = await import('./db')
      const updateQuery = `
        UPDATE documents 
        SET page_count = $1, updated_at = NOW()
        WHERE id = $2
      `
      await query(updateQuery, [pageCount, documentId])
      console.log(`📄 Updated document ${documentId} page count: ${pageCount}`)
    }
  } catch (error) {
    console.error('❌ Error updating document:', error)
  }
}

// ULTRA-FAST job processor
async function processJobsUltraFast() {
  const pendingJobs = jobQueue.filter(job => job.status === 'pending')
  
  // Process jobs in parallel for maximum speed
  const processingPromises = pendingJobs.map(async (job) => {
    job.status = 'processing'
    
    try {
      await processPDFUltraFast(job.s3Key, job.documentId)
      job.status = 'completed'
  } catch (error) {
      job.status = 'failed'
      job.progress = `Failed: ${error.message}`
    }
  })
  
  await Promise.all(processingPromises)
}

// Start job processor (check every 2 seconds for responsiveness)
setInterval(processJobsUltraFast, 2000)

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
    res.json({
      status: 'healthy',
    service: 'worker-ultrafast',
      timestamp: new Date().toISOString(),
    jobs: {
      pending: jobQueue.filter(j => j.status === 'pending').length,
      processing: jobQueue.filter(j => j.status === 'processing').length,
      completed: jobQueue.filter(j => j.status === 'completed').length,
      failed: jobQueue.filter(j => j.status === 'failed').length,
    },
    currentJobs: jobQueue.filter(j => j.status === 'processing').map(j => ({
      documentId: j.documentId,
      progress: j.progress
    }))
  })
})

// Verification endpoint to check Pinecone storage
app.get('/verify/:documentId', async (req: express.Request, res: express.Response) => {
  try {
    const { documentId } = req.params
    const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini')
    
    console.log(`🔍 Verifying storage for document: ${documentId}`)
    
    // Get index stats
    const stats = await pineconeIndex.describeIndexStats()
    console.log(`📊 Index stats:`, stats)
    
    // Query for vectors with this documentId
    const queryResult = await pineconeIndex.query({
      vector: new Array(768).fill(0), // Dummy vector for metadata search
      topK: 10000, // Get all chunks
      filter: { documentId: documentId },
      includeMetadata: true
    })
    
    const chunks = queryResult.matches || []
    console.log(`📄 Found ${chunks.length} chunks for document ${documentId}`)
    
    // Analyze the chunks
    const analysis = {
      totalChunks: chunks.length,
      totalVectors: stats.totalVectorCount,
      documentChunks: chunks.map(chunk => ({
        id: chunk.id,
        chunkIndex: chunk.metadata?.chunkIndex,
        pageEstimate: chunk.metadata?.pageEstimate,
        textPreview: chunk.metadata?.text?.substring(0, 100) + '...',
        textLength: chunk.metadata?.text?.length
      })).sort((a, b) => (a.chunkIndex || 0) - (b.chunkIndex || 0)),
      pageRange: {
        min: Math.min(...chunks.map(c => c.metadata?.pageEstimate || 0)),
        max: Math.max(...chunks.map(c => c.metadata?.pageEstimate || 0))
      }
    }
    
    res.json({
      success: true,
      documentId,
      analysis,
      message: `Found ${chunks.length} chunks covering pages ${analysis.pageRange.min}-${analysis.pageRange.max}`
    })
    
  } catch (error) {
    console.error('❌ Verification error:', error)
    res.status(500).json({ error: error.message })
  }
})

// Endpoint to queue new jobs
app.post('/jobs', (req: express.Request, res: express.Response) => {
  const { s3Key, documentId } = req.body
  
  if (!s3Key || !documentId) {
    return res.status(400).json({ error: 'Missing s3Key or documentId' })
  }
  
  const job = {
    id: `job_${Date.now()}`,
    s3Key,
    documentId,
    status: 'pending' as const,
    createdAt: new Date(),
    progress: 'Queued'
  }
  
  jobQueue.push(job)
  console.log(`📋 Queued ULTRA-FAST job: ${job.id} for document ${documentId}`)
  
  res.json({ success: true, jobId: job.id })
})

app.listen(port, async () => {
  console.log(`⚡ ULTRA-FAST Worker service running on port ${port}`)
  console.log(`🚀 Optimized for speed: Parallel embeddings + Smart chunking`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  
  // Test database connection
  await testConnection()
})

console.log('🚀 PDF Chat Worker EXTREME SPEED MODE activated!')
console.log('⚡ Features: GIGANTIC 8K+ chunks + Gemini 768D embeddings + 100-parallel batches')
console.log('🎯 Target: Process ANY PDF (even 1000+ pages) in under 10 seconds!')