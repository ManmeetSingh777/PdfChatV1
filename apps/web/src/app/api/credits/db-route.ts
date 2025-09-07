import { NextRequest, NextResponse } from 'next/server'
import { query, transaction } from '@/lib/db'

// Demo user ID for now (later we'll use actual auth)
const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'

// Ensure demo user exists in database
async function ensureDemoUser() {
  try {
    // Check if user exists
    const userResult = await query('SELECT id FROM users WHERE id = $1', [DEMO_USER_ID])
    
    if (userResult.rows.length === 0) {
      // Create demo user
      await query(`
        INSERT INTO users (id, email, name) 
        VALUES ($1, 'demo@example.com', 'Demo User')
        ON CONFLICT (id) DO NOTHING
      `, [DEMO_USER_ID])
      
      // Create credits record with 25 starting credits
      await query(`
        INSERT INTO credits (user_id, balance) 
        VALUES ($1, 25)
        ON CONFLICT (user_id) DO NOTHING
      `, [DEMO_USER_ID])
      
      console.log('📊 Created demo user with 25 credits')
    }
  } catch (error) {
    console.error('Failed to ensure demo user:', error)
  }
}

// Get credits balance
export async function getCreditsBalance(): Promise<number> {
  try {
    await ensureDemoUser()
    
    const result = await query(`
      SELECT balance FROM credits WHERE user_id = $1
    `, [DEMO_USER_ID])
    
    return result.rows[0]?.balance || 0
  } catch (error) {
    console.error('Failed to get credits balance:', error)
    return 0
  }
}

// Spend credits (with transaction safety)
export async function spendCredits(amount: number, reason: string): Promise<{ success: boolean, balance?: number, error?: string }> {
  try {
    return await transaction(async (client) => {
      // Get current balance with row lock
      const balanceResult = await client.query(`
        SELECT balance FROM credits WHERE user_id = $1 FOR UPDATE
      `, [DEMO_USER_ID])
      
      const currentBalance = balanceResult.rows[0]?.balance || 0
      
      if (currentBalance < amount) {
        return { success: false, error: 'Insufficient credits' }
      }
      
      // Deduct credits
      const newBalance = currentBalance - amount
      await client.query(`
        UPDATE credits SET balance = $1, updated_at = NOW() WHERE user_id = $2
      `, [newBalance, DEMO_USER_ID])
      
      // Record transaction
      await client.query(`
        INSERT INTO transactions (user_id, delta, reason)
        VALUES ($1, $2, $3)
      `, [DEMO_USER_ID, -amount, reason])
      
      console.log(`💰 Spent ${amount} credits: ${reason} (Balance: ${newBalance})`)
      
      return { success: true, balance: newBalance }
    })
  } catch (error) {
    console.error('Failed to spend credits:', error)
    return { success: false, error: 'Database error' }
  }
}

// Add credits
export async function addCredits(amount: number, reason: string): Promise<{ success: boolean, balance?: number, error?: string }> {
  try {
    return await transaction(async (client) => {
      // Get current balance with row lock
      const balanceResult = await client.query(`
        SELECT balance FROM credits WHERE user_id = $1 FOR UPDATE
      `, [DEMO_USER_ID])
      
      const currentBalance = balanceResult.rows[0]?.balance || 0
      const newBalance = currentBalance + amount
      
      // Add credits
      await client.query(`
        UPDATE credits SET balance = $1, updated_at = NOW() WHERE user_id = $2
      `, [newBalance, DEMO_USER_ID])
      
      // Record transaction
      await client.query(`
        INSERT INTO transactions (user_id, delta, reason)
        VALUES ($1, $2, $3)
      `, [DEMO_USER_ID, amount, reason])
      
      console.log(`💰 Added ${amount} credits: ${reason} (Balance: ${newBalance})`)
      
      return { success: true, balance: newBalance }
    })
  } catch (error) {
    console.error('Failed to add credits:', error)
    return { success: false, error: 'Database error' }
  }
}
