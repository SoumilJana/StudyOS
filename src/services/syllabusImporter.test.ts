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
});
