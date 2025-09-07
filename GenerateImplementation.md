Alright, let’s break this down step-by-step, **with your exact stack in mind**:

* **Gemini** = LLM for Q\&A and generation
* **Pinecone** = vector DB for embeddings + retrieval
* **Next.js frontend** (assumed) + API routes

I’ll cover **frontend flow**, **backend flow**, **prompt logic**, and **integration glue** — in baby-simple, over-specific detail.

---

# 📘 Frontend (What user sees & clicks)

1. **Generate Button (Top of Doc Page)**

   * Add a button labeled **Generate** in the top bar.
   * When clicked, it shows 3 options: **Summary / Letter / Report**.
   * User picks one.

2. **Chat Box (Extra Options)**

   * Inside chat input, add 3 small icons (Summary / Letter / Report).
   * If clicked, we also pass the **chat history** along with the document context.

3. **Visual Indicator**

   * When generation is running, show a **blue glowing icon** (like GPT tool toggle).
   * While waiting, show spinner with “Generating \[Summary/Letter/Report]…”

4. **Output Display**

   * When ready, show the output in a modal or right panel.
   * At the top:

     * “📑 Generated from: Document”
     * or “📑 Generated from: Document + Chat Context”
   * Buttons: **Copy** + **Download as PDF/Docx**

---

# ⚙️ Backend (What happens behind the scenes)

## Step 1. User Action → API Call

* Frontend calls an endpoint:

  ```
  POST /api/generate
  {
    "docId": "123",
    "type": "letter",   // or "summary" / "report"
    "conversationId": "abc" // optional, only if triggered in chat
  }
  ```

## Step 2. Retrieve Context

* API fetches top chunks from **Pinecone** for the document:

  * `namespace = userId`
  * `filter = { docId }`
  * Query = “auto-summary” prompt or user’s last chat question (if context is included).
* Returns \~5–10 relevant chunks (with text + page numbers).

## Step 3. Build Prompt (based on type)

* **Summary Template:**
  “Summarize the following document in clear bullet points. Cite page numbers.”

* **Letter Template:**
  “Write a formal letter using the following document as source. Start with ‘Dear \[Recipient],’. Keep it professional. Reference key points with page numbers.”

* **Report Template:**
  “Generate a structured report with sections: Introduction, Key Findings, Risks/Obligations, Conclusion. Ground all content in the document. Add citations.”

*(If chat context is included: add the last N messages before the chunks.)*

## Step 4. Call Gemini

* Send `{ prompt, chunks, chatContext }` to Gemini API.
* Include system message: “Always cite page numbers. If not found in context, say ‘Not available in this document.’”

## Step 5. Return Response

* API returns:

  ```
  {
    "output": "Dear Sir/Madam, Based on GDPR Article 17…",
    "citations": [
      { "page": 17, "text": "Right to erasure…" }
    ]
  }
  ```

---

# 🧠 Technical Glue

* **Embeddings**: When ingesting PDFs, store embeddings in Pinecone with metadata:

  ```
  {
    docId: "123",
    page: 17,
    userId: "xyz",
    text: "Right to be forgotten…"
  }
  ```
* **Retrieval**: When generating, query Pinecone → get top K chunks → add to prompt.
* **Gemini**: Wrap Gemini call in a helper function, include both **retrieved chunks** and **user context**.
* **Credits**: Deduct credits when `/generate` runs (5 credits).
* **Output Save**: Save generated text in DB under `generations` table (optional, for history).

---

# ✅ Example Flow (Summary Generation)

1. User clicks **Generate → Summary** on GDPR.pdf.
2. API retrieves top 10 chunks from Pinecone.
3. API builds summary prompt.
4. Sends to Gemini → gets 4-bullet summary with citations.
5. App shows result in modal with “📑 Generated from: Document.”
6. Deduct 5 credits.
7. User can copy/download.

---

# 🎯 Why This Is Good

* **Clean UX**: one button, three options.
* **Trust**: always cites doc pages.
* **Flexibility**: doc-only or doc+chat depending where user clicked.
* **Reusability**: same pipeline, just different prompt templates.
* **Scalable**: Pinecone stores all embeddings, Gemini handles reasoning.

---

