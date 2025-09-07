# Quick Setup Instructions

## 🎯 **What You Need to Do (5 minutes):**

### **Step 1: Get Database URL**
1. Go to [neon.tech](https://neon.tech)
2. Sign up (free) → Create new project
3. Copy the connection string (looks like: `postgresql://user:password@ep-...neon.tech/dbname`)
4. Replace the `DATABASE_URL` in your `.env` file

### **Step 2: Get Redis URL (Optional - for background jobs)**
1. Go to [upstash.com](https://upstash.com)
2. Sign up (free) → Create Redis database
3. Copy the Redis URL
4. Replace the `REDIS_URL` in your `.env` file

### **Step 3: Update Your .env File**
Copy the content from `env-config.txt` into your `.env` file and update:
- `DATABASE_URL` with your Neon database URL
- `REDIS_URL` with your Upstash Redis URL (or keep localhost for now)
- Keep your existing `OPENAI_API_KEY` and `PINECONE_API_KEY`

### **Step 4: Create Pinecone Index**
1. Go to [pinecone.io](https://pinecone.io) console
2. Create new index:
   - **Name**: `pdf-chat`
   - **Dimensions**: `3072`
   - **Metric**: `cosine`
   - **Region**: `us-east-1-aws`

## 🚀 **Then I'll Handle Everything Else**

Once you update the `.env` file with the database URL, I'll:
- ✅ Create all database tables
- ✅ Set up Pinecone vector search
- ✅ Connect OpenAI embeddings and chat
- ✅ Make real PDF upload work
- ✅ Wire up the beautiful UI to real backend

## ⚡ **Alternative: Skip Database Setup for Now**

If you want to test immediately without setting up database:
1. I can build a **file-based version** first that works without database
2. Then upgrade to full database later

**Which option do you prefer?**
- Option A: Set up cloud database (5 minutes, full features)
- Option B: File-based version first (immediate, limited features)
