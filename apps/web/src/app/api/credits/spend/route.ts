import { NextRequest, NextResponse } from 'next/server'
import { spendCredits } from '../db-route'

export async function POST(request: NextRequest) {
  try {
    const { amount, reason } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const result = await spendCredits(amount, reason || 'Chat question')

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error || 'Failed to spend credits',
        balance: result.balance 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      balance: result.balance,
      spent: amount
    })

  } catch (error) {
    console.error('Failed to spend credits:', error)
    return NextResponse.json({ error: 'Failed to spend credits' }, { status: 500 })
  }
}

// Refund credits
export async function PUT(request: NextRequest) {
  try {
    const { amount, reason } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const credits = loadCredits()

    // Add credits back
    credits.balance += amount
    credits.transactions.push({
      id: `refund_${Date.now()}`,
      type: 'refund',
      amount: amount,
      reason: reason || 'Refund for poor answer',
      timestamp: new Date().toISOString()
    })

    saveCredits(credits)

    console.log(`💰 Refunded ${amount} credits: ${reason} (Balance: ${credits.balance})`)

    return NextResponse.json({ 
      success: true,
      balance: credits.balance,
      refunded: amount
    })

  } catch (error) {
    console.error('Failed to refund credits:', error)
    return NextResponse.json({ error: 'Failed to refund credits' }, { status: 500 })
  }
}