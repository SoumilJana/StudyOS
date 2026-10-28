import { describe, it, expect } from 'vitest';
import { extractTopicContext } from './topicExtractor';

describe('Topic Context Extractor & Semantic RAG', () => {
  const sampleDocument = `
=== MODULE 1: INTRODUCTION TO ETHICAL HACKING ===
Information security fundamentals, CIA triad, and attack surfaces.

=== MODULE 2: FOOTPRINTING AND RECONNAISSANCE ===
Techniques for OSINT, search engine discovery, and network perimeter mapping.

=== MODULE 3: SYSTEM HACKING & PASSWORD CRACKING ===
In this chapter, password cracking is analyzed from both offensive and defensive viewpoints.
Password cracking techniques include dictionary attacks, brute-force attacks, rainbow table lookups, and hybrid attacks.
Privilege escalation follows: horizontal privilege escalation occurs when a user gains permissions of another equal user,
while vertical privilege escalation elevates standard user privileges to administrator or SYSTEM privileges.

=== MODULE 4: NETWORK THREATS & ARP SPOOFING ===
ARP spoofing (or ARP cache poisoning) involves transmitting forged ARP messages across a local area network.
This allows an attacker to intercept frames, modify traffic, or launch man-in-the-middle (MITM) attacks.
Defenses against ARP spoofing include static ARP inspection (DAI) and dynamic monitoring on managed switches.
  `;

  it('accurately locates and extracts the section matching the topic title', () => {
    const result = extractTopicContext(sampleDocument, 'Password Cracking', 'System Hacking', 2000);

    expect(result.hasExactMatch).toBe(true);
    expect(result.context).toContain('Password cracking techniques include dictionary attacks');
    expect(result.context).toContain('Privilege escalation');
    expect(result.matchedKeywords).toContain('password');
    expect(result.matchedKeywords).toContain('cracking');
  });

  it('extracts ARP spoofing context when requested', () => {
    const result = extractTopicContext(sampleDocument, 'ARP Spoofing', 'Network Threats', 2000);

    expect(result.hasExactMatch).toBe(true);
    expect(result.context).toContain('ARP spoofing (or ARP cache poisoning)');
    expect(result.context).toContain('man-in-the-middle');
    expect(result.context).toContain('static ARP inspection');
  });

  it('handles empty or short documents gracefully', () => {
    const emptyResult = extractTopicContext('', 'Any Topic');
    expect(emptyResult.context).toBe('');
    expect(emptyResult.hasExactMatch).toBe(false);

    const shortDoc = 'Short note about mitosis and cell division.';
    const shortResult = extractTopicContext(shortDoc, 'Mitosis', 'Biology', 1000);
    expect(shortResult.hasExactMatch).toBe(true);
    expect(shortResult.context).toBe(shortDoc);
  });
});
