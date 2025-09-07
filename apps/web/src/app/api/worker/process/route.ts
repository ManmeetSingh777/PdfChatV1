import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Pinecone } from '@pinecone-database/pinecone';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import pdfParse from 'pdf-parse';

// Initialize clients
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const s3 = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function POST(request: NextRequest) {
  try {
    const { documentId, s3Key } = await request.json();

    // Download PDF from S3
    const getCommand = new GetObjectCommand({
      Bucket: 'pdfs',
      Key: s3Key,
    });
    
    const response = await s3.send(getCommand);
    const pdfBuffer = await response.Body!.transformToByteArray();

    // Parse PDF
    const pdfData = await pdfParse(Buffer.from(pdfBuffer));
    const text = pdfData.text;

    // Chunk text (simplified for serverless)
    const chunks = chunkText(text, 8000);
    
    // Generate embeddings and store in Pinecone
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    const model = gemini.getGenerativeModel({ model: 'text-embedding-004' });

    for (let i = 0; i < chunks.length; i += 10) {
      const batch = chunks.slice(i, i + 10);
      const embeddings = await Promise.all(
        batch.map(async (chunk, idx) => {
          const result = await model.embedContent(chunk);
          return {
            id: `${documentId}-chunk-${i + idx}`,
            values: result.embedding.values,
            metadata: {
              documentId,
              text: chunk,
              page: Math.floor((i + idx) / 10) + 1,
            },
          };
        })
      );

      await index.upsert(embeddings);
    }

    // Update document status
    await fetch(`${process.env.NEXTAUTH_URL}/api/documents/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        status: 'ready',
        pages: Math.ceil(chunks.length / 10),
      }),
    });

    return NextResponse.json({ success: true, chunks: chunks.length });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

function chunkText(text: string, maxChars: number): string[] {
  const sentences = text.split(/[.!?]+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence + '. ';
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 50);
}
