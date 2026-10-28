import { describe, it, expect } from 'vitest';
import { extractHierarchyFromSyllabusText } from './syllabusImporter';

describe('Syllabus Importer Service', () => {
  it('extracts course code, title, and module topics from syllabus text', () => {
    const sampleSyllabusText = `
      Course Code: PECCS701I
      Course Title: Ethical Hacking and Penetration Testing
      Credit: 3, Total Contact Hours: 36

      1 Fundamentals of Ethical Hacking
      Key terms and concepts of Ethical Hacking, Hacking Phases, Penetration Testing steps, Threat Modeling, Footprinting and Reconnaissance.

      2 System Hacking & Malware Threats
      Password cracking techniques, Privilege escalation, Trojan, Backdoor, Ransomware concepts, Countermeasures.

      3 Network & Web Application Security
      Packet sniffing, ARP poisoning, SQL injection attacks, Cross-site scripting (XSS), Buffer overflow basics.

      4 Wireless Security & Cryptographic Defenses
      WPA/WPA2/WPA3 protocols, Rogue Access Points, Symmetric and Asymmetric encryption, Digital Signatures, PKI.
    `;

    const res = extractHierarchyFromSyllabusText(sampleSyllabusText, 'Default Title');

    expect(res.courseCode).toBe('PECCS701I');
    expect(res.courseTitle).toBe('Ethical Hacking and Penetration Testing');
    expect(res.modules.length).toBeGreaterThanOrEqual(4);
    expect(res.modules[0].title).toContain('Fundamentals of Ethical Hacking');
    expect(res.modules[0].chapters[0].topics.length).toBeGreaterThanOrEqual(2);
  });

  it('falls back gracefully on unformatted syllabus notes', () => {
    const rawNotes = `
      Computer Networks Revision Notes
      OSI Model vs TCP/IP Protocol Stack
      Routing Information Protocol and OSPF
      Transport Layer Flow Control and Congestion Avoidance
      Application Layer DNS and HTTP/2 Protocols
    `;

    const res = extractHierarchyFromSyllabusText(rawNotes, 'Computer Networks');
    expect(res.courseTitle).toBe('Computer Networks');
    expect(res.modules.length).toBe(4); // 4 balanced auto-generated modules
  });

  it('tests actual Ethical Hacking Syllabus PDF if present', async () => {
    const fs = await import('fs');
    const path = 'c:/Users/skull/Downloads/EthicalHackingPDFs/Ethical Hacking Syllabus_2026.pdf';
    if (fs.existsSync(path)) {
      const { parseUploadedDocument } = await import('./documentExtractor');
      const buf = fs.readFileSync(path);
      const file = new File([buf], 'Ethical Hacking Syllabus_2026.pdf', { type: 'application/pdf' });
      const doc = await parseUploadedDocument(file);
      const hierarchy = extractHierarchyFromSyllabusText(doc.extractedText, 'Ethical Hacking');
      
      expect(hierarchy.courseCode).toBe('PECCS701I');
      expect(hierarchy.courseTitle).toBe('Ethical Hacking');
      expect(hierarchy.modules.length).toBe(5);
      expect(hierarchy.modules[0].title).toContain('Fundamentals of Ethical Hacking');
      expect(hierarchy.modules[1].title).toContain('System and Network Exploitation');
      expect(hierarchy.modules[2].title).toContain('Web and Wireless Hacking');
      expect(hierarchy.modules[3].title).toContain('Advanced Techniques and Countermeasures');
      expect(hierarchy.modules[4].title).toContain('AI in Cybersecurity');
    }
  });

  it('supports multi-file course setup and enforces limits', async () => {
    const { setupCourseFromSyllabus, UPLOAD_LIMITS } = await import('./syllabusImporter');
    
    expect(UPLOAD_LIMITS.MAX_FILES).toBe(10);
    expect(UPLOAD_LIMITS.MAX_FILE_SIZE_MB).toBe(30);

    const file1 = new File(['Course Code: CS101\nModule 1 Introduction to AI'], 'syllabus.txt', { type: 'text/plain' });
    const file2 = new File(['Module 2 Deep Learning and Neural Nets'], 'unit2.txt', { type: 'text/plain' });

    const result = await setupCourseFromSyllabus([file1, file2], '2026-11-30', 'Artificial Intelligence', 'CS101');
    expect(result.subject.name).toBe('Artificial Intelligence');
    expect(result.resources?.length).toBe(2);

    // Test rejection when exceeding max files
    const tooManyFiles = Array.from({ length: 11 }, (_, i) => new File(['note'], `note-${i}.txt`, { type: 'text/plain' }));
    await expect(setupCourseFromSyllabus(tooManyFiles, '2026-11-30')).rejects.toThrow(/Maximum 10 files allowed/i);
  });

  it('never extracts document header markers or orphaned conjunctions as topics, and generates grounded flashcards', async () => {
    const { setupCourseFromSyllabus } = await import('./syllabusImporter');
    const dirtyText = `
      === DOCUMENT 1: Ethical_Hacking_Course_Plan.pdf ===
      Course Code: EH101
      Course Title: Ethical Hacking Defense
      1 Network Defense & Security Breaches
      Network reconnaissance strategies, and security breaches in computers, defense in depth.
      === DOCUMENT 2: Notes.pdf ===
      2 Exploitation Analysis
      Buffer overflow vulnerabilities, cross-site scripting prevention.
    `;

    const file = new File([dirtyText], 'Ethical_Hacking_Course_Plan.pdf', { type: 'text/plain' });
    const result = await setupCourseFromSyllabus([file], '2026-12-15', 'Ethical Hacking Defense', 'EH101');

    // Verify topics do not contain "pdf ===" or start with "and "
    const allTopics = result.subject.modules.flatMap((m) => m.chapters.flatMap((c) => c.topics));
    allTopics.forEach((t) => {
      expect(t.title).not.toContain('===');
      expect(t.title).not.toContain('.pdf');
      expect(t.title).not.toMatch(/^and\s+/i);
    });

    // Verify flashcards are grounded and never contain the generic boilerplate
    result.flashcards.forEach((c) => {
      expect(c.front).not.toContain('pdf ===');
      expect(c.front).not.toContain('of and ');
      expect(c.back).not.toContain('Understanding this mechanism is essential for vulnerability discovery, mitigation analysis, and exam scenarios.');
    });
  });
});
