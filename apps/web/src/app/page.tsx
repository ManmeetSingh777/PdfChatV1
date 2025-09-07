'use client'

import { useState, useEffect } from 'react'
import DocCard from '@/components/DocCard'

interface Document {
  id: string
  title: string
  status: 'processing' | 'ready' | 'failed'
  pageCount: number
  createdAt: string
  updatedAt: string
}

export default function Dashboard() {
  const [user, setUser] = useState({ name: 'Demo User', credits: 25 })
  const [showSignIn, setShowSignIn] = useState(false)
  const [email, setEmail] = useState('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Ensure client-side rendering consistency
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch documents and credits only after client is ready
  useEffect(() => {
    if (isClient) {
      fetchDocuments()
      fetchCredits()
    }
  }, [isClient]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh documents and credits every 5 seconds
  useEffect(() => {
    if (!isClient) return

    const interval = setInterval(() => {
      fetchDocuments()
      fetchCredits()
    }, 5000) // Refresh every 5 seconds (less aggressive)

    return () => clearInterval(interval)
  }, [isClient]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits')
      if (response.ok) {
        const data = await response.json()
        setUser(prev => ({ ...prev, credits: data.credits }))
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
  }

  const handleRefillCredits = async () => {
    try {
      const response = await fetch('/api/credits/refill', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        alert(`🎉 ${data.message}`)
        await fetchCredits() // Refresh credits display
      }
    } catch (error) {
      console.error('Failed to refill credits:', error)
      alert('Failed to refill credits')
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents?id=${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`🗑️ Document deleted: ${data.deletedDocument?.title}`)
        
        // Refresh documents list
        await fetchDocuments()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete document. Please try again.')
      throw error // Re-throw so DocCard can handle loading state
    }
  }

  const handleUpload = async () => {
    // Create a file input element
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Check file size (50MB limit)
      const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large! Maximum size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`)
        return
      }

      setUploading(true)
      
      try {
        // Step 1: Get presigned URL
        const presignResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            size: file.size
          })
        })

        if (!presignResponse.ok) {
          const error = await presignResponse.json()
          throw new Error(error.error || 'Failed to get upload URL')
        }

        const { uploadUrl, key, fileId } = await presignResponse.json()

        // Step 2: Upload file to S3 (with timeout for large files)
        const uploadTimeout = file.size > 30 * 1024 * 1024 ? 10 * 60 * 1000 : 5 * 60 * 1000 // 10 min for large files
        
        console.log(`📤 Uploading ${(file.size / 1024 / 1024).toFixed(1)}MB file...`)
        
        const uploadResponse = await Promise.race([
          fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
              'Content-Type': 'application/pdf'
            }
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout - file too large or connection too slow')), uploadTimeout)
          )
        ])

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file')
        }

        // Step 3: Create document record
        const docResponse = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: file.name,
            s3Key: key,
            fileId
          })
        })

        if (!docResponse.ok) {
          throw new Error('Failed to create document record')
        }

        // Refresh documents list
        await fetchDocuments()

        console.log(`✅ Successfully uploaded: ${file.name}`)
        
      } catch (error) {
        console.error('Upload error:', error)
        alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleSignIn = () => {
    setShowSignIn(true)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      alert(`Sign-in link would be sent to: ${email}\n\nReal authentication will be implemented in M18!`)
      setShowSignIn(false)
      setEmail('')
    }
  }

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="bg-slate-900/80 border-b border-cyan-500/30 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-slate-100">PDF Chat</h1>
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full font-mono">DEMO</span>
              </div>
              <div className="text-sm text-slate-300 animate-pulse">Loading...</div>
            </div>
          </div>
        </header>
        <div className="max-w-6xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="animate-pulse text-slate-300">Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Cyber Header */}
      <header className="bg-slate-900/80 border-b border-cyan-500/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-slate-100 flex items-center space-x-2">
                <span className="text-cyan-400">📄</span>
                <span>PDF Chat</span>
              </h1>
              <span className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full font-mono animate-pulse">DEMO</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="text-sm text-slate-300">
                  <span className="font-medium font-mono">{user.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                    <span className="text-xs font-mono text-blue-100">CREDITS</span>
                    <span className="text-xl font-bold text-white">{user.credits}</span>
                    <span className="text-xs text-blue-200 animate-pulse">⚡</span>
                  </div>
                  <button
                    onClick={handleRefillCredits}
                    className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-mono transition-colors"
                    title="Add 100 credits for testing"
                  >
                    +100
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleSignIn}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-mono transition-colors border border-slate-600"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-100 mb-3 flex items-center space-x-3">
            <span>My Documents</span>
            <span className="text-2xl animate-bounce">🚀</span>
          </h1>
          <p className="text-slate-400 text-lg">Upload PDFs and chat with them using AI</p>
        </div>

        <div className="mb-8">
          <button 
            onClick={handleUpload}
            disabled={uploading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white px-8 py-4 rounded-xl font-mono font-medium flex items-center space-x-3 transition-all shadow-xl border border-indigo-500/30"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                <span>UPLOADING...</span>
                <span className="animate-pulse">⚡</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>UPLOAD PDF</span>
                <span>📄</span>
              </>
            )}
          </button>
        </div>

        {/* Documents Grid */}
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <DocCard 
                key={doc.id} 
                document={doc} 
                onDelete={handleDeleteDocument}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16 bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-600/50 backdrop-blur-sm">
            <div className="max-w-sm mx-auto">
              <div className="text-6xl mb-6 animate-pulse">📄</div>
              <h3 className="text-2xl font-bold text-slate-200 mb-3">No documents yet</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Upload a PDF to get started with AI-powered document chat
              </p>
              <div className="space-y-2">
                <p className="text-sm text-green-400 font-mono bg-green-500/10 px-4 py-2 rounded-full inline-block">
                  ✅ M01-M05 COMPLETE: Full chat system working!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cyber Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-slate-100 flex items-center space-x-2">
              <span>🔐</span>
              <span>Sign In to PDF Chat</span>
            </h2>
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-mono text-slate-300 mb-3">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 px-4 rounded-xl font-mono font-medium transition-all shadow-lg"
                >
                  SEND LINK
                </button>
                <button
                  type="button"
                  onClick={() => setShowSignIn(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 px-4 rounded-xl font-mono font-medium transition-colors border border-slate-600"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}