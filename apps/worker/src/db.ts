import { Pool } from 'pg'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Helper function to execute queries
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

// Helper function for transactions
export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Update document status
export async function updateDocumentStatus(documentId: string, status: 'processing' | 'completed' | 'failed', error?: string) {
  const updateQuery = `
    UPDATE documents 
    SET status = $1, error_message = $2, updated_at = NOW()
    WHERE id = $3
  `
  
  try {
    await query(updateQuery, [status, error || null, documentId])
    console.log(`📝 Updated document ${documentId} status to: ${status}`)
  } catch (err) {
    console.error(`❌ Failed to update document status:`, err)
    throw err
  }
}

// Test database connection
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()')
    console.log('✅ Database connected:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}
