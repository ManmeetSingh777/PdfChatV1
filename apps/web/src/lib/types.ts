export interface Document {
  id: string
  title: string
  pages: number
  status: 'processing' | 'ready' | 'failed'
  chunks: Chunk[]
  createdAt: number
  updatedAt: number
}

export interface Chunk {
  page: number
  text: string
}

export interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  citations?: number[]
  timestamp: number
}

export interface Settings {
  failNextUpload: boolean
  slowChat: boolean
}
