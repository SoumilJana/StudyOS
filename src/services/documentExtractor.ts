import * as pdfjsLib from 'pdfjs-dist';
import { ResourceType, ExtractedSection } from '../types';

// Set worker source for browser environment
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch {
    // Worker fallback
  }
}

export interface ExtractedDocument {
  title: string;
  type: ResourceType;
  fileSize: number;
  fileHash: string;
  extractedText: string;
  sections: ExtractedSection[];
  pageCount?: number;
  wordCount: number;
}

/**
 * Fast string hashing for deduplication
 */
export function generateContentHash(str: string, size: number): string {
  let hash = 0;
  for (let i = 0; i < Math.min(str.length, 5000); i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash-${Math.abs(hash).toString(36)}-${size}`;
}

/**
 * Detect resource type from filename extension
 */
export function detectResourceType(fileName: string): ResourceType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'docx';
    case 'md':
    case 'markdown':
      return 'markdown';
    case 'py':
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'c':
    case 'cpp':
    case 'java':
    case 'rs':
    case 'go':
    case 'html':
    case 'css':
    case 'sql':
    case 'json':
      return 'code';
    case 'txt':
    case 'rtf':
    default:
      return 'note';
  }
}

/**
 * Extract text from a PDF File or ArrayBuffer
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<{ text: string; sections: ExtractedSection[]; pageCount: number }> {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/standard_fonts/`,
    });
    const doc = await loadingTask.promise;
    const pageCount = doc.numPages;
    const sections: ExtractedSection[] = [];
    const fullTextParts: string[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0);
      const pageText = pageStrings.join(' ');

      if (pageText.trim()) {
        fullTextParts.push(`--- Page ${pageNum} ---\n${pageText}`);
        sections.push({
          heading: `Page ${pageNum}`,
          page: pageNum,
          content: pageText.slice(0, 500),
        });
      }
    }

    const text = fullTextParts.join('\n\n');
    return { text, sections, pageCount };
  } catch (err) {
    console.warn('PDF.js extraction error, attempting raw text stream recovery:', err);
    // Raw text stream fallback for binary PDFs
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const raw = decoder.decode(arrayBuffer);
    // Extract stream blocks or visible ASCII
    const textMatches = raw.match(/\[(.*?)\]|BT[\s\S]*?ET|\((.*?)\)/g) || [];
    const recovered = textMatches
      .map((s) => s.replace(/[^a-zA-Z0-9\s.,;:!?'"()_-]/g, ' ').trim())
      .filter((s) => s.length > 3)
      .join(' ');

    return {
      text: recovered.slice(0, 10000) || 'PDF content parsed (text stream encoded).',
      sections: [{ heading: 'Extracted Document', page: 1, content: recovered.slice(0, 500) }],
      pageCount: 1,
    };
  }
}

/**
 * Extract text from DOCX (unzipping XML / text stream)
 */
export async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const raw = decoder.decode(arrayBuffer);
  // Match XML paragraphs (<w:t> tags in Word docx)
  const xmlMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
  if (xmlMatches && xmlMatches.length > 0) {
    return xmlMatches
      .map((tag) => tag.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  return raw.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\n\r\t]/g, ' ').slice(0, 25000);
}

/**
 * Universal Document Parser for browser File objects
 */
export async function parseUploadedDocument(file: File): Promise<ExtractedDocument> {
  const type = detectResourceType(file.name);
  const fileSize = file.size;
  const title = file.name.replace(/\.[^/.]+$/, '');
  let extractedText = '';
  let sections: ExtractedSection[] = [];
  let pageCount: number | undefined = undefined;

  if (type === 'pdf') {
    const buffer = await file.arrayBuffer();
    const result = await extractTextFromPdf(buffer);
    extractedText = result.text;
    sections = result.sections;
    pageCount = result.pageCount;
  } else if (type === 'docx') {
    const buffer = await file.arrayBuffer();
    extractedText = await extractTextFromDocx(buffer);
    sections = [{ heading: title, content: extractedText.slice(0, 500) }];
  } else {
    // Markdown, Code, Plain Text, Notes
    extractedText = await file.text();
    // Generate sections from markdown headings if present
    const headings = extractedText.match(/^#{1,3}\s+(.+)$/gm);
    if (headings) {
      sections = headings.map((h, i) => ({
        heading: h.replace(/^#+\s*/, ''),
        page: i + 1,
        content: `Section: ${h}`,
      }));
    } else {
      sections = [{ heading: title, content: extractedText.slice(0, 500) }];
    }
  }

  const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;
  const fileHash = generateContentHash(extractedText, fileSize);

  return {
    title,
    type,
    fileSize,
    fileHash,
    extractedText,
    sections,
    pageCount,
    wordCount,
  };
}
