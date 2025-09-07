'use client'

import { useState } from 'react'

interface Document {
  id: string
  title: string
  status: 'processing' | 'ready' | 'failed'
  pageCount: number
  createdAt: string
  updatedAt: string
}

interface DocCardProps {
  document: Document
  onDelete?: (documentId: string) => void
}

export default function DocCard({ document, onDelete }: DocCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(document.id)
    } catch (error) {
      console.error('Delete failed:', error)
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing': return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      case 'ready': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30'
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <div className="relative">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-300 border-t-transparent"></div>
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse"></div>
          </div>
        )
      case 'ready':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'failed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'processing': return '⚡'
      case 'ready': return '✅'
      case 'failed': return '❌'
      default: return '📄'
    }
  }

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{getStatusEmoji(document.status)}</span>
            <h3 className="text-lg font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
              {document.title}
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            ID: {document.id.slice(0, 8)}... • {formatDate(document.createdAt)}
          </p>
        </div>
        
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono border ${getStatusColor(document.status)}`}>
          {getStatusIcon(document.status)}
          <span className="ml-2 uppercase font-bold">{document.status}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-300 font-mono">
          {document.pageCount > 0 ? (
            <span className="flex items-center space-x-2">
              <span>📊</span>
              <span>{document.pageCount} pages</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2 animate-pulse">
              <span>⏳</span>
              <span>Processing...</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-3">
          {document.status === 'ready' && (
            <>
              <a 
                href={`/doc/${document.id}`}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all shadow-lg"
              >
                <span>💬</span>
                <span>OPEN CHAT</span>
              </a>
              <GenerateButton documentId={document.id} />
            </>
          )}
          {document.status === 'failed' && (
            <button className="inline-flex items-center space-x-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all border border-red-500/30">
              <span>🔄</span>
              <span>RETRY</span>
            </button>
          )}
        </div>
        
        <div className="relative">
          <button 
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`p-2 rounded-lg transition-colors ${
              isDeleting 
                ? 'text-slate-500 cursor-not-allowed' 
                : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
            title="Delete document"
          >
            {isDeleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Confirmation Dialog */}
          {showDeleteConfirm && (
            <div className="absolute top-full right-0 mt-2 bg-slate-800 border-2 border-red-500/50 rounded-xl shadow-xl z-20 min-w-[280px] p-4">
              <div className="text-center">
                <div className="text-red-400 text-2xl mb-2">⚠️</div>
                <h3 className="text-slate-200 font-bold text-sm mb-2">Delete Document?</h3>
                <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                  This will permanently delete "<span className="text-slate-200 font-mono">{document.title}</span>" and all its data.
                  <br />
                  <span className="text-red-300">This action cannot be undone.</span>
                </p>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-mono transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-colors ${
                      isDeleting
                        ? 'bg-red-500/50 text-red-200 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {isDeleting ? (
                      <div className="flex items-center justify-center space-x-1">
                        <div className="animate-spin rounded-full h-3 w-3 border border-red-200 border-t-transparent"></div>
                        <span>Deleting...</span>
                      </div>
                    ) : (
                      'Delete Forever'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Generate Button Component for Document Cards
function GenerateButton({ documentId }: { documentId: string }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingType, setGeneratingType] = useState<string | null>(null)

  const handleGenerate = async (type: 'summary' | 'letter' | 'report') => {
    setIsGenerating(true)
    setGeneratingType(type)
    setShowDropdown(false)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          type,
          userPrompt: `Generate a ${type} of this document`
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Download the generated content
        const blob = new Blob([data.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `document_${type}.txt`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert('Failed to generate content')
      }
    } catch (error) {
      console.error('Generate error:', error)
      alert('Failed to generate content')
    } finally {
      setIsGenerating(false)
      setGeneratingType(null)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isGenerating}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-mono font-medium transition-all shadow-lg ${
          isGenerating 
            ? 'bg-purple-600/50 text-purple-200 cursor-not-allowed animate-pulse' 
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-200 border-t-transparent"></div>
            <span>GENERATING {generatingType?.toUpperCase()}</span>
          </>
        ) : (
          <>
            <span>📄</span>
            <span>GENERATE</span>
            <span className="text-xs">▼</span>
          </>
        )}
      </button>

      {showDropdown && !isGenerating && (
        <div className="absolute top-full mt-2 left-0 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[160px]">
          <button
            onClick={() => handleGenerate('summary')}
            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-200 text-sm font-mono flex items-center space-x-2 first:rounded-t-lg"
          >
            <span>📄</span>
            <span>Summary</span>
          </button>
          <button
            onClick={() => handleGenerate('letter')}
            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-200 text-sm font-mono flex items-center space-x-2 border-t border-slate-600"
          >
            <span>✉️</span>
            <span>Letter</span>
          </button>
          <button
            onClick={() => handleGenerate('report')}
            className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-200 text-sm font-mono flex items-center space-x-2 border-t border-slate-600 last:rounded-b-lg"
          >
            <span>📊</span>
            <span>Report</span>
          </button>
        </div>
      )}
    </div>
  )
}