v# Real App — Technical Roadmap (Cursor Edition)

> **Purpose:** A developer‑ready plan you can paste into Cursor. Extreme detail, clear steps, simple wording. This is for the **real app** (not the fake demo).
>
> **One‑liner:** “Upload PDFs → background ingest → ask with citations → generate docs → credits & payments → safe storage & sharing.”

---

## 0) Final Stack (pick once, stay consistent)

* **Frontend:** Next.js (App Router) + TypeScript + Tailwind.
* **API service:** Node.js (NestJS or Express) + TypeScript.
* **Worker service:** Node.js + BullMQ (Redis) for jobs. *(Adapter ready to swap to SQS later.)*
* **Database:** PostgreSQL 15 + **pgvector** extension.
* **ORM:** Drizzle ORM (schema in TS, easy raw SQL for vectors).
* **Storage:** S3 (or MinIO locally) with pre‑signed URLs.
* **Auth:** NextAuth (email sign‑in) or password login. JWT in cookies.
* **Payments:** Stripe Checkout + Webhooks.
* **LLM/Embeddings:** Provider interface → start with OpenAI (real), later swap to Bedrock/Azure via the same interface.
* **Tokenization:** `tiktoken` or `@dqbd/tiktoken` for chunk sizes.
* **Validation:** Zod for all request bodies.
* **Logging:** Pino + request IDs. Save minimal action logs to DB.
* **Env:** `dotenv` + `zod` safe parser.
* **Dev orchestration:** Docker Compose (postgres, redis, minio, mailhog).

**Monorepo (pnpm workspaces)**

```
apps/
  web/        # Next.js frontend
  api/        # REST API (NestJS/Express)
  worker/     # BullMQ consumers (ingestion, generation)
packages/
  shared/     # types, zod schemas, constants
  db/         # drizzle schema & queries
  providers/  # llm, embeddings, storage, queue adapters
infra/
  docker-compose.yml
  scripts/    # seed, migrate, create-vector-ext
```

---

## 1) Environment Variables (single source of truth)

Create `.env` (dev) and `.env.production` (prod). Validate with Zod on boot.

```
# Core
APP_URL=http://localhost:3000
NODE_ENV=development

# Postgres
DATABASE_URL=postgres://user:pass@localhost:5432/docchat

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_BUCKET=docchat
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_FORCE_PATH_STYLE=true

# Auth (NextAuth)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
EMAIL_SERVER_HOST=localhost
EMAIL_SERVER_PORT=1025
EMAIL_FROM=noreply@docchat.local

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_CREDITS_50=price_...

# LLM / Embeddings (OpenAI to start)
OPENAI_API_KEY=...
OPENAI_EMBED_MODEL=text-embedding-3-large
OPENAI_CHAT_MODEL=gpt-4o-mini

# Misc
FILE_MAX_MB=50
FREE_CREDITS=25
ASK_COST=1
GENERATE_COST=5
CHUNK_TOKENS=900
CHUNK_OVERLAP=120
TOP_K=6
EMBEDDING_VERSION=v1-embed3L-900tok
```

---

## 2) Database Schema (Drizzle + SQL) — minimal but complete

**Tables (owner on every row):**

* `users`
* `documents`
* `chunks`
* `conversations`, `messages`
* `credits`, `transactions`, `webhook_events`
* `ingestion_runs`
* `audit_logs`

**SQL (essentials)**

```sql
-- Enable pgvector once per DB
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  page_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('processing','ready','failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started','chunked','embedded','complete','failed')),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(document_id, version)
);

-- Each chunk has text, page, and vector
CREATE TABLE chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page INT NOT NULL,
  text TEXT NOT NULL,
  embedding VECTOR(3072) NOT NULL, -- adjust dims per model
  embedding_version TEXT NOT NULL,
  chunk_params JSONB NOT NULL,
  chunk_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX chunks_doc_idx ON chunks(document_id);
CREATE INDEX chunks_user_idx ON chunks(user_id);
CREATE INDEX chunks_emb_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('document','collection')),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  citations JSONB,
  token_count INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INT NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  received_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  target_id TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3) API Contract (REST) — simple, explicit

Base URL: `/api`

### Auth

* `POST /auth/signup` — body: { email, password? } → creates user + free credits
* `POST /auth/login` — returns session cookie
* `POST /auth/logout`

### Uploads & Documents

* `POST /uploads/presign` — body: { filename, size } → { url, fields, key }
* `POST /documents` — body: { title, s3\_key } → creates record, queues ingest
* `GET /documents` — list user docs
* `GET /documents/:id` — one doc
* `DELETE /documents/:id`
* `POST /documents/:id/retry` — requeue ingest

### Chat & Conversations

* `POST /conversations` — { scope, document\_id? } → new conv
* `GET /conversations/:id/messages`
* `POST /chat` — { conversation\_id, question } → **spend 1 credit**, returns { answer, citations\[] }

### Generate

* `POST /generate` — { document\_id|collection\_id, type } → **spend 5 credits**, returns { markdown, citations\[] }

### Credits & Payments

* `GET /credits` — { balance }
* `POST /credits/checkout` — { pack: 'CREDITS\_50' } → Stripe checkout URL
* `POST /stripe/webhook` — idempotent; mints credits once

### Admin (guarded)

* `GET /admin/failed-jobs`
* `POST /admin/retry-job` — { job\_id }
* `POST /admin/adjust-credits` — { user\_id, delta, note }

**Rules applied on every API call**

* Read/write is **scoped by user** (user can only touch their rows).
* Validate all inputs with Zod.
* Log `audit_logs` for sensitive actions (upload, delete, credit change).

---

## 4) Ingestion Pipeline (background worker)

**Job name:** `ingest.pdf`

**Steps**

1. **Download** PDF from S3 by `s3_key`.
2. **Extract text** per page (pdf.js or `pdf-parse`). If page is image‑only, fall back to OCR (later).
3. **Chunk** text with token budget (`CHUNK_TOKENS`, overlap `CHUNK_OVERLAP`). Keep **page number** on each chunk.
4. **Embed** each chunk with provider (OpenAI) → dense vector.
5. **Upsert** `chunks` rows (user\_id, document\_id, page, text, embedding, `embedding_version`, `chunk_params`, `chunk_index`).
6. Mark `documents.status = 'ready'` and insert/update `ingestion_runs` with `status='complete'`.

**Idempotency**

* `ingestion_runs` has `(document_id, version)` unique. If found `complete`, skip.
* For retries, delete prior chunks for that `(document_id, version)` or write a new version and mark it active.

**Retry & DLQ**

* BullMQ job options: `attempts: 3`, `backoff: { type: 'exponential', delay: 5000 }`.
* On final fail: set `documents.status='failed'`, store `error` in `ingestion_runs`.

---

## 5) RAG Query (chat) — retrieval + answer

**At `/chat`**

1. **Spend 1 credit safely** (single DB transaction with a unique `request_id`).
2. **Retrieve** top‑`TOP_K` chunks by cosine similarity from `chunks` where `user_id = currentUser` and (if `scope=document`) `document_id = X`.
3. **Build prompt**: question + quoted snippets (with page labels) + instructions “cite pages; say ‘don’t know’ if not found; be concise”.
4. **Call LLM** (OpenAI) with a small system prompt that enforces citations.
5. **Return** `{ answer, citations: [{document_id, page, preview_text}] }` and save a `messages` row.

**Edge rules**

* If no chunks meet a basic score threshold, return “I don’t have that yet for this document.”
* Cap tokens (max prompt/answer) to control cost.

---

## 6) Generate Document (summary/letter/report)

**At `/generate`**

1. **Spend 5 credits safely**.
2. Retrieve best chunks across the selected scope.
3. Use a **template** (e.g., Summary / Letter / Report). Fill with chunk facts. Keep citations.
4. Return **Markdown** and citations. Frontend can export to PDF.

---

## 7) Credits — never double, never go negative

**Add credits (Stripe webhook)**

* Verify signature. Try to `INSERT INTO webhook_events(id)`. If conflict → ignore (already processed).
* Insert `transactions` with `delta=+50`, `idempotency_key = event_id`.
* `UPSERT` `credits.balance += 50`.

**Spend credits (middleware)**

* Start a transaction:

  * `SELECT balance FROM credits WHERE user_id = ? FOR UPDATE;`
  * If `balance < cost` → rollback with error.
  * `UPDATE credits SET balance = balance - cost;`
  * `INSERT INTO transactions(delta=-cost, reason, idempotency_key=request_id)`.
* Commit. If `idempotency_key` already exists, return the previous result.

---

## 8) Storage — safe by default

* All files in S3 under `user_id/…` prefixes.
* Only accessible via **pre‑signed URLs** that expire.
* Never store public links.
* Keep `page_count` and basic metadata in `documents`.

---

## 9) AuthN & AuthZ — simple and strict

* NextAuth email sign‑in (magic links) or password.
* Every DB query is filtered by `user_id = session.user.id`.
* Never trust client `user_id` in requests; derive from session.

---

## 10) Observability — know what happened

* Log each action with a request ID: upload, ingest start/finish, chat ask, generate, credit add/spend, delete.
* Save to `audit_logs` (minimal fields) and to app logs (Pino).

---

## 11) Rate limits & abuse guards (simple)

* Per user: max N chats/min, M generates/hour.
* Block files over `FILE_MAX_MB`.
* Basic content filter: if prompt is empty or toxic (optional), reject politely.

---

## 12) Deployment baseline

* **Local:** `docker-compose up` (postgres, redis, minio, mailhog). Run apps via pnpm.
* **Cloud v1:** Render/Fly.io for web+api+worker, Neon or RDS for Postgres, Upstash Redis, AWS S3 for storage. Set envs.
* **Cloud v2 (later):** move queue to SQS, workers to Lambda or Fargate, DB to RDS inside VPC, S3 with KMS, Bedrock provider.

---

## 13) HIPAA Track (later switch)

* Swap LLM/Embeddings provider to Bedrock via provider interface.
* Sign BAAs with vendors.
* Turn on CloudTrail/S3/RDS logs, write‑once log bucket.
* S3 lifecycle rules (retention). RDS backups & restore drill.
* Private VPC for DB/workers; least‑privilege roles.
* Incident runbook (freeze → assess → notify → fix → postmortem).

---

## 14) Milestones (each is a tiny, testable outcome)

### M01 — Project boot

* [ ] Monorepo scaffold with workspaces (web/api/worker + shared/db/providers).
* [ ] `.env` validated at startup; app fails fast if missing.
* **Done when:** `pnpm -r dev` starts all apps with a health page.

### M02 — Auth & Header

* [ ] Email sign‑in works (magic link or password).
* [ ] Header shows user name + credits balance.
* [ ] New user auto‑gets `FREE_CREDITS`.
* **Done when:** Two users can log in and see different balances.

### M03 — Upload → Document record → Queue ingest

* [ ] `POST /uploads/presign` returns a working pre‑signed URL.
* [ ] `POST /documents` creates row with `status='processing'` and enqueues `ingest.pdf`.
* **Done when:** Uploading a test PDF creates a card that shows **Processing**.

### M04 — Ingestion worker

* [ ] Worker downloads, extracts text/page count, chunks, embeds, upserts chunks.
* [ ] Marks doc `ready` and writes `ingestion_runs(complete)`.
* **Done when:** Doc flips to **Ready** and chunk count looks reasonable.

### M05 — Chat with citations (spend 1 credit)

* [ ] `/chat` retrieves top‑K chunks and calls LLM.
* [ ] Returns answer + `{document_id, page, preview}` citations.
* [ ] Safely spends 1 credit (single transaction + `request_id`).
* **Done when:** Asking twice fast with 1 credit yields one answer.

### M06 — Generate (spend 5 credits)

* [ ] `/generate` builds a summary/letter/report from best chunks.
* [ ] Returns markdown + citations. Spends 5 credits safely.
* **Done when:** Preview renders, copy/download works on the web.

### M07 — List & Delete

* [ ] `GET /documents` paginates; `DELETE /documents/:id` removes doc + chunks.
* **Done when:** Deleting removes it from the list and DB.

### M08 — Payments (Stripe) with idempotent webhook

* [ ] Checkout link for **50 credits**.
* [ ] Webhook verifies signature, inserts `webhook_events`, mints credits once.
* **Done when:** Replaying the same webhook doesn’t add credits twice.

### M09 — Collections (ask across many docs)

* [ ] Create collection, add/remove docs.
* [ ] Conversations can use `scope='collection'`.
* **Done when:** Chat searches across the collection and cites pages per doc.

### M10 — Share & Export

* [ ] Share link (view‑only) for generated doc or answer thread.
* [ ] Export with citations (PDF/MD on frontend).
* **Done when:** A signed link opens a view‑only page that expires.

### M11 — Admin basics

* [ ] Failed jobs table + **Retry**.
* [ ] Credit adjust with reason (audit log).
* **Done when:** You can recover a stuck file and refund a user.

### M12 — Polish & Guards

* [ ] Rate limits, file size guard, clearer errors.
* [ ] Minimal `audit_logs` for sensitive actions.
* **Done when:** Logs show who did what, when; errors are readable.

---

## 15) Cursor Prompts (copy‑paste tasks)

**Presign upload endpoint (API)**

> Build `POST /uploads/presign` that returns an S3 pre‑signed **PUT** URL. Inputs: filename, size. Limits: reject if size > `FILE_MAX_MB`. Scope key to `user_id/uuid/filename`. Response: `{ url, fields?, key }`. Unit tests for size limit and key scoping.

**Create document & enqueue ingest (API)**

> Build `POST /documents` that writes a `documents` row with `status='processing'` and enqueues a BullMQ job `ingest.pdf` with `{user_id, document_id, s3_key}`. Return the document row.

**Ingestion worker (Worker)**

> Implement `ingest.pdf` consumer: download PDF, extract per‑page text, chunk by tokens (`CHUNK_TOKENS`, overlap `CHUNK_OVERLAP`), embed via OpenAI, upsert into `chunks` with `embedding_version` and `chunk_params`. On success, mark document `ready` and add/update `ingestion_runs` to `complete`. On error after 3 attempts, set document `failed` with the error.

**Vector search (DB package)**

> Write a function `searchChunks({ userId, scope, documentId?, collectionId?, query, k })` that embeds the query and runs a cosine similarity search on `chunks.embedding` (pgvector). Return `{chunkId, page, text, score}`.

**Chat endpoint (API)**

> Implement `POST /chat` that: (1) reserves 1 credit with a transactional deduct using `request_id`, (2) retrieves top‑K chunks, (3) builds a grounded prompt with citations, (4) calls OpenAI chat, (5) saves a `messages` row, (6) returns `{answer, citations}`. If retrieval has no good matches, return a safe “I don’t have that” message and refund the credit.

**Generate endpoint (API)**

> Implement `POST /generate` that spends 5 credits, retrieves relevant chunks, fills a template (Summary/Letter/Report), includes citations, and returns `{ markdown, citations }`. Handle insufficient credits gracefully.

**Stripe webhook (API)**

> Implement `/stripe/webhook`: verify signature, try `INSERT` into `webhook_events(id)`. If conflict → 200 OK; else add 50 credits by inserting a `transactions` row with `idempotency_key=event_id` and updating `credits.balance` in one transaction. Unit test replay safety.

**Auth guard (API)**

> Add middleware that attaches `user_id` from session to request. Reject requests without a session. Ensure all queries filter by `user_id`.

**Frontend Document page (Web)**

> Build `/doc/[id]` with Chat left, Sources right. On Ask, POST to `/chat`, render answer and highlight cited pages. Show credit cost hint under input.

**Buy credits (Web)**

> Add `Buy` button in header → creates Stripe checkout session → redirect. After return, poll `/credits` and show a “50 credits added” toast.

---

## 16) Acceptance Tests (quick and strict)

* Two users: never see each other’s docs.
* Upload → shows Processing → flips to Ready; a failed file shows Failed + Retry.
* Chat spends one credit; double‑click Ask with 1 credit runs once.
* Generate spends five credits; returns markdown with citations.
* Webhook replay doesn’t add credits twice.
* Delete removes doc and chunks.
* Ask something not in docs returns “don’t have that” (no hallucination).
* Refresh: state persists (because it’s in DB/S3, not memory).

---

## 17) What “Done” looks like

* A real user can upload large PDFs, see them processed, ask questions with page proof, generate documents, share/export, and pay for more credits—without surprises.
* You can monitor jobs, fix failures, and adjust credits safely.
* You can later switch providers (LLM/embeddings, storage, queue) without rewriting the app.
