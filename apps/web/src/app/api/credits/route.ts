import { NextResponse } from 'next/server'
import { getCreditsBalance } from './db-route'

export async function GET() {
  try {
    const balance = await getCreditsBalance()
    return NextResponse.json({ 
      credits: balance
    })
  } catch (error) {
    console.error('Failed to load credits:', error)
    return NextResponse.json({ error: 'Failed to load credits' }, { status: 500 })
  }
}