'use client'

import { useState } from 'react'
import { Document } from '@/lib/types'
import { useCredits } from '@/lib/credits'

interface GenerateModalProps {
  isOpen: boolean
  onClose: () => void
  document: Document
}

type DocumentType = 'summary' | 'letter' | 'report'

export default function GenerateModal({ isOpen, onClose, document }: GenerateModalProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>('summary')
  const [includeCitations, setIncludeCitations] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const { spend } = useCredits()

  if (!isOpen) return null

  const handleGenerate = async () => {
    setIsGenerating(true)
    
    // Spend 5 credits
    spend(5)

    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Generate content based on document chunks
    const topChunks = document.chunks.slice(0, 5)
    const content = generateContent(selectedType, topChunks, includeCitations)
    
    setGeneratedContent(content)
    setIsGenerating(false)
  }

  const generateContent = (type: DocumentType, chunks: any[], citations: boolean) => {
    const combinedText = chunks.map(c => c.text).join(' ')
    
    let content = ''
    
    switch (type) {
      case 'summary':
        content = `# Document Summary\n\n${combinedText.substring(0, 500)}...\n\n## Key Points\n\n• Main topic: ${document.title.replace('.pdf', '')}\n• Document contains ${document.pages} pages\n• Key information extracted from multiple sections`
        break
      case 'letter':
        content = `# Business Letter\n\nDear Colleague,\n\nI am writing to summarize the key points from ${document.title}.\n\n${combinedText.substring(0, 300)}...\n\nPlease let me know if you need any clarification on these points.\n\nBest regards,\nDocChat Assistant`
        break
      case 'report':
        content = `# Report: ${document.title.replace('.pdf', '')}\n\n## Executive Summary\n\n${combinedText.substring(0, 400)}...\n\n## Analysis\n\nThis document covers important aspects that require attention.\n\n## Recommendations\n\n• Review the key terms outlined\n• Consider the implications for future planning\n• Ensure compliance with stated requirements`
        break
    }

    if (citations) {
      const pages = [...new Set(chunks.map(c => c.page))].sort()
      content += `\n\n---\n\n**Sources:** ${pages.map(p => `Page ${p}`).join(', ')}`
    }

    return content
  }

  const handleCopy = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent)
      // Could add toast notification here
      console.log('Content copied to clipboard!')
    }
  }

  const handleDownload = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `generated-${selectedType}-${Date.now()}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const handleClose = () => {
    setGeneratedContent(null)
    setIsGenerating(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Generate Document</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-gray-600 mt-1">Pick a format. We'll keep it short and clear.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!generatedContent ? (
            <div className="space-y-6">
              {/* Document Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Document Type</label>
                <div className="space-y-3">
                  {[
                    { value: 'summary', label: 'Summary', description: 'Key points and overview' },
                    { value: 'letter', label: 'Letter', description: 'Formal business letter format' },
                    { value: 'report', label: 'Report', description: 'Detailed analysis and recommendations' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="documentType"
                        value={option.value}
                        checked={selectedType === option.value}
                        onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Citations Option */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCitations}
                    onChange={(e) => setIncludeCitations(e.target.checked)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Include citations</span>
                </label>
              </div>

              {/* Generate Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                >
                  {isGenerating && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{isGenerating ? 'Generating...' : 'Create (5 credits)'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Generated Content */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                  {generatedContent}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCopy}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
