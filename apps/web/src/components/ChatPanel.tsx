'use client'

import { useState, useRef, useEffect } from 'react'
import { Document, ChatMessage } from '@/lib/types'
import { useCredits } from '@/lib/credits'
import { search, generateAnswer } from '@/lib/fakeSearch'
import { getSettings } from '@/lib/store'
import BuyCreditsModal from './BuyCreditsModal'
import GenerateModal from './GenerateModal'

interface ChatPanelProps {
  document: Document
  messages: ChatMessage[]
  onNewMessage: (message: ChatMessage) => void
}

export default function ChatPanel({ document, messages, onNewMessage }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const { credits, spend, hasEnough } = useCredits()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isAsking) return

    // Check credits first
    if (!hasEnough(1)) {
      setShowBuyModal(true)
      return
    }

    // Prevent double submission
    setIsAsking(true)
    const question = input.trim()
    setInput('')

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: question,
      timestamp: Date.now()
    }
    onNewMessage(userMessage)

    // Spend credit
    spend(1)

    try {
      // Simulate delay if slow chat is enabled
      const settings = getSettings()
      if (settings.slowChat) {
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // Search for relevant chunks
      const relevantChunks = search(document.chunks, question)
      const answer = generateAnswer(relevantChunks, question)
      const citations = [...new Set(relevantChunks.map(c => c.page))].sort()

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        type: 'assistant',
        content: answer,
        citations,
        timestamp: Date.now()
      }
      onNewMessage(assistantMessage)

    } catch (error) {
      // Error handling
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: Date.now()
      }
      onNewMessage(errorMessage)
    } finally {
      setIsAsking(false)
      inputRef.current?.focus()
    }
  }

  return (
    <>
      <div className="flex-1 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                <p className="text-gray-500 mb-4">Ask questions about this document and I'll provide answers with citations.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <p className="text-sm font-medium text-blue-900 mb-2">Try asking:</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• "Give me a 3-bullet summary of this document"</li>
                    <li>• "What are the payment terms?"</li>
                    <li>• "When does this agreement expire?"</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl rounded-lg px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500">
                          Sources: {message.citations.map(page => `Page ${page}`).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-center space-x-2 mb-2">
            <p className="text-xs text-gray-500">Ask = 1 credit • Generate = 5 credits</p>
          </div>
          
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this document..."
              disabled={isAsking}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isAsking}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Ask
            </button>
            <button
              type="button"
              onClick={() => {
                if (!hasEnough(5)) {
                  setShowBuyModal(true)
                } else {
                  setShowGenerateModal(true)
                }
              }}
              disabled={isAsking}
              className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Generate
            </button>
          </form>
        </div>
      </div>

      <BuyCreditsModal 
        isOpen={showBuyModal}
        onClose={() => setShowBuyModal(false)}
      />

      <GenerateModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        document={document}
      />
    </>
  )
}
