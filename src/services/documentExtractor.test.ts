import { describe, it, expect } from 'vitest';
import { generateContentHash, detectResourceType } from './documentExtractor';

describe('Document Extractor Utility', () => {
  it('detects resource types correctly from file extensions', () => {
    expect(detectResourceType('Syllabus_2026.pdf')).toBe('pdf');
    expect(detectResourceType('LectureNotes.docx')).toBe('docx');
    expect(detectResourceType('Notes.md')).toBe('markdown');
    expect(detectResourceType('Solution.py')).toBe('code');
    expect(detectResourceType('Script.ts')).toBe('code');
    expect(detectResourceType('Summary.txt')).toBe('note');
  });

  it('generates consistent content hashes for deduplication', () => {
    const text = 'Ethical Hacking Module 1 Introduction and Footprinting';
    const hash1 = generateContentHash(text, 1024);
    const hash2 = generateContentHash(text, 1024);
    const hash3 = generateContentHash(text + ' extra', 1024);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1.startsWith('hash-')).toBe(true);
  });
});
