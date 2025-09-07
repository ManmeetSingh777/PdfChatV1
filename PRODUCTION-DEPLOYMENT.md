# 🚀 PRODUCTION DEPLOYMENT GUIDE

## **STEP 1: Set Up Database (Neon.tech)**

### **1.1 Create Neon Database**
1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project: "PDF Chat App"
3. Copy the connection string (looks like: `postgresql://username:password@host/database?sslmode=require`)

### **1.2 Initialize Database**
1. In Neon console, go to "SQL Editor"
2. Copy and paste the entire contents of `infra/init-db.sql`
3. Run the script to create all tables

### **1.3 Add Demo User & Credits**
```sql
-- Insert demo user
INSERT INTO users (id, email, name) 
VALUES ('00000000-0000-0000-0000-000000000000', 'demo@example.com', 'Demo User')
ON CONFLICT (id) DO NOTHING;

-- Add initial credits
INSERT INTO credits (user_id, balance) 
VALUES ('00000000-0000-0000-0000-000000000000', 500)
ON CONFLICT (user_id) DO UPDATE SET balance = 500;
```

## **STEP 2: Deploy Worker to Railway**

### **2.1 Create Railway Account**
1. Go to [railway.app](https://railway.app) and sign up with GitHub
2. You get **$5 FREE credits** (enough for testing)

### **2.2 Deploy Worker**
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select: `ManmeetSingh777/PdfChatV1`
3. **Root Directory**: `apps/worker`
4. Railway will auto-detect the Node.js app

### **2.3 Set Environment Variables**
In Railway project settings, add:

```bash
# Database
DATABASE_URL=your_neon_connection_string_here

# AI APIs
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=pdf-chat-gemini
PINECONE_ENVIRONMENT=us-east-1-aws

# S3/MinIO (for production, use AWS S3)
S3_ENDPOINT=your_s3_endpoint
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_BUCKET=pdf-uploads
S3_REGION=us-east-1

# Production
NODE_ENV=production
```

### **2.4 Get Worker URL**
After deployment, Railway gives you a URL like: `https://your-worker.railway.app`

## **STEP 3: Deploy Web App to Vercel**

### **3.1 Create Vercel Project**
1. Go to [vercel.com](https://vercel.com) and sign up
2. Click **"New Project"** → Import from GitHub: `ManmeetSingh777/PdfChatV1`
3. **Framework**: Next.js
4. **Root Directory**: `apps/web`
5. **Build Command**: `npm install && npm run build`

### **3.2 Set Environment Variables**
In Vercel project settings, add:

```bash
# Database
DATABASE_URL=your_neon_connection_string_here

# AI APIs  
GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=pdf-chat-gemini
PINECONE_ENVIRONMENT=us-east-1-aws

# Worker Service
WORKER_URL=https://your-worker.railway.app

# S3/MinIO
S3_ENDPOINT=your_s3_endpoint
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_BUCKET=pdf-uploads
S3_REGION=us-east-1

# NextAuth
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=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

# Production
NODE_ENV=production
```

## **STEP 4: Update Web App for Production**

The web app needs to call the Railway worker instead of localhost. This will be done automatically using the `WORKER_URL` environment variable.

## **STEP 5: Test Production Setup**

### **5.1 Verify Services**
- **Worker Health**: `https://your-worker.railway.app/health`
- **Web App**: `https://your-app.vercel.app`

### **5.2 Test Workflow**
1. Upload a PDF
2. Check processing works
3. Test chat functionality
4. Verify credits system

## **🎯 FINAL RESULT**

**Client Demo URL**: `https://your-app.vercel.app`

### **Architecture**:
```
Client Browser → Vercel (Web UI) → Railway (Worker) → Neon (Database)
                                  ↓
                               Pinecone (Vectors)
```

### **Monthly Costs**:
- **Vercel**: $0 (Hobby plan)
- **Railway**: $5 (after free credits)  
- **Neon**: $0 (Free tier)
- **Pinecone**: $0 (Free tier)

**Total: $5/month for production!** 🎉

## **🔧 TROUBLESHOOTING**

### **Database Issues**:
- Check `DATABASE_URL` format
- Ensure SSL mode is enabled for Neon
- Verify tables exist in Neon console

### **Worker Issues**:
- Check Railway logs for errors
- Verify all environment variables are set
- Test health endpoint

### **Deployment Issues**:
- Clear build cache in Vercel
- Check build logs for errors
- Verify root directory is correct

---

**Ready to deploy? Follow the steps above and you'll have a production PDF Chat App!** 🚀