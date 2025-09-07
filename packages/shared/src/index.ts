import { z } from 'zod'

// Environment validation schema
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().default('http://localhost:3000'),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/docchat'),
  
  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),
  
  // S3/MinIO
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('docchat'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin123'),
  S3_FORCE_PATH_STYLE: z.string().transform(val => val === 'true').default('true'),
  
  // Auth
  NEXTAUTH_URL: z.string().default('http://localhost:3000'),
  NEXTAUTH_SECRET: z.string().default('your-secret-key-here'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().optional(),
  
  // App Settings
  FILE_MAX_MB: z.string().transform(val => parseInt(val)).default('50'),
  FREE_CREDITS: z.string().transform(val => parseInt(val)).default('25'),
  ASK_COST: z.string().transform(val => parseInt(val)).default('1'),
  GENERATE_COST: z.string().transform(val => parseInt(val)).default('5'),
})

export type Env = z.infer<typeof EnvSchema>

// Common types
export interface Document {
  id: string
  userId: string
  title: string
  s3Key: string
  pageCount: number
  status: 'processing' | 'ready' | 'failed'
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  email: string
  name?: string
  createdAt: Date
}

export interface Credits {
  userId: string
  balance: number
  updatedAt: Date
}
