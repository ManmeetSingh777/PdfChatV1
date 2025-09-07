import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Create connection
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/docchat'
const client = postgres(connectionString)
export const db = drizzle(client, { schema })

// Re-export schema
export * from './schema'
export * from './queries'