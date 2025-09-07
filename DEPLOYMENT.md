# Deployment Guide

## 🚀 Vercel Deployment

### Prerequisites
1. **Database**: Set up a PostgreSQL database (recommended: Neon, Supabase, or Railway)
2. **Pinecone**: Create a vector index named `pdf-chat-gemini` with 768 dimensions
3. **API Keys**: Get Google Gemini API key

### Step 1: Database Setup

#### Option A: Neon (Recommended)
1. Go to [Neon](https://neon.tech) and create account
2. Create new project
3. Copy connection string
4. Run the schema:
```sql
-- Copy contents of infra/init-db.sql and run in Neon SQL editor
```

#### Option B: Supabase
1. Go to [Supabase](https://supabase.com) and create project
2. Go to SQL Editor
3. Run the contents of `infra/init-db.sql`
4. Copy connection string from Settings > Database

### Step 2: Pinecone Setup
1. Go to [Pinecone](https://pinecone.io) and create account
2. Create new index:
   - **Name**: `pdf-chat-gemini`
   - **Dimensions**: `768`
   - **Metric**: `cosine`
   - **Cloud**: `AWS`
   - **Region**: `us-east-1`
3. Copy API key and environment

### Step 3: Get API Keys
1. **Google Gemini**: Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **OpenAI** (optional): Go to [OpenAI Platform](https://platform.openai.com/api-keys)

### Step 4: Deploy to Vercel

#### Via GitHub (Recommended)
1. Push code to GitHub repository
2. Go to [Vercel](https://vercel.com) and import project
3. Select the repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm install && cd apps/web && pnpm build`
   - **Install Command**: `pnpm install`

#### Environment Variables in Vercel
Set these in your Vercel project settings:

```bash
# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# AI APIs  
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# Pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=pdf-chat-gemini
PINECONE_ENVIRONMENT=us-east-1-aws

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_random_secret_here

# App Config
NODE_ENV=production
```

### Step 5: Configure Domain
1. In Vercel dashboard, go to your project
2. Go to Settings > Domains
3. Add your custom domain or use the Vercel domain

### Step 6: Test Deployment
1. Visit your deployed app
2. Try uploading a small PDF
3. Test the chat functionality
4. Verify credits system works

## 🔧 Production Considerations

### Performance Optimization
- Enable Vercel Analytics
- Set up monitoring (Sentry, LogRocket)
- Configure CDN for static assets

### Security
- Use environment-specific API keys
- Enable CORS properly
- Set up rate limiting
- Use HTTPS only

### Scaling
- Monitor database connections
- Set up connection pooling
- Consider Redis for caching
- Monitor Pinecone usage

## 🚨 Common Issues

### Build Failures
- **Error**: "Module not found"
  - **Solution**: Ensure all dependencies are in the correct package.json
- **Error**: "Build timeout"
  - **Solution**: Optimize build process, reduce bundle size

### Runtime Errors
- **Error**: "Database connection failed"
  - **Solution**: Check DATABASE_URL and firewall settings
- **Error**: "Pinecone API error"
  - **Solution**: Verify API key and index configuration

### Performance Issues
- **Slow PDF processing**: Consider using background jobs
- **High memory usage**: Optimize PDF parsing and chunking
- **API timeouts**: Increase Vercel function timeout limits

## 📊 Monitoring

### Key Metrics to Track
- PDF upload success rate
- Processing time per document
- API response times
- Credit usage patterns
- User engagement

### Recommended Tools
- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking and performance monitoring  
- **Mixpanel/Amplitude**: User analytics
- **Uptime Robot**: Uptime monitoring

## 🔄 CI/CD Pipeline

### GitHub Actions (Optional)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm i -g pnpm
      - run: pnpm install
      - run: pnpm build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🆘 Troubleshooting

### Database Issues
```bash
# Test connection
psql "your_database_url_here"

# Run migrations
\i infra/init-db.sql
```

### Vercel Function Limits
- **Timeout**: 10s (Hobby), 60s (Pro)
- **Memory**: 1GB (Hobby), 3GB (Pro)  
- **Payload**: 4.5MB request, 6MB response

### Need Help?
1. Check Vercel deployment logs
2. Review database connection logs
3. Test API endpoints individually
4. Contact support with specific error messages
