import { NextRequest, NextResponse } from 'next/server'

// Import the helper functions from the documents route
import { updateDocument } from '../route'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { documentId, status, pageCount, message } = body

    if (!documentId || !status) {
      return NextResponse.json(
        { error: 'Missing documentId or status' },
        { status: 400 }
      )
    }

    // Update the document status in database
    const updated = await updateDocument(documentId, { 
      status, 
      page_count: pageCount || 0
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    console.log(`📝 Updated document ${documentId} to ${status}${pageCount ? ` (${pageCount} pages)` : ''} in database`)

    return NextResponse.json({ success: true, document: updated })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    )
  }
}