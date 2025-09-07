# Clickable Prototype Spec — PDF Q\&A App (Cursor)

**Goal (one line):** A click-through web app that *feels* like the real product: upload PDFs, see them “process”, ask questions with visible sources, generate a summary doc, and spend credits — all mocked so you can demo today.

> Keep it baby-simple. No real AI, no real AWS. Everything is simulated in the browser so it cannot break during the demo.

---

## 0) Boundaries (so we don’t overbuild)

* **No real login** (optional fake user).
* **No servers** — run locally or on a static host.
* **No real vector DB** — we fake “chunks” and “search”.
* **Credits are just a number** in local storage.
* **Uploads are fake** — we “process” with a spinner and a timer.

---

## 1) App Idea (in one paragraph)

A user lands on a dashboard, adds a PDF (fake or sample). The file shows a **Processing** state that flips to **Ready**. Clicking a file opens a **Chat** page where the user asks questions, the app shows an answer and **which pages** it came from. The user can hit **Generate Document** to get a one-page summary. Each action costs **credits**. A **Buy Credits** button adds more (fake purchase). Admin toggles let you simulate failures.

---

## 2) User Flow (screen → action → result)

1. **Landing / Dashboard**

   * Sees: “My Documents” (cards list), **Credits** badge (e.g., `42`), and **Upload** button.
   * Click **Upload** → choose a PDF (or pick a sample if no file).
   * App adds a new card with `Processing…` state and a progress bar.
   * After \~7 seconds, state flips to **Ready** (or **Failed** if you toggle failure mode).

2. **Open a Document** (click a ready card)

   * Goes to **Document Workspace** with **Chat** on the left and **Sources** on the right.
   * Types a question → clicks **Ask**.
   * App decreases **credits by 1**, shows an **Answer** and **Citations** (e.g., “Page 2, Page 5”).

3. **Generate Document** (top-right button)

   * Click **Generate** → modal with options: Summary / Letter / Report.
   * On confirm, credits −5, spinner, then shows a preview and **Download** (fake PDF link, or Markdown).

4. **Buy Credits**

   * From header or empty-credits toast → **Buy 50 Credits** button.
   * Click adds credits +50 (show success toast). (Fake checkout.)

5. **Admin (optional)**

   * Toggle **“Make next upload fail”**, **“Make next chat slow”** to simulate edge cases.

---

## 3) UI/UX (keep friction near zero)

**Common UI rules**

* One primary action per screen (bright button).
* Always show credits in the header.
* Use toasts for success/error; don’t block the user unless necessary.
* Empty states that teach: show a sample PDF and a sample question.

**Screens & components**

### A) Header

* Left: App name `DocChat (Demo)`
* Center: none
* Right: `Credits: 42` | `Buy` (button)

### B) Dashboard

* **Upload** button (primary)
* **Document cards** (grid)

  * States: `Processing`, `Ready`, `Failed`
  * Each card shows: title, pages (fake count), status pill, last updated time
  * Card actions (hover): `Open`, `Delete`
* Empty state text: “No documents yet. Try a sample file → \[Load Sample].”

### C) Upload Modal

* File picker + a `Use sample PDF` link
* On confirm: close modal → add a card in `Processing…`
* Progress bar animates (fake). Tooltip: “We’re extracting text and making notes.”

### D) Document Workspace

* **Left panel (Chat)**

  * Chat history list
  * Input box with placeholder: “Ask about this document…”
  * Buttons: `Ask` (primary), `Generate` (secondary)
  * Small text: “Cost: Ask = 1 credit, Generate = 5 credits.”
* **Right panel (Sources)**

  * Collapsible list: `Page 1`, `Page 2` … each expands to show a paragraph snippet
  * When an answer appears, highlight the cited pages
* **Empty chat hint:** “Try: ‘Give me a 3-bullet summary of page 2.’”

### E) Generate Modal

* Radio: `Summary` / `Letter` / `Report`
* Checkbox: `Include citations`
* `Create` button → spinner → Show result with `Copy` and `Download` (fake)

### F) Buy Credits Modal

* Explanation: “This is a demo. Click to add 50 credits.”
* `Add 50 credits` → success toast

### G) Admin Panel (optional)

* Toggles: `Next upload fails`, `Next chat slow`
* Table of events (log): time, action, user (always you)

---

## 4) Technical Flow (mocked — simple and predictable)

**State storage:** Use `localStorage` keys:

* `docs` → array of documents
* `credits` → number
* `settings` → feature toggles (e.g., failNextUpload)

**Document object shape**

```json
{
  "id": "doc_abc123",
  "title": "Contract.pdf",
  "pages": 9,
  "status": "processing|ready|failed",
  "chunks": [
    { "page": 1, "text": "…" },
    { "page": 2, "text": "…" }
  ],
  "createdAt": 1735831200000,
  "updatedAt": 1735831230000
}
```

**Upload simulation**

* Add a doc with `status=processing`, empty `chunks`.
* Start a 7s timer. If `settings.failNextUpload=true`, set to `failed` else to `ready`.
* When flipping to `ready`, generate fake chunks: 6–12 snippets, random pages.

**Chat simulation**

* On `Ask`, if `credits <= 0` → open `Buy` modal.
* Else **credits −= 1**.
* “Search”: pick 2–3 chunks that contain **any** keyword from the question (basic match) or random if none.
* Answer = template: “Here’s what I found…” + combine those chunk texts.
* Citations = pages of those chunks.

**Generate simulation**

* On `Create`, if `credits < 5` → prompt to buy.
* Else **credits −= 5**.
* Output = join top 5 chunks into a clean markdown section. Provide `Copy` and a fake `Download` link (`data:` URL).

**Delete document**

* Soft delete (remove from list). Confirm with a simple dialog.

**Admin toggles**

* `failNextUpload`: boolean, auto-resets after one use.
* `slowChat`: adds 3–5 seconds delay before showing an answer.

---

## 5) File/Folder Layout (Next.js + Tailwind; works in Cursor)

```
app/
  layout.tsx          # header, toasts, credits provider
  page.tsx            # dashboard
  admin/page.tsx      # optional admin
  doc/[id]/page.tsx   # document workspace (chat + sources)
components/
  UploadButton.tsx
  DocCard.tsx
  ChatPanel.tsx
  SourcesPanel.tsx
  GenerateModal.tsx
  BuyCreditsModal.tsx
  ConfirmDialog.tsx
lib/
  store.ts            # localStorage read/write helpers
  fakeIngest.ts       # timers + fake chunk generation
  fakeSearch.ts       # keyword match
  credits.ts          # add/spend with guards
styles/
  globals.css
```

---

## 6) Minimal Data Helpers (pseudocode)

**store.ts**

* `getDocs()`, `setDocs(docs)`
* `getCredits()`, `setCredits(n)`
* `getSettings()`, `setSettings(s)`

**credits.ts**

* `ensureCredits(n, onInsufficient)` → open modal if not enough
* `spend(n)` → subtract and save
* `add(n)` → add and save

**fakeIngest.ts**

* `startIngest(doc)` → set status `processing` → `setTimeout` → set to `ready` + attach `fakeChunks()`
* `fakeChunks()` → return array of `{page, text}` snippets (hardcoded samples)

**fakeSearch.ts**

* `search(chunks, question)` → return 2–3 chunks with word overlaps; else random

---

## 7) Copy (ready-to-use microcopy)

* Empty dashboard: “No documents yet. Upload a PDF or load a sample.”
* Upload help: “We extract text and make quick notes so answers are grounded.”
* Processing: “Making notes…”
* Ready: “Open”
* Failed: “Failed to process. Try again.”
* Chat placeholder: “Ask about this document…”
* Not enough credits: “You’re out of credits. Add 50 to continue.”
* Generate modal subtitle: “Pick a format. We’ll keep it short and clear.”
* Toasts: `Added 50 credits`, `1 credit used`, `5 credits used`, `Document created`.

---

## 8) Milestones (each with a pass/fail test)

1. **Scaffold & Header**

   * Done when: App runs, header shows credits (default 25), Buy opens modal.
2. **Dashboard & Upload**

   * Done when: Upload creates a `Processing` card that flips to `Ready` in \~7s.
3. **Document Workspace**

   * Done when: Clicking a `Ready` card opens Chat + Sources; keyboard `Enter` submits.
4. **Chat Answer + Citations**

   * Done when: Asking a question reduces credits by 1 and highlights 2–3 source pages.
5. **Generate Document**

   * Done when: Create → credits −5 → preview + copy/download link appear.
6. **Buy Credits Flow**

   * Done when: “Add 50 credits” updates header and persists after refresh.
7. **Admin Toggles** (optional)

   * Done when: Toggling failure makes next upload fail; slow chat delays answer.

---

## 9) Demo Script (60 seconds)

1. “Here’s my dashboard. I’ll add a PDF.” (Shows Processing → Ready.)
2. “Open it and ask a question.” (Answer + citations appear; credits drop.)
3. “Generate a summary.” (Spinner → result; credits drop.)
4. “Out of credits? One click to add more.” (Buy 50.)
5. “It even handles failures gracefully.” (Toggle a failure, show message.)

---

## 10) Stretch (only if time left)

* Real file parsing for plaintext PDFs in-browser.
* Export generated doc to a real `.pdf` file.
* Save multiple users via local profiles.
* Dark mode toggle.

---

## 11) Cursor Build Order (copy-paste as TODOs)

1. Create Next.js app with Tailwind. Add header with credits state (local storage). Add Buy modal.
2. Dashboard page: empty state → Upload button → fake ingest timer → card states.
3. Document page: chat UI + sources panel; wire fake search.
4. Spend credits on Ask and Generate; block if not enough.
5. Generate modal → build markdown result → show copy/download.
6. Admin page: toggles that affect next action.

---

## 12) Acceptance—No-Drama Checks

* Refresh the browser: docs and credits persist.
* Ask twice quickly with 1 remaining credit: only one answer happens.
* Open from a clean browser profile: you see a fresh account (no previous docs).
* Delete a doc: it disappears and stays gone after refresh.

---

**End.** Paste these sections into Cursor issues or a Notion page and implement top-to-bottom. Keep every screen one big primary action, clear toasts, and visible credits.


