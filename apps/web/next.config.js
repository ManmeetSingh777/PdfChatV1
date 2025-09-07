/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'super-secret-nextauth-key-change-in-production-please',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/docchat',
    EMAIL_FROM: 'noreply@docchat.local',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME || 'pdf-chat-gemini',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    WORKER_URL: process.env.WORKER_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fix memory issues
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
}

module.exports = nextConfig