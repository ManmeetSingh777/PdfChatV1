# PDF Chat App - Complete Milestones

## What Success Looks Like (Step by Step)

### 1. Basic App Setup ✅
**Done when:** 
- App opens in browser without errors
- Header shows "DocChat (Demo)" on left
- Header shows "Credits: 25" on right
- "Buy" button opens popup that adds 50 credits instantly

### 2. Dashboard with Empty State ✅
**Done when:**
- Empty dashboard shows "No documents yet. Upload a PDF or load a sample"
- "Load Sample PDF" button creates sample document instantly
- "Upload" button opens file picker
- Sample loads as "Ready" immediately (no processing time)

### 3. Upload with All States ✅
**Done when:**
- Upload creates card showing "Processing..." with progress bar
- After 7 seconds, card changes to "Ready" 
- Can toggle "fail next upload" to show "Failed" state
- Failed cards show "Retry" button
- Ready cards show file name and "Open" button

### 4. Chat with Proper Guards ✅
**Done when:**
- Clicking "Open" goes to chat page (left chat, right sources)
- Shows note: "Ask = 1 credit. Generate = 5 credits"
- Typing question and Enter sends it
- Clicking "Ask" twice quickly only sends once
- Answer appears with highlighted source pages on right
- Credits go down by exactly 1

### 5. Out of Credits Flow ✅
**Done when:**
- Asking with 0 credits shows "Out of credits" modal
- Modal offers "Buy 50 credits" button
- Buying adds credits and closes modal
- Can now ask questions again

### 6. Generate Document Flow ✅
**Done when:**
- "Generate" button opens modal with Summary/Letter/Report options
- Shows "Include citations" checkbox
- Clicking "Create" with <5 credits shows buy credits modal
- With enough credits: reduces by 5, shows spinner, then preview
- Preview has working "Copy" and "Download" buttons

### 7. Data Persistence ✅
**Done when:**
- Refresh browser: all documents still there
- Credits amount unchanged after refresh
- Chat history remains in documents
- Sample document reappears if deleted and "Load Sample" clicked again

### 8. Delete Documents ✅
**Done when:**
- Cards show "Delete" button on hover
- Delete shows confirm dialog
- Confirming removes card permanently
- Deleted docs stay gone after refresh

## Must-Pass Demo Tests

1. **Upload flow**: Upload → Processing (7s) → Ready → Open works
2. **Failure demo**: Toggle fail → upload shows Failed → Retry works  
3. **Credit guard**: Ask with 1 credit, spam click → only 1 answer, 1 credit spent
4. **Buy credits**: Run out → modal → Buy 50 → header updates → can ask again
5. **Persistence**: Refresh page → docs and credits still there
6. **No hallucination**: Ask about something not in doc → says "I don't have that info"

## Bonus Features (If Time Allows)
- Admin page with failure toggles
- Better error messages
- Dark mode toggle

---

**Final Test:** Open app, load sample, ask question, generate document, delete doc, refresh browser, load sample again - everything should work smoothly without errors.