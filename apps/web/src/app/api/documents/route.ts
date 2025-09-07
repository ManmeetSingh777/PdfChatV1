import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

interface Document {
  id: string
  title: string
  s3_key: string
  status: 'processing' | 'ready' | 'failed'
  page_count: number
  created_at: string
  updated_at: string
}

export async function getDocuments(): Promise<Document[]> {
  try {
    // For now, get all documents (later we'll filter by user_id)
    const result = await query(`
      SELECT id, title, s3_key, status, page_count, created_at, updated_at 
      FROM documents 
      ORDER BY created_at DESC
    `)
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      s3Key: row.s3_key, // Convert snake_case to camelCase for API
      status: row.status,
      pageCount: row.page_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  } catch (error) {
    console.error('Failed to get documents from database:', error)
    return []
  }
}

export async function updateDocument(id: string, updates: { status?: string, page_count?: number }) {
  try {
    const setClause = []
    const values = []
    let paramIndex = 1

    if (updates.status) {
      setClause.push(`status = $${paramIndex++}`)
      values.push(updates.status)
    }
    
    if (updates.page_count !== undefined) {
      setClause.push(`page_count = $${paramIndex++}`)
      values.push(updates.page_count)
    }
    
    if (setClause.length === 0) return null
    
    setClause.push(`updated_at = NOW()`)
    values.push(id) // Document ID for WHERE clause
    
    const result = await query(`
      UPDATE documents 
      SET ${setClause.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING id, title, s3_key, status, page_count, created_at, updated_at
    `, values)
    
    if (result.rows.length === 0) return null
    
    const row = result.rows[0]
    return {
      id: row.id,
      title: row.title,
      s3Key: row.s3_key,
      status: row.status,
      pageCount: row.page_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  } catch (error) {
    console.error('Failed to update document in database:', error)
    return null
  }
}

export async function GET() {
  try {
    const documents = await getDocuments()
    console.log(`📄 Retrieved ${documents.length} documents from database`)
    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Failed to get documents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, s3Key, fileId } = await request.json()
    
    if (!title || !s3Key || !fileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert document into database
    const result = await query(`
      INSERT INTO documents (id, title, s3_key, status, page_count, user_id)
      VALUES ($1, $2, $3, 'processing', 0, '00000000-0000-0000-0000-000000000000')
      RETURNING id, title, s3_key, status, page_count, created_at, updated_at
    `, [fileId, title, s3Key])

    const row = result.rows[0]
    const document = {
      id: row.id,
      title: row.title,
      s3Key: row.s3_key,
      status: row.status,
      pageCount: row.page_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }

    // Queue ingestion job with the worker
    try {
      const workerResponse = await fetch('http://localhost:3003/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Key,
          documentId: fileId
        })
      })

      if (!workerResponse.ok) {
        console.error('Failed to queue job with worker')
      } else {
        console.log(`✅ Queued processing job for: ${title}`)
      }
    } catch (error) {
      console.error('Failed to communicate with worker:', error)
    }

    console.log(`📄 Document created in database: ${title} (${fileId})`)

    return NextResponse.json({ 
      success: true,
      document
    })
  } catch (error) {
    console.error('Failed to create document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('id')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting document from database: ${documentId}`)

    // Delete document from database
    const result = await query(`
      DELETE FROM documents 
      WHERE id = $1 
      RETURNING id, title, s3_key, status, page_count, created_at, updated_at
    `, [documentId])
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    const deletedRow = result.rows[0]
    const deletedDocument = {
      id: deletedRow.id,
      title: deletedRow.title,
      s3Key: deletedRow.s3_key,
      status: deletedRow.status,
      pageCount: deletedRow.page_count,
      createdAt: deletedRow.created_at,
      updatedAt: deletedRow.updated_at
    }
    
    console.log(`✅ Document deleted from database: ${deletedDocument.title}`)

    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully',
      deletedDocument 
    })
  } catch (error) {
    console.error('Failed to delete document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}