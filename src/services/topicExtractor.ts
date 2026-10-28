/**
 * Topic Context Extractor & Semantic RAG Engine
 * Intelligently scans course documents to extract targeted context for any given topic.
 */

export interface TopicExtractionResult {
  context: string;
  hasExactMatch: boolean;
  matchScore: number;
  matchedKeywords: string[];
}

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'a', 'an', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by',
  'from', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'but', 'if', 'then', 'else', 'when', 'where', 'why',
  'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'into', 'over', 'overview'
]);

function cleanKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts the most relevant context from full document text for a specific chapter and topic.
 */
export function extractTopicContext(
  fullText: string,
  topicTitle: string,
  chapterTitle?: string,
  maxLength: number = 6000
): TopicExtractionResult {
  if (!fullText || !fullText.trim()) {
    return {
      context: '',
      hasExactMatch: false,
      matchScore: 0,
      matchedKeywords: [],
    };
  }

  // If entire document is shorter than maxLength, return full text
  if (fullText.length <= maxLength) {
    const topicRegex = new RegExp(escapeRegex(topicTitle), 'i');
    const exact = topicRegex.test(fullText);
    const keywords = cleanKeywords(topicTitle);
    const matched = keywords.filter((k) => new RegExp(`\\b${escapeRegex(k)}\\b`, 'i').test(fullText));
    return {
      context: fullText,
      hasExactMatch: exact,
      matchScore: exact ? 100 : matched.length * 15,
      matchedKeywords: matched,
    };
  }

  const topicKeywords = cleanKeywords(topicTitle);
  const chapterKeywords = chapterTitle ? cleanKeywords(chapterTitle) : [];
  const allKeywords = Array.from(new Set([...topicKeywords, ...chapterKeywords]));

  // 1. Break into coherent chunks (sections / paragraphs)
  // Split on double newlines or markdown headings
  const rawParagraphs = fullText.split(/\n\s*\n/);
  const chunks: string[] = [];
  let buffer = '';

  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (buffer.length + trimmed.length < 1200) {
      buffer += (buffer ? '\n\n' : '') + trimmed;
    } else {
      if (buffer) chunks.push(buffer);
      buffer = trimmed;
    }
  }
  if (buffer) chunks.push(buffer);

  if (chunks.length === 0) {
    return {
      context: fullText.slice(0, maxLength),
      hasExactMatch: false,
      matchScore: 0,
      matchedKeywords: [],
    };
  }

  // 2. Score each chunk
  const topicExactRegex = new RegExp(escapeRegex(topicTitle.trim()), 'i');
  let bestIndex = 0;
  let bestScore = -1;
  let bestMatchedKeywords: string[] = [];
  let foundExact = false;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let score = 0;
    const matchedInChunk: string[] = [];

    // Exact topic match
    if (topicExactRegex.test(chunk)) {
      score += 150;
      foundExact = true;
    }

    // Keyword matches
    for (const kw of topicKeywords) {
      const kwRegex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
      if (kwRegex.test(chunk)) {
        score += 35;
        matchedInChunk.push(kw);
      }
    }

    for (const kw of chapterKeywords) {
      const kwRegex = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'i');
      if (kwRegex.test(chunk)) {
        score += 15;
      }
    }

    // Pedagogical keyword bonus (definitions, mechanisms, steps)
    if (/\b(defined as|consists of|steps|phases|mechanism|architecture|protocol|algorithm|formula|attack|defense|vulnerability)\b/i.test(chunk)) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
      bestMatchedKeywords = matchedInChunk;
    }
  }

  // 3. Assemble window surrounding best chunk
  // Include adjacent paragraphs (before and after) to preserve headers, lead-in definitions, and trailing examples
  let startIdx = Math.max(0, bestIndex - 1);
  let endIdx = Math.min(chunks.length - 1, bestIndex + 1);

  // Expand window if size permits
  while (startIdx > 0 && chunks.slice(startIdx, endIdx + 1).join('\n\n').length < maxLength - 1500) {
    startIdx--;
  }
  while (endIdx < chunks.length - 1 && chunks.slice(startIdx, endIdx + 1).join('\n\n').length < maxLength - 1000) {
    endIdx++;
  }

  let assembled = chunks.slice(startIdx, endIdx + 1).join('\n\n');
  if (assembled.length > maxLength) {
    assembled = assembled.slice(0, maxLength);
  }

  return {
    context: assembled,
    hasExactMatch: foundExact,
    matchScore: Math.max(0, bestScore),
    matchedKeywords: bestMatchedKeywords,
  };
}
