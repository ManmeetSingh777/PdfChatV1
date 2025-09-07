import express from 'express'
import cors from 'cors'
import { config } from 'dotenv'

// Load environment variables
config()

// Create Express app
const app = express()
const port = process.env.PORT || 3001

// Basic middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
})

// API routes placeholder
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'PDF Chat API is running!',
    version: '1.0.0'
  })
})

// Start server
app.listen(port, () => {
  console.log(`🚀 API server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
})