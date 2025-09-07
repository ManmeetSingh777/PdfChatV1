'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface CreditsContextType {
  credits: number
  loading: boolean
  refresh: () => Promise<void>
  spend: (amount: number) => Promise<boolean>
  add: (amount: number) => Promise<void>
  hasEnough: (amount: number) => boolean
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined)

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const { data: session, status } = useSession()

  const fetchCredits = async () => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/credits')
      if (response.ok) {
        const data = await response.json()
        setCredits(data.balance || 0)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchCredits()
    } else if (status === 'unauthenticated') {
      setCredits(0)
      setLoading(false)
    }
  }, [session, status])

  const refresh = async () => {
    setLoading(true)
    await fetchCredits()
  }

  const spend = async (amount: number): Promise<boolean> => {
    if (!session?.user?.id) return false
    
    try {
      const response = await fetch('/api/credits/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCredits(data.balance)
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to spend credits:', error)
      return false
    }
  }

  const add = async (amount: number) => {
    if (!session?.user?.id) return
    
    try {
      const response = await fetch('/api/credits/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      })
      
      if (response.ok) {
        const data = await response.json()
        setCredits(data.balance)
      }
    } catch (error) {
      console.error('Failed to add credits:', error)
    }
  }

  const hasEnough = (amount: number): boolean => {
    return credits >= amount
  }

  return (
    <CreditsContext.Provider value={{ credits, loading, refresh, spend, add, hasEnough }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditsContext)
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider')
  }
  return context
}