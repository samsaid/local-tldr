/**
 * Local TLDR — Extractive Summarization Engine
 *
 * Algorithm:
 *   1. Split text into sentences
 *   2. Tokenize & remove stop words
 *   3. Score words by normalized term frequency
 *   4. Score sentences: avg word score + position bonus + length factor
 *   5. Return top N sentences in original reading order
 */

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','this','that','these','those','i','you','he','she','it',
  'we','they','what','which','who','how','when','where','why','not','no',
  'so','as','if','than','then','also','just','its','our','your','their',
  'there','here','all','each','any','about','up','out','into','over',
  'after','before','more','some','such','very','only','even','still',
  'between','both','own','same','too','well','back','through','during',
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function splitIntoSentences(text) {
  // Common abbreviations that should not trigger a sentence split
  const ABBREVS = /\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Fig|Vol|No|pp|St|Ave|Blvd|approx|est|dept)\s*$/i;

  const raw = text
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n');

  // Merge lines that follow an abbreviation
  const merged = raw.reduce((acc, part) => {
    if (!acc.length) return [part];
    const prev = acc[acc.length - 1];
    if (ABBREVS.test(prev)) {
      acc[acc.length - 1] = prev + ' ' + part;
    } else {
      acc.push(part);
    }
    return acc;
  }, []);

  return merged
    .map(s => s.trim())
    .filter(s => s.length > 25 && tokenize(s).length >= 4);
}

function computeWordFrequency(sentences) {
  const freq = {};
  for (const s of sentences) {
    for (const w of tokenize(s)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }
  const max = Math.max(1, ...Object.values(freq));
  for (const w in freq) freq[w] /= max;
  return freq;
}

function scoreSentence(sentence, wordFreq, idx, total) {
  const words = tokenize(sentence);
  if (words.length === 0) return 0;

  const freqScore = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / words.length;

  // Sentences in the first ~20% of the article tend to be topic-setting
  const positionBonus = idx / total < 0.2 ? 0.15 : 0;

  // Penalise very short fragments and run-on sentences
  const lengthFactor = (words.length < 5 || words.length > 45) ? 0.75 : 1.0;

  return (freqScore + positionBonus) * lengthFactor;
}

/**
 * Main entry point.
 * @param {string} text   — raw page text
 * @param {object} opts
 * @param {number} opts.numSummary   — sentences in the TLDR paragraph (default 3)
 * @param {number} opts.numKeyPoints — bullet points (default 4)
 * @returns {{ tldr: string, keyPoints: string[] }}
 */
function summarize(text, { numSummary = 3, numKeyPoints = 4 } = {}) {
  const sentences = splitIntoSentences(text).slice(0, 800); // cap for huge pages

  if (sentences.length <= 2) {
    const fallback = sentences.join(' ') || text.slice(0, 300);
    return { tldr: fallback, keyPoints: [fallback] };
  }

  const wordFreq = computeWordFrequency(sentences);

  const scored = sentences.map((sentence, idx) => ({
    sentence,
    score: scoreSentence(sentence, wordFreq, idx, sentences.length),
    idx,
  }));

  // Sort by score descending, take top N, then re-sort by original position
  const topForSummary = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, numSummary)
    .sort((a, b) => a.idx - b.idx);

  const topForKeyPoints = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, numKeyPoints)
    .sort((a, b) => a.idx - b.idx);

  return {
    tldr: topForSummary.map(s => s.sentence).join(' '),
    keyPoints: topForKeyPoints.map(s => s.sentence),
  };
}
