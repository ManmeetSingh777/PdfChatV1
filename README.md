# PDF Chat App - AI-Powered Document Analysis

A modern, full-stack application that allows users to upload PDFs and chat with them using AI. Built with Next.js, PostgreSQL, Pinecone, and Google Gemini.

## 🚀 Features

### ✅ Implemented Milestones

- **M01-M05**: Core chat system with smart credit management
- **M06**: AI Generation (Summary, Letter, Report) with PChan personality
- **M08**: Document deletion functionality
- **M15**: Database persistence (PostgreSQL)
- **M16**: Large file handling (up to 50MB)
- **M17**: Graceful file size limits

### 🎯 Key Capabilities

- **PDF Upload & Processing**: Upload PDFs up to 50MB with fast processing
- **AI Chat**: Chat with your documents using Google Gemini
- **Smart Credits**: Credits only charged for relevant questions
- **Document Generation**: Generate summaries, letters, and reports
- **Modern UI**: Dark, cyberpunk-themed interface optimized for developers
- **Session Management**: Multiple chat sessions with rename/delete
- **Vector Search**: Powered by Pinecone for accurate document retrieval

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with vector support
- **AI**: Google Gemini (primary), OpenAI (fallback)
- **Vector DB**: Pinecone
- **Storage**: MinIO (S3-compatible)
- **Processing**: Worker service for PDF parsing
- **Containerization**: Docker for local development

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- pnpm package manager
- Google Gemini API key
- Pinecone account
- PostgreSQL database

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/ManmeetSingh777/PdfChatV1.git
cd PdfChatV1
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Set up environment variables
Copy the environment configuration and update with your API keys:
- Database URL
- Google Gemini API key
- Pinecone API key and index name
- Other service configurations

### 4. Start services
```bash
# Start Docker services (PostgreSQL, Redis, MinIO)
cd infra && docker-compose up -d

# Start the application
pnpm dev
```

### 5. Access the application
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Worker**: http://localhost:3003

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js Web   │────│   Express API   │────│   Worker Service│
│   (Port 3000)   │    │   (Port 3001)   │    │   (Port 3003)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │   PostgreSQL    │    │    Pinecone     │    │     MinIO       │
    │   (Database)    │    │  (Vector DB)    │    │   (Storage)     │
    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
pdfChatApp/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # Express API server
│   └── worker/       # PDF processing worker
├── infra/
│   ├── docker-compose.yml
│   └── init-db.sql
└── packages/         # Shared packages
```

## 🔧 Development

### Running individual services
```bash
# Web app only
cd apps/web && pnpm dev

# Worker only  
cd apps/worker && pnpm dev

# All services
pnpm dev
```

### Database management
```bash
# Reset database
docker exec -i infra-postgres-1 psql -U postgres -d docchat < infra/init-db.sql
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy the `apps/web` directory

### Environment Variables for Production
- `DATABASE_URL`: PostgreSQL connection string
- `GEMINI_API_KEY`: Google Gemini API key
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_INDEX_NAME`: Your Pinecone index name
- `NEXTAUTH_SECRET`: Random secret for NextAuth

## 📊 Performance

- **PDF Processing**: Under 10 seconds for large files
- **Vector Search**: Sub-second response times
- **Credit System**: Smart charging for relevant queries only
- **Memory Optimization**: Handles 50MB+ PDFs efficiently

## 🎨 UI/UX Features

- **Dark Theme**: Cyberpunk-inspired design
- **Responsive**: Works on all device sizes  
- **Real-time Updates**: Live processing status
- **Session Management**: Multiple chat histories
- **PChan Personality**: AI with character and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the existing issues
2. Create a new issue with detailed description
3. Include steps to reproduce any bugs

---

Built with ❤️ using modern web technologies
