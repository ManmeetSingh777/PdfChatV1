import { NextResponse } from 'next/server'
import { addCredits } from '../db-route'

export async function POST() {
  try {
    // Add 100 credits for testing
    const refillAmount = 100
    const result = await addCredits(refillAmount, 'Manual refill for testing')
    
    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to refill credits' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      balance: result.balance,
      refilled: refillAmount,
      message: `Added ${refillAmount} credits! New balance: ${result.balance}`
    })

  } catch (error) {
    console.error('Failed to refill credits:', error)
    return NextResponse.json({ error: 'Failed to refill credits' }, { status: 500 })
  }
}

