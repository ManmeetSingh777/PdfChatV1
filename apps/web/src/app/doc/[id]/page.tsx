'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

interface Document {
  id: string
  title: string
  status: 'processing' | 'ready' | 'failed'
  pageCount: number
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  sources?: Array<{ page: number; text: string }>
  timestamp: string
  charged?: boolean
  generationType?: 'summary' | 'letter' | 'report'
}

interface Source {
  page: number
  text: string
}

export default function ChatPage() {
  const params = useParams()
  const documentId = params.id as string
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [document, setDocument] = useState<Document | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingType, setGeneratingType] = useState<string | null>(null)
  const [credits, setCredits] = useState(25)
  const [selectedSources, setSelectedSources] = useState<Source[]>([])
  const [showSourcesPanel, setShowSourcesPanel] = useState(false)
  const [showChatGenerate, setShowChatGenerate] = useState(false)
  const [activeChatTool, setActiveChatTool] = useState<'summary' | 'letter' | 'report' | null>(null)
  const [showChatSidebar, setShowChatSidebar] = useState(false)
  const [chatSessions, setChatSessions] = useState<Array<{
    id: string
    name: string
    lastMessage: string
    timestamp: string
    documentId: string
    messages: ChatMessage[]
  }>>([])
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionName, setEditingSessionName] = useState('')

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch document details and credits
  useEffect(() => {
    fetchDocument()
    fetchCredits()
  }, [documentId])

  useEffect(() => {
    if (document) {
      loadChatSessions()
    }
  }, [document])

  useEffect(() => {
    if (messages.length > 0) {
      updateCurrentSession(messages)
    }
  }, [messages, currentSessionId])

  useEffect(() => {
    if (document && chatSessions.length === 0) {
      createNewChatSession()
    }
  }, [document, chatSessions])

  const fetchDocument = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        const doc = data.documents.find((d: Document) => d.id === documentId)
        setDocument(doc || null)
      }
    } catch (error) {
      console.error('Failed to fetch document:', error)
    }
  }

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits')
      if (response.ok) {
        const data = await response.json()
        setCredits(data.credits)
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !document) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Check if we have an active chat tool
      if (activeChatTool) {
        // Use the generation API with full chat context
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: document.id,
            type: activeChatTool,
            chatContext: [...messages, userMessage], // Full chat history
            userPrompt: userMessage.content // The specific request
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: data.content,
            timestamp: new Date().toISOString(),
            generationType: activeChatTool,
            charged: true
          }

          setMessages(prev => [...prev, assistantMessage])
          
          // Clear the active tool and refresh credits
          setActiveChatTool(null)
          await fetchCredits()
        } else {
          const errorData = await response.json()
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `Sorry, I encountered an error generating the ${activeChatTool}: ${errorData.error || 'Please try again.'}`,
            timestamp: new Date().toISOString()
          }
          setMessages(prev => [...prev, errorMessage])
          setActiveChatTool(null)
        }
      } else {
        // Regular chat functionality
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId: document.id,
            question: userMessage.content
          })
        })

        if (response.ok) {
          const data = await response.json()
          
          const assistantMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: data.answer,
            sources: data.sources || [],
            charged: data.charged,
            timestamp: new Date().toISOString()
          }

          setMessages(prev => [...prev, assistantMessage])
          
          // Update sources panel if there are sources
          if (data.sources && data.sources.length > 0) {
            setSelectedSources(data.sources)
            setShowSourcesPanel(true)
          }
          
          // Refresh credits to get real-time balance
          await fetchCredits()
        } else {
          const errorData = await response.json()
          const errorMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: `Error: ${errorData.error || 'Failed to get response'}`,
            timestamp: new Date().toISOString()
          }
          setMessages(prev => [...prev, errorMessage])
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
      setActiveChatTool(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSourceClick = (sources: Source[]) => {
    setSelectedSources(sources)
    setShowSourcesPanel(true)
  }

  const handleGenerate = async (type: 'summary' | 'letter' | 'report', source: 'document' | 'document+chat' = 'document') => {
    if (!document || isGenerating) return

    setIsGenerating(true)
    setGeneratingType(type)

    try {
      const requestBody: any = {
        documentId: document.id,
        type: type
      }

      // If generating from chat, include conversation context
      if (source === 'document+chat' && messages.length > 0) {
        requestBody.chatContext = messages.slice(-5) // Last 5 messages for context
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add generated content as a chat message
        console.log('📚 Generate API response sources:', data.sources)
        
        const generatedMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'assistant',
          content: data.content,
          timestamp: new Date().toISOString(),
          generationType: type,
          charged: true,
          sources: data.sources || []
        }
        
        console.log('📚 Generated message sources:', generatedMessage.sources)

        setMessages(prev => [...prev, generatedMessage])
        
        // Refresh credits to show the deduction
        await fetchCredits()
      } else {
        const errorData = await response.json()
        alert(`Error: ${errorData.error || `Failed to generate ${type}`}`)
      }
    } catch (error) {
      console.error('Generate error:', error)
      alert('Sorry, something went wrong. Please try again.')
    } finally {
      setIsGenerating(false)
      setGeneratingType(null)
    }
  }


  const handleChatToolSelect = (tool: 'summary' | 'letter' | 'report') => {
    setActiveChatTool(tool)
    setShowChatGenerate(false)
    // Focus the input
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.focus()
    }
  }

  // Chat session management
  const createNewChatSession = () => {
    const sessionId = Date.now().toString()
    const newSession = {
      id: sessionId,
      name: 'New Chat',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      documentId: document?.id || '',
      messages: []
    }
    
    setChatSessions(prev => [newSession, ...prev])
    setCurrentSessionId(sessionId)
    setMessages([])
    saveChatSessions([newSession, ...chatSessions])
  }

  const loadChatSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setMessages(session.messages)
      scrollToBottom()
    }
  }

  const saveChatSessions = (sessions: typeof chatSessions) => {
    try {
      localStorage.setItem(`chatSessions_${document?.id}`, JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save chat sessions:', error)
    }
  }

  const loadChatSessions = () => {
    try {
      const saved = localStorage.getItem(`chatSessions_${document?.id}`)
      if (saved) {
        const sessions = JSON.parse(saved)
        setChatSessions(sessions)
        if (sessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(sessions[0].id)
          setMessages(sessions[0].messages)
        }
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    }
  }

  const updateCurrentSession = (newMessages: ChatMessage[]) => {
    if (!currentSessionId) return
    
    const updatedSessions = chatSessions.map(session => {
      if (session.id === currentSessionId) {
        return {
          ...session,
          messages: newMessages,
          lastMessage: newMessages[newMessages.length - 1]?.content?.substring(0, 50) || '',
          timestamp: new Date().toISOString()
        }
      }
      return session
    })
    
    setChatSessions(updatedSessions)
    saveChatSessions(updatedSessions)
  }

  const renameSession = (sessionId: string, newName: string) => {
    const updatedSessions = chatSessions.map(session => 
      session.id === sessionId ? { ...session, name: newName } : session
    )
    setChatSessions(updatedSessions)
    saveChatSessions(updatedSessions)
    setEditingSessionId(null)
  }

  const deleteSession = (sessionId: string) => {
    const updatedSessions = chatSessions.filter(session => session.id !== sessionId)
    setChatSessions(updatedSessions)
    saveChatSessions(updatedSessions)
    
    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        loadChatSession(updatedSessions[0].id)
      } else {
        createNewChatSession()
      }
    }
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-2 border-cyan-400 border-t-transparent mx-auto mb-6"></div>
            <div className="absolute inset-0 rounded-full bg-cyan-400/20 animate-pulse"></div>
          </div>
          <p className="text-slate-300 text-lg">Loading document...</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    )
  }

  if (document.status !== 'ready') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700 backdrop-blur-sm">
          <div className="text-6xl mb-4">⚡</div>
          <p className="text-slate-300 mb-4 text-lg">Document is not ready for chat yet.</p>
          <p className="text-sm text-slate-500 bg-slate-900/50 px-4 py-2 rounded-full">
            Status: <span className="text-amber-400 font-mono">{document.status}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      {/* Cyber Header */}
      <div className="bg-slate-900/80 border-b border-cyan-500/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 text-slate-400 hover:text-cyan-400 transition-colors group"
              >
                <span className="text-lg group-hover:animate-pulse">←</span>
                <span className="text-sm font-mono">Back</span>
              </button>
              <div className="h-8 w-px bg-slate-700"></div>
            <div>
                <h1 className="text-lg font-bold text-slate-100 flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 animate-pulse"></div>
                    <span className="text-emerald-400 font-bold tracking-wide">PChan</span>
                  </div>
                  <span className="text-slate-500">•</span>
                  <span className="truncate max-w-md text-slate-300">{document.title}</span>
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {document.pageCount} pages • Analytical AI Assistant
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Chat History Toggle */}
              <button
                onClick={() => setShowChatSidebar(!showChatSidebar)}
                className={`px-3 py-2 rounded-lg font-mono text-sm transition-all ${
                  showChatSidebar 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                💬 History
              </button>

              {/* Credits Display */}
              <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                <span className="text-xs font-mono text-blue-100">CREDITS</span>
                <span className="text-xl font-bold text-white">{credits}</span>
                <span className="text-xs text-blue-200 animate-pulse">⚡</span>
            </div>
              

              {/* Sources Toggle */}
            <button
                onClick={() => setShowSourcesPanel(!showSourcesPanel)}
                className={`px-3 py-2 rounded-lg font-mono text-sm transition-all ${
                  showSourcesPanel 
                    ? 'bg-cyan-600 text-white shadow-lg' 
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Sources {selectedSources.length > 0 && `(${selectedSources.length})`}
            </button>
          </div>
        </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Chat Sessions Sidebar */}
        <div className={`transition-all duration-300 ${showChatSidebar ? 'w-80' : 'w-0'} overflow-hidden bg-slate-900/50 border-r border-slate-700/50`}>
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
                <h3 className="text-slate-200 font-bold text-sm">Chat History</h3>
                <button
                  onClick={() => setShowChatSidebar(false)}
                  className="text-slate-400 hover:text-slate-200 p-1 rounded"
                >
                  ✕
                </button>
            </div>
            <button
                onClick={createNewChatSession}
                className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-mono transition-colors flex items-center justify-center space-x-2"
              >
                <span>+</span>
                <span>New Chat</span>
              </button>
            </div>

            {/* Chat Sessions List */}
            <div className="flex-1 overflow-y-auto p-2">
              {chatSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors group ${
                    session.id === currentSessionId
                      ? 'bg-blue-600/20 border border-blue-500/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                  onClick={() => loadChatSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    {editingSessionId === session.id ? (
                      <input
                        type="text"
                        value={editingSessionName}
                        onChange={(e) => setEditingSessionName(e.target.value)}
                        onBlur={() => renameSession(session.id, editingSessionName)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            renameSession(session.id, editingSessionName)
                          }
                        }}
                        className="bg-transparent border-b border-slate-500 text-slate-200 text-sm font-medium focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                    ) : (
                      <h4 className="text-slate-200 text-sm font-medium truncate">{session.name}</h4>
                    )}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingSessionId(session.id)
                          setEditingSessionName(session.name)
                        }}
                        className="text-slate-400 hover:text-slate-200 p-1 text-xs"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteSession(session.id)
                        }}
                        className="text-slate-400 hover:text-red-400 p-1 text-xs"
                      >
                        🗑️
            </button>
          </div>
        </div>
                  {session.lastMessage && (
                    <p className="text-slate-400 text-xs mt-1 truncate">{session.lastMessage}</p>
                  )}
                  <p className="text-slate-500 text-xs mt-1">
                    {new Date(session.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          showSourcesPanel ? 'mr-96' : ''
        }`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Blue Glowing Generation Indicator */}
            {isGenerating && (
              <div className="w-full max-w-4xl mx-auto mb-8">
                <div className="w-full">
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 animate-pulse"></div>
                    <span className="text-blue-400 font-bold text-sm tracking-wide">PChan</span>
                    <span className="text-blue-400 text-xs font-mono bg-blue-500/20 px-2 py-1 rounded animate-pulse">
                      🔮 GENERATING {generatingType?.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-blue-500/50 rounded-2xl p-6 animate-pulse shadow-xl shadow-blue-500/20">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-400 border-t-transparent"></div>
                        <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping"></div>
                      </div>
                      <div className="flex-1">
                        <div className="text-blue-300 font-bold text-lg mb-2">
                          Analyzing document with PChan's intelligence...
                        </div>
                        <div className="text-blue-200 text-sm">
                          Creating {generatingType} with deep insights and analytical depth
                        </div>
                      </div>
                    </div>
                    
                    {/* Animated progress bars */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="flex-1 bg-blue-500/20 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-blue-400 to-cyan-400 h-full animate-pulse w-3/4"></div>
                        </div>
                        <span className="text-xs text-blue-300 font-mono">Processing context</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                        <div className="flex-1 bg-cyan-500/20 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-cyan-400 to-blue-400 h-full animate-pulse w-1/2"></div>
                        </div>
                        <span className="text-xs text-cyan-300 font-mono">Generating insights</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {messages.length === 0 ? (
              <div className="text-center mt-16">
                <div className="text-6xl mb-6 animate-bounce">🤖</div>
                <h2 className="text-2xl font-bold text-slate-200 mb-2">Ready to chat!</h2>
                <p className="text-slate-400 mb-4">Ask me anything about this document.</p>
                <div className="inline-flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
                  <span className="text-xs font-mono text-slate-300">Each question costs</span>
                  <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">1 CREDIT</span>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="w-full max-w-4xl mx-auto mb-8">
                  {/* User Message */}
                  {message.type === 'user' ? (
                    <div className="flex items-start space-x-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0 mt-3 mr-4"></div>
                      <div className="flex-1 min-w-0">
                        {message.activeTool && (
                          <div className="mb-3 flex items-center space-x-2">
                            <span className="bg-cyan-500/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-mono border border-cyan-500/30">
                              {message.activeTool === 'summary' ? '📄 REQUESTING ANALYSIS' : message.activeTool === 'letter' ? '✉️ REQUESTING LETTER' : '📊 REQUESTING REPORT'}
                            </span>
                          </div>
                        )}
                        <div className="text-slate-200 text-base leading-relaxed font-medium">
                          {message.content}
                        </div>
                        <div className="text-xs font-mono text-slate-500 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* PChan Response */
                    <div className="w-full">
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 flex-shrink-0"></div>
                        <span className="text-emerald-400 font-bold text-sm tracking-wide">PChan</span>
                        {message.generationType && (
                          <span className="text-purple-400 text-xs font-mono bg-purple-500/10 px-2 py-1 rounded">
                            {message.generationType === 'summary' ? '📄 ANALYSIS' : message.generationType === 'letter' ? '✉️ LETTER' : '📊 REPORT'}
                          </span>
                        )}
                      </div>
                      <div className="w-full">
                        {/* Special styling for generated content */}
                        <div className={`${
                          message.generationType 
                            ? 'bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6' 
                            : ''
                        }`}>
                          {/* Header for generated content */}
                          {message.generationType && (
                            <div className="sticky top-0 bg-gradient-to-br from-purple-900/30 to-pink-900/30 backdrop-blur-sm z-10 mb-4 pb-3 border-b border-purple-500/30">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">{message.generationType === 'summary' ? '📄' : message.generationType === 'letter' ? '✉️' : '📊'}</span>
                                  <span className="text-purple-300 font-bold text-lg">Generated {message.generationType.charAt(0).toUpperCase() + message.generationType.slice(1)}</span>
                                  <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded text-xs font-mono">FULL CONTEXT</span>
                                </div>
                                <span className="bg-red-600/20 text-red-300 px-3 py-1 rounded-full text-xs font-mono">-5 CREDITS</span>
      </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(message.content)
                                    alert(`${message.generationType?.charAt(0).toUpperCase()}${message.generationType?.slice(1)} copied to clipboard!`)
                                  }}
                                  className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1 rounded-lg text-xs font-mono transition-colors border border-slate-600 flex items-center space-x-1"
                                >
                                  <span>📋</span>
                                  <span>COPY</span>
                                </button>
                                <button
                                  onClick={() => {
                                    const blob = new Blob([message.content], { type: 'text/plain' })
                                    const url = URL.createObjectURL(blob)
                                    const link = window.document.createElement('a')
                                    link.href = url
                                    link.download = `${document?.title.replace(/\.pdf$/i, '')}_${message.generationType}.txt`
                                    window.document.body.appendChild(link)
                                    link.click()
                                    window.document.body.removeChild(link)
                                    URL.revokeObjectURL(url)
                                  }}
                                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-mono transition-all shadow-lg flex items-center space-x-1"
                                >
                                  <span>💾</span>
                                  <span>DOWNLOAD</span>
                                </button>
                                {message.sources && message.sources.length > 0 && (
                                  <button
                                    onClick={() => handleSourceClick(message.sources!)}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1 rounded-lg text-xs font-mono transition-colors flex items-center space-x-1"
                                  >
                                    <span>📚</span>
                                    <span>{message.sources.length} SOURCES</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Message Content */}
                          <div className="text-slate-200 text-base leading-relaxed space-y-4">
                            {message.generationType ? (
                              // Enhanced markdown rendering for generated content
                              <div className="space-y-4">
                                {message.content.split('\n').map((line, index) => {
                                  const trimmedLine = line.trim()
                                  
                                  if (!trimmedLine) return null
                                  
                                  // Handle section headers (## or **Header** standalone)
                                  if (trimmedLine.startsWith('##') || (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.includes('**', 2, trimmedLine.length - 2))) {
                                    const headerText = trimmedLine.replace(/^##\s*/, '').replace(/^\*\*(.*)\*\*$/, '$1')
                                    return (
                                      <div key={index} className="border-l-4 border-purple-400 pl-4 py-3 bg-purple-500/10 rounded-r-xl mb-4">
                                        <h3 className="text-xl font-bold text-purple-300">
                                          {headerText}
                                        </h3>
                                      </div>
                                    )
                                  }
                                  
                                  // Handle bullet points with enhanced styling
                                  if (trimmedLine.startsWith('•') || trimmedLine.startsWith('*') || trimmedLine.match(/^\d+\./)) {
                                    const bulletText = trimmedLine.replace(/^[•*]\s*/, '').replace(/^\d+\.\s*/, '')
                                    const processedBullet = bulletText
                                      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded">$1</strong>')
                                      .replace(/\*(.*?)\*/g, '<em class="text-purple-200 italic">$1</em>')
                                      .replace(/\(Page (\d+)\)/g, '<span class="bg-blue-600/30 text-blue-300 px-2 py-1 rounded-full text-xs font-mono ml-2 border border-blue-500/40">📄 Page $1</span>')
                                    
                                    return (
                                      <div key={index} className="flex items-start space-x-3 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 flex-shrink-0 mt-3"></div>
                                        <div className="flex-1 bg-slate-800/40 rounded-xl p-4 border border-slate-600/30 shadow-lg">
                                          <p className="text-slate-200 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: processedBullet }} />
                                        </div>
                                      </div>
                                    )
                                  }
                                  
                                  // Handle regular paragraphs with enhanced formatting
                                  const processedLine = trimmedLine
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-300 font-bold bg-cyan-500/20 px-2 py-0.5 rounded">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em class="text-purple-200 italic">$1</em>')
                                    .replace(/\(Page (\d+)\)/g, '<span class="bg-blue-600/30 text-blue-300 px-2 py-1 rounded-full text-xs font-mono ml-2 border border-blue-500/40">📄 Page $1</span>')
                                  
                                  return (
                                    <div key={index} className="bg-slate-800/30 rounded-xl p-4 border border-slate-600/20 shadow-sm">
                                      <p className="text-slate-200 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: processedLine }} />
                                    </div>
                                  )
                                }).filter(Boolean)}
                              </div>
                            ) : (
                              // Regular chat message
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            )}
                          </div>

                          {/* Sources and Credits for all messages */}
                          {!message.generationType && (
                            <>
                              {message.sources && message.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-slate-700/50">
                                  <button
                                    onClick={() => handleSourceClick(message.sources!)}
                                    className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-600/10 px-3 py-2 rounded-lg border border-cyan-600/30"
                                  >
                                    <span>📚</span>
                                    <span>View {message.sources.length} Sources</span>
                                    <span>→</span>
                                  </button>
                                </div>
                              )}
                              {message.charged && (
                                <div className="mt-3 text-xs text-orange-400 font-mono flex items-center space-x-1">
                                  <span>💰</span>
                                  <span>1 credit used</span>
                                </div>
                              )}
                            </>
                          )}
                          
                          {/* Footer for generated content */}
                          {message.generationType && (
                            <div className="mt-6 pt-4 border-t border-purple-500/30 flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                {message.sources && message.sources.length > 0 && (
                                  <button
                                    onClick={() => handleSourceClick(message.sources!)}
                                    className="inline-flex items-center space-x-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-600/10 px-3 py-2 rounded-lg border border-cyan-600/30"
                                  >
                                    <span>📚</span>
                                    <span>View {message.sources.length} Sources</span>
                                    <span>→</span>
                                  </button>
                                )}
                                <div className="text-xs text-orange-400 font-mono flex items-center space-x-1">
                                  <span>💰</span>
                                  <span>5 credits used</span>
                                </div>
                              </div>
                              <div className="text-xs text-purple-400 font-mono">
                                PChan Analysis • {message.generationType.toUpperCase()}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs font-mono text-slate-500 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="w-full max-w-4xl mx-auto mb-8">
                <div className="flex items-start space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                    activeChatTool 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500' 
                      : 'bg-gradient-to-br from-green-500 to-emerald-500'
                  }`}>
                    {activeChatTool 
                      ? (activeChatTool === 'summary' ? '📄' : activeChatTool === 'letter' ? '✉️' : '📊')
                      : 'AI'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 text-slate-300">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-base">
                        {activeChatTool ? `Generating ${activeChatTool}...` : 'Analyzing document...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
      </div>

          {/* Input Area */}
          <div className="p-6 bg-slate-900/50 border-t border-slate-700/50">
            <div className="bg-slate-800/70 rounded-2xl border border-slate-700/50 p-4 backdrop-blur-sm">
              <div className="flex space-x-4">
                {/* Chat Generate + Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowChatGenerate(!showChatGenerate)}
                    className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-xl flex items-center justify-center text-slate-300 hover:text-white transition-all border border-slate-600"
                    title="Generate from document + chat context"
                  >
                    <span className="text-lg font-bold">+</span>
                  </button>

                  {/* Chat Tools Dropdown */}
                  {showChatGenerate && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50">
                      <div className="p-2">
                        <div className="px-3 py-2 text-xs text-slate-400 font-mono border-b border-slate-700 mb-2">
                          🛠️ CHAT TOOLS (Next message uses this)
                        </div>
                        <button
                          onClick={() => handleChatToolSelect('summary')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-3"
                        >
                          <span className="text-lg">📄</span>
                          <div>
                            <div className="font-bold">Summary</div>
                            <div className="text-xs text-slate-400">Next message = summary request</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleChatToolSelect('letter')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-3"
                        >
                          <span className="text-lg">✉️</span>
                          <div>
                            <div className="font-bold">Letter</div>
                            <div className="text-xs text-slate-400">Next message = letter request</div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleChatToolSelect('report')}
                          className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 text-slate-200 transition-colors flex items-center space-x-3"
                        >
                          <span className="text-lg">📊</span>
                          <div>
                            <div className="font-bold">Report</div>
                            <div className="text-xs text-slate-400">Next message = report request</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
      </div>

                <div className="flex-1 relative">
                  {/* Active Tool Indicator */}
                  {activeChatTool && (
                    <div className="absolute top-2 left-2 z-10">
                      <div 
                        className="bg-purple-600/80 backdrop-blur-sm border border-purple-400/50 rounded-lg px-3 py-1 flex items-center space-x-2 shadow-lg"
                        title={`${activeChatTool.charAt(0).toUpperCase() + activeChatTool.slice(1)} mode active - Your message will be the main focus for generation`}
                      >
                        <span className="text-white text-sm">{activeChatTool === 'summary' ? '📄' : activeChatTool === 'letter' ? '✉️' : '📊'}</span>
                        <span className="text-white text-xs font-mono font-bold">{activeChatTool.toUpperCase()}</span>
                        <button
                          onClick={() => setActiveChatTool(null)}
                          className="text-purple-200 hover:text-white text-xs ml-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={activeChatTool 
                      ? `Tell me what to focus on for your ${activeChatTool} (e.g., "Focus on compliance issues" or "Summarize the key risks")...` 
                      : "Ask me anything about this document..."
                    }
                    className={`w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-slate-100 placeholder-slate-400 resize-none ${activeChatTool ? 'pt-12' : ''}`}
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-mono text-sm"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>SENDING</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>ASK</span>
                      <span>⚡</span>
                    </div>
                  )}
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Press Enter to send</span>
                <div className="flex items-center space-x-2">
                  <span>Cost:</span>
                  <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded">1 CREDIT</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sources Sidebar */}
        {showSourcesPanel && (
          <div className="fixed right-0 top-16 bottom-0 w-96 bg-slate-900/95 border-l border-slate-700/50 backdrop-blur-sm z-30 transform transition-transform duration-300">
            <div className="h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-slate-700/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                    <span>📚</span>
                    <span>Sources</span>
                  </h3>
                  <button
                    onClick={() => setShowSourcesPanel(false)}
                    className="text-slate-400 hover:text-slate-200 text-xl"
                  >
                    ×
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {selectedSources.length} citation{selectedSources.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Sources List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedSources.map((source, index) => (
                  <div key={index} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-cyan-600/20 text-cyan-300 px-3 py-1 rounded-full text-xs font-mono">
                        PAGE {source.page}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">#{index + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      "{source.text}"
                    </p>
                  </div>
                ))}
                
                {selectedSources.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">📖</div>
                    <p className="text-slate-400">No sources selected yet.</p>
                    <p className="text-sm text-slate-500 mt-2">Sources will appear here when you ask questions.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
