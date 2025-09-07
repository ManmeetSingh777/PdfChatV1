import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { s3Key, documentId } = body

    if (!s3Key || !documentId) {
      return NextResponse.json(
        { error: 'Missing s3Key or documentId' },
        { status: 400 }
      )
    }

    // Get worker URL from environment
    const workerUrl = process.env.WORKER_URL || 'http://localhost:3003'
    
    console.log(`📤 Forwarding processing request to worker: ${workerUrl}`)
    
    // Forward request to Railway worker
    const response = await fetch(`${workerUrl}/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3Key, documentId }),
    })

    if (!response.ok) {
      throw new Error(`Worker responded with status: ${response.status}`)
    }

    const result = await response.json()
    
    console.log(`✅ Worker processing initiated for document: ${documentId}`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Error forwarding to worker:', error)
    return NextResponse.json(
      { error: 'Failed to process document', details: error.message },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const workerUrl = process.env.WORKER_URL || 'http://localhost:3003'
    
    // Check if worker is healthy
    const response = await fetch(`${workerUrl}/health`, {
      method: 'GET',
    })
    
    if (!response.ok) {
      throw new Error(`Worker health check failed: ${response.status}`)
    }
    
    const workerHealth = await response.json()
    
    return NextResponse.json({
      status: 'healthy',
      worker: workerHealth,
      workerUrl,
    })
    
  } catch (error) {
    console.error('❌ Worker health check failed:', error)
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message,
        workerUrl: process.env.WORKER_URL || 'http://localhost:3003'
      },
      { status: 503 }
    )
  }
}
