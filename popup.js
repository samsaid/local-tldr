document.addEventListener('DOMContentLoaded', async () => {
  // Chrome can keep the popup page alive in memory between opens.
  // Check if the active tab has changed since the last summary and wipe if so.
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const lastUrl = sessionStorage.getItem('summarizedUrl');
  if (lastUrl && lastUrl !== tab?.url) {
    clearResults();
  }

  document.getElementById('summarize-btn').addEventListener('click', handleSummarize);
  document.getElementById('copy-btn').addEventListener('click', handleCopy);
});

// ─── Orchestration ────────────────────────────────────────────────────────────

async function handleSummarize() {
  setState('loading');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) throw new Error('No active tab found.');

    if (isRestrictedUrl(tab.url)) {
      throw new Error(
        "Local TLDR can't run on Chrome system pages. Navigate to a regular webpage and try again."
      );
    }

    const content = await extractFromTab(tab.id);

    if (!content.text || content.text.trim().length < 100) {
      throw new Error(
        "Not enough readable text found on this page. It may be an app, login screen, or mostly images."
      );
    }

    const len = content.text.length;
    const numSummary = len < 800 ? 1 : len < 3000 ? 2 : 3;
    const result = summarize(content.text, { numSummary, numKeyPoints: 4 });
    const acronyms = findAcronyms(content.text);
    displayResults(content.title, result);
    displayAcronyms(acronyms);
    setState('results');
    sessionStorage.setItem('summarizedUrl', tab.url);

  } catch (err) {
    displayError(friendlyError(err.message));
    setState('error');
  }
}

// ─── Tab Communication ────────────────────────────────────────────────────────

async function extractFromTab(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
  } catch (err) {
    throw new Error("Couldn't inject into this page. Try refreshing it.");
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_CONTENT' }, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Content extraction failed.'));
      }
    });
  });
}

// ─── DOM Updates ──────────────────────────────────────────────────────────────

function displayResults(title, { tldr, keyPoints }) {
  document.getElementById('page-title').textContent = title || 'Untitled page';
  document.getElementById('tldr-text').textContent = tldr;

  const ul = document.getElementById('key-points');
  ul.innerHTML = '';
  keyPoints.forEach(point => {
    const li = document.createElement('li');
    li.textContent = point;
    ul.appendChild(li);
  });
}

function displayAcronyms(acronyms) {
  const card = document.getElementById('acronyms-card');
  const dl   = document.getElementById('acronyms-list');
  dl.innerHTML = '';

  if (acronyms.length === 0) {
    card.classList.add('hidden');
    return;
  }

  acronyms.forEach(({ term, definition }) => {
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = definition;
    dl.appendChild(dt);
    dl.appendChild(dd);
  });

  card.classList.remove('hidden');
}

function displayError(message) {
  document.getElementById('error-msg').textContent = message;
}

/**
 * States: 'idle' | 'loading' | 'results' | 'error'
 */
function setState(state) {
  setVisible('summarize-btn', state !== 'loading');
  setVisible('loading',       state === 'loading');
  setVisible('results',       state === 'results');
  setVisible('error',         state === 'error');

  if (state === 'results' || state === 'error') {
    document.getElementById('summarize-btn').textContent = 'Summarize Again';
  } else {
    document.getElementById('summarize-btn').textContent = 'Summarize Page';
  }
}

function setVisible(id, visible) {
  document.getElementById(id).classList.toggle('hidden', !visible);
}

function clearResults() {
  setState('idle');
  document.getElementById('page-title').textContent = '';
  document.getElementById('tldr-text').textContent = '';
  document.getElementById('key-points').innerHTML = '';
  document.getElementById('acronyms-list').innerHTML = '';
  document.getElementById('acronyms-card').classList.add('hidden');
  document.getElementById('error-msg').textContent = '';
  sessionStorage.removeItem('summarizedUrl');
}

// ─── Copy to Clipboard ────────────────────────────────────────────────────────

async function handleCopy() {
  const title  = document.getElementById('page-title').textContent;
  const tldr   = document.getElementById('tldr-text').textContent;
  const points = [...document.querySelectorAll('#key-points li')]
    .map(li => `• ${li.textContent}`)
    .join('\n');

  const text = `${title}\n\nTLDR\n${tldr}\n\nKey Points\n${points}`;

  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy Summary';
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    // Clipboard API may be unavailable in some extension contexts
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRestrictedUrl(url) {
  if (!url) return true;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('devtools://')
  );
}

function friendlyError(msg) {
  if (msg.includes('Cannot access') || msg.includes('Frame'))
    return "Local TLDR can't access this page. Try refreshing.";
  if (msg.includes('No active tab'))
    return "Couldn't find the active tab. Try closing and reopening the extension.";
  return msg;
}
