Perfect — let’s strip that job post down into **plain English features**. No jargon, just what *actually* needs to exist in the app.

---

## 🧩 The Must-Have Features

### 1. **PDF Upload & Processing**

* User uploads big PDFs.
* App reads the text in the background.
* Splits them into small chunks so the AI can handle them.

### 2. **Ask Questions on PDFs**

* User can type a question.
* App finds the right parts of the PDF.
* Shows an **answer** + the **page numbers/sources** it pulled from.

### 3. **Make New Documents**

* Not just Q\&A.
* User can say: “Make a summary / letter / report.”
* App writes a new doc based on the PDFs.
* User can **download/export** it.

### 4. **Credits System**

* User starts with some credits.
* Asking a question = costs 1 credit.
* Generating a new doc = costs more (like 5 credits).
* When credits run out, user buys more (Stripe payment).
* Must prevent **double charging** or free unlimited use.

### 5. **User Accounts**

* People sign up/log in.
* Each user only sees their own files & credits.
* User’s data is separate (private, isolated).

### 6. **Safe File Storage (HIPAA-ready)**

* Files live in the cloud (AWS S3).
* Files are **encrypted** (locked) automatically.
* Access is only through **secret, short-lived links**.
* Logs record who accessed what, when.
* Files can be set to auto-delete after a certain time (retention).
* This is to satisfy **HIPAA** rules if the PDFs are health-related.

### 7. **Backend Plumbing (AWS Setup)**

* Database to store users, files, chunks, credits.
* Worker system to process PDFs without freezing the app.
* AWS roles/permissions so only the right service can touch data.
* Backups in case of crashes.
* Monitoring for errors.

---

## 🚦 What “Done” Looks Like

* **User flow works**: Upload → Wait (Processing) → Ready → Ask → Answer with pages → Generate → Download → Credits drop.
* **Credits are safe**: No double spending, no infinite free use.
* **Storage is safe**: No one else can access my files.
* **HIPAA basics are respected**: encryption, access logs, retention rules.
* **Payments work**: Stripe adds credits once (not twice if retried).

---

## 🎯 In Plain Words

This is basically:
**Google Drive + ChatGPT for PDFs + App Store credits system, sitting safely on AWS with HIPAA locks.**

---

👉 Do you want me to turn this into a **checklist-style milestone plan (like a builder’s to-do list)** you can tick off in Cursor/Notion? That way you can go step-by-step and know when it’s truly finished.
