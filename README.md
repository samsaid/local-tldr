# Local TLDR

> A privacy-first Chrome Extension that summarizes any webpage locally — no AI APIs, no backend, no data leaves your machine.
Demo Screenshots:
> <img width="385" height="581" alt="Screenshot 2026-05-22 at 3 50 32 PM" src="https://github.com/user-attachments/assets/5226b9f5-1e8d-4f90-b974-2afe7032eadf" />
<img width="386" height="579" alt="Screenshot 2026-05-22 at 3 50 38 PM" src="https://github.com/user-attachments/assets/69febc76-ab5d-42bf-aae5-bfe9dc12f64e" />

---

## Quick Start

### 1. Get the files
```
local-tldr/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
└── summarizer.js
```

### 2. (Optional) Add Mozilla Readability for better extraction
Readability improves content extraction on complex pages (news, blogs, docs). Without it the extension still works well via its own extractor.

```bash
# Download the single-file build from the official repo releases:
# https://github.com/mozilla/readability/releases
# Place it at:  local-tldr/lib/readability.js

# Then add this to manifest.json → content_scripts if you use it:
# "js": ["lib/readability.js", "content.js"]
```

### 3. Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top-right switch)
3. Click **Load unpacked**
4. Select the `local-tldr/` folder
5. Pin the extension for easy access
6. Navigate to any article or internal doc page and click the icon

---

## How It Works

### Page Extraction (`content.js`)
When you click **Summarize Page**, the extension injects `content.js` into the active tab. It:
1. Tries Mozilla Readability (if present) for clean article text
2. Falls back to manual DOM extraction:
   - Removes noise: `<nav>`, `<footer>`, ads, cookie banners, `aria-hidden` elements
   - Finds the main content area via semantic selectors (`<article>`, `<main>`, `[role="main"]`, common class names)
   - Collects text from `<p>`, `<h1-h4>`, `<li>`, `<blockquote>` elements
   - Caps at ~20,000 characters to keep processing fast

### Summarization Algorithm (`summarizer.js`)
Pure extractive summarization — no neural nets, no API calls:

1. **Sentence splitting** — regex-based split on `.!?` boundaries with abbreviation protection (`Mr.`, `Dr.`, `e.g.`, etc.)
2. **Tokenization** — lowercase, strip punctuation, remove ~60 English stop words
3. **Term Frequency scoring** — count each content word across all sentences, normalize to [0, 1] by dividing by the max count
4. **Sentence scoring** — for each sentence:
   - Average TF score of its content words (rewards sentences using the page's key vocabulary)
   - +0.15 position bonus for sentences in the first 20% (introductory sentences are usually topic-setting)
   - ×0.75 length penalty for fragments (<5 words) or run-ons (>45 words)
5. **Selection** — top 3 sentences (by score) reassembled in original reading order → **TLDR paragraph**; top 4 sentences → **Key Points**

This approach is O(n) in sentences and runs in <10ms even on long pages.

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| Chrome system page (`chrome://…`) | Friendly error shown before injection attempt |
| Too little text (<100 chars) | "Not enough text" error |
| Page not yet loaded / restricted | Friendly "try refreshing" error |
| Huge page (>20k chars) | Text capped; first 800 sentences processed |
| Multiple clicks | Injection guard prevents duplicate listeners |
| No readable content area | Falls back to all `<p>` tags in body |

---

## Hackathon Pitch

**The problem:** Employees constantly hit internal wikis, runbooks, and long documentation pages. Reading everything takes time they don't have.

**The solution:** Local TLDR gives you the key points of any internal page in under a second — right in the browser, with zero privacy risk. No content ever leaves the machine, which makes it safe for enterprise environments where sending page content to an external LLM API is a non-starter.

**Why it's different:** Most summarizer extensions send your page content to OpenAI or a proprietary backend. Local TLDR is entirely client-side: a deterministic NLP algorithm that runs in the browser tab itself.

**Demo:** Open any Wikipedia article or internal Confluence page → click the extension icon → click "Summarize Page" → instant TLDR.

---

## Future Improvements

- **Adjustable summary length** — slider for 1–6 sentences
- **Reading time estimate** — "5 min read → 30 sec TLDR"
- **History panel** — list of recently summarized pages (stored in `chrome.storage.local`)
- **Export to Markdown / Notion** — one-click copy in formatted markdown
- **Highlight mode** — highlight the key sentences directly on the page
- **Custom stop word list** — enterprise-specific jargon aware mode
- **Offline Readability bundle** — ship `readability.js` in the extension directly
- **Multi-language support** — stop word lists for other languages
- **WebAssembly summarizer** — faster, heavier NLP (e.g. TextRank graph algorithm)
