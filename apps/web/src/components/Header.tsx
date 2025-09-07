'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useCredits } from '@/lib/credits'
import BuyCreditsModal from './BuyCreditsModal'

export default function Header() {
  const { data: session, status } = useSession()
  const { credits } = useCredits()
  const [showBuyModal, setShowBuyModal] = useState(false)

  if (status === 'loading') {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">DocChat</h1>
            <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
          </div>
        </div>
      </header>
    )
  }

  if (!session) {
    return (
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">DocChat</h1>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Demo</span>
            </div>
            
            <button
              onClick={() => signIn()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>
    )
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">DocChat</h1>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Live</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{session.user?.name || session.user?.email}</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1 rounded-full">
                  <span className="text-sm text-gray-600">Credits:</span>
                  <span className="font-semibold text-lg text-blue-600">{credits}</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowBuyModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Buy
              </button>
              
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <BuyCreditsModal 
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />
    </>
  )
}
