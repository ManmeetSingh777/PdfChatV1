'use client'

import { useCredits } from '@/lib/credits'

interface BuyCreditsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const { add } = useCredits()

  if (!isOpen) return null

  const handleBuyCredits = () => {
    add(50)
    onClose()
    // Show success toast (could add toast library later)
    console.log('Added 50 credits!')
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Buy Credits</h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This is a demo app. Click the button below to add 50 credits to your account.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">50 Credits</h3>
                <p className="text-sm text-blue-700">Ask 50 questions or generate 10 documents</p>
              </div>
              <div className="text-lg font-bold text-blue-900">Free</div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBuyCredits}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            Add 50 Credits
          </button>
        </div>
      </div>
    </div>
  )
}
