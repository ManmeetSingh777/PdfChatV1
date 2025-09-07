'use client'

import { useState } from 'react'
import { Document } from '@/lib/types'

interface SourcesPanelProps {
  document: Document
  citedPages: number[]
}

export default function SourcesPanel({ document, citedPages }: SourcesPanelProps) {
  const [expandedPages, setExpandedPages] = useState<number[]>([])

  const togglePage = (page: number) => {
    setExpandedPages(prev => 
      prev.includes(page) 
        ? prev.filter(p => p !== page)
        : [...prev, page]
    )
  }

  // Group chunks by page
  const chunksByPage = document.chunks.reduce((acc, chunk) => {
    if (!acc[chunk.page]) {
      acc[chunk.page] = []
    }
    acc[chunk.page].push(chunk)
    return acc
  }, {} as Record<number, typeof document.chunks>)

  const pages = Object.keys(chunksByPage)
    .map(Number)
    .sort((a, b) => a - b)

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-4 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Sources</h2>
        <p className="text-sm text-gray-500 mt-1">
          {document.pages} pages • Click to expand content
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {pages.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No content available</p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {pages.map((page) => {
              const isExpanded = expandedPages.includes(page)
              const isCited = citedPages.includes(page)
              const pageChunks = chunksByPage[page]

              return (
                <div
                  key={page}
                  className={`border rounded-lg transition-colors ${
                    isCited 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    onClick={() => togglePage(page)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className={`font-medium ${
                        isCited ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        Page {page}
                      </span>
                      {isCited && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Cited
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'transform rotate-180' : ''
                      } ${isCited ? 'text-blue-600' : 'text-gray-400'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <div className="space-y-3">
                        {pageChunks.map((chunk, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded text-sm leading-relaxed ${
                              isCited 
                                ? 'bg-blue-25 border border-blue-200' 
                                : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            {chunk.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {citedPages.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-blue-50">
          <p className="text-sm text-blue-800">
            <span className="font-medium">{citedPages.length}</span> page{citedPages.length !== 1 ? 's' : ''} referenced in last answer
          </p>
        </div>
      )}
    </div>
  )
}
