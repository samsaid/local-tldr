// Injection guard — safe to executeScript multiple times
if (!window.__localTldrLoaded) {
  window.__localTldrLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== 'EXTRACT_CONTENT') return false;

    try {
      sendResponse({ success: true, data: extractPageContent() });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return false; // synchronous response
  });
}

function extractPageContent() {
  const title = document.title || '';

  // Use Mozilla Readability if it was loaded alongside this script
  if (typeof Readability !== 'undefined') {
    try {
      const clone = document.cloneNode(true);
      const article = new Readability(clone).parse();
      if (article && article.textContent && article.textContent.length > 150) {
        return {
          title: article.title || title,
          text: cleanText(article.textContent),
          method: 'readability',
        };
      }
    } catch (_) { /* fall through */ }
  }

  return { title, text: extractManually(), method: 'manual' };
}

function extractManually() {
  const NOISE_SELECTORS = [
    'script', 'style', 'noscript', 'iframe',
    'nav', 'header', 'footer', 'aside',
    '[role="navigation"]', '[role="banner"]', '[role="complementary"]', '[role="dialog"]',
    '[aria-hidden="true"]',
    '.cookie-banner', '.cookie-notice', '.cookie-bar',
    '.ad', '.ads', '.advertisement', '.advert',
    '.sidebar', '.widget', '.social-share',
  ].join(', ');

  const bodyClone = document.body.cloneNode(true);
  bodyClone.querySelectorAll(NOISE_SELECTORS).forEach(el => el.remove());

  // Find the most content-rich semantic region
  const CONTENT_SELECTORS = [
    'article',
    'main',
    '[role="main"]',
    '.article', '.post', '.entry', '.content',
    '#article', '#main', '#content', '#post',
  ];

  let contentEl = null;
  for (const sel of CONTENT_SELECTORS) {
    const el = bodyClone.querySelector(sel);
    if (el && el.innerText && el.innerText.length > 200) {
      contentEl = el;
      break;
    }
  }

  // Fall back to the full (de-noised) body
  const source = contentEl || bodyClone;

  const chunks = [...source.querySelectorAll('p, h1, h2, h3, h4, li, blockquote, td')]
    .map(el => el.textContent.trim())
    .filter(t => t.length > 30);

  return cleanText(chunks.join(' '));
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .slice(0, 20000); // ~15–20k chars is plenty; keep memory low
}
