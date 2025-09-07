import { eq } from 'drizzle-orm'
import { db } from './index'
import { users, credits, transactions } from './schema'

// User queries
export const getUserById = async (id: string) => {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] || null
}

export const getUserByEmail = async (email: string) => {
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
  return result[0] || null
}

export const createUser = async (userData: {
  email: string
  name?: string
  emailVerified?: Date
  image?: string
}) => {
  const result = await db.insert(users).values(userData).returning()
  return result[0]
}

// Credits queries
export const getUserCredits = async (userId: string) => {
  const result = await db.select().from(credits).where(eq(credits.userId, userId)).limit(1)
  return result[0]?.balance || 0
}

export const createUserCredits = async (userId: string, initialBalance: number = 25) => {
  const result = await db.insert(credits).values({
    userId,
    balance: initialBalance,
  }).returning()
  
  // Also create a transaction record for the signup bonus
  await db.insert(transactions).values({
    userId,
    delta: initialBalance,
    reason: 'signup_bonus',
    idempotencyKey: `signup_${userId}`,
  })
  
  return result[0]
}

export const updateUserCredits = async (userId: string, delta: number, reason: string, idempotencyKey?: string) => {
  // Start transaction
  return await db.transaction(async (tx) => {
    // Check if idempotency key already exists
    if (idempotencyKey) {
      const existing = await tx.select().from(transactions).where(eq(transactions.idempotencyKey, idempotencyKey)).limit(1)
      if (existing.length > 0) {
        // Already processed, return current balance
        const currentCredits = await tx.select().from(credits).where(eq(credits.userId, userId)).limit(1)
        return currentCredits[0]?.balance || 0
      }
    }
    
    // Get current balance
    const currentCredits = await tx.select().from(credits).where(eq(credits.userId, userId)).limit(1)
    const currentBalance = currentCredits[0]?.balance || 0
    
    // Check if user has enough credits for negative deltas
    if (delta < 0 && currentBalance + delta < 0) {
      throw new Error('Insufficient credits')
    }
    
    // Update credits
    const newBalance = currentBalance + delta
    await tx.update(credits)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(credits.userId, userId))
    
    // Create transaction record
    await tx.insert(transactions).values({
      userId,
      delta,
      reason,
      idempotencyKey,
    })
    
    return newBalance
  })
}