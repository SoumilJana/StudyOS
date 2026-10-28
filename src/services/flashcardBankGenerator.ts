import { Subject, Module, Topic, Flashcard, FlashcardDeck } from '../types';
import { extractTopicContext } from './topicExtractor';

interface CuratedFlashcardTemplate {
  pattern: RegExp;
  front: string;
  back: string;
  format?: 'basic' | 'concept' | 'code' | 'formula';
}

export const CURATED_SECURITY_FLASHCARDS: CuratedFlashcardTemplate[] = [
  // Module 1: Fundamentals & Reconnaissance
  {
    pattern: /kill chain/i,
    front: 'What are the 7 chronological phases of the Lockheed Martin Cyber Kill Chain?',
    back: '1. Reconnaissance (Harvesting email addresses, OSINT)\n2. Weaponization (Coupling exploit with backdoor)\n3. Delivery (Transmitting payload via phishing or USB)\n4. Exploitation (Triggering vulnerability on target)\n5. Installation (Installing malware/implant)\n6. Command & Control (C2 beaconing channel)\n7. Actions on Objectives (Data exfiltration, ransomware).',
    format: 'concept',
  },
  {
    pattern: /reconnaissance|footprinting/i,
    front: 'Distinguish between Passive Reconnaissance and Active Reconnaissance with concrete examples.',
    back: '• Passive Recon: Gathers intelligence without sending any packets directly to the victim network. Examples: WHOIS queries, DNS harvesting, Google Dorking, Shodan, LinkedIn OSINT.\n• Active Recon: Directly interacts with and probes target hosts. Examples: Nmap port scanning, banner grabbing, directory brute-forcing, SNMP enumeration. Carries detection risk in IDS/firewall logs.',
    format: 'concept',
  },
  {
    pattern: /legal aspects|types of hackers|rules of engagement/i,
    front: 'What is a "Rules of Engagement" (RoE) document and why is it legally required for ethical hacking?',
    back: 'The RoE (and Letter of Authorization) is a signed legal agreement that defines the explicit boundaries of security testing:\n• Allowed target IP ranges, domains, and prohibited systems\n• Approved testing windows (e.g., off-peak hours)\n• Permitted exploit intensity (e.g., no DoS/destructive actions)\n• Emergency contact points.\nWithout this signed authorization, penetration testing constitutes an illegal cybercrime under the Computer Fraud and Abuse Act (CFAA) / IT Act.',
    format: 'concept',
  },
  {
    pattern: /threat|threats.*vulnerabilit/i,
    front: 'Contrast the terms: Vulnerability, Threat, and Exploit.',
    back: '• Vulnerability: An architectural flaw, code defect, or misconfiguration in a system (e.g., unpatched Apache server).\n• Threat: A potential danger or malicious actor that could leverage a vulnerability (e.g., ransomware syndicate).\n• Exploit: The specific malicious code, technique, or sequence used to take advantage of a vulnerability to compromise system integrity, availability, or confidentiality.',
    format: 'concept',
  },
  {
    pattern: /hacking phases|ethical hacking/i,
    front: 'What are the 5 standard phases of the Ethical Hacking Methodology?',
    back: '1. Reconnaissance & Footprinting (OSINT, scope discovery)\n2. Scanning & Enumeration (Port status, OS fingerprinting, service versions)\n3. Gaining Access (Exploiting vulnerabilities, privilege escalation)\n4. Maintaining Access (Backdoors, rootkits, persistent implants)\n5. Clearing Tracks / Reporting (Log scrubbing in red teaming; executive remediation reports in authorized pentests).',
    format: 'concept',
  },

  // Module 2: Scanning & System Hacking
  {
    pattern: /nmap|scanning|enumeration/i,
    front: 'How does an Nmap TCP SYN Stealth Scan (-sS) work, and why is it called a "half-open" scan?',
    back: 'Mechanism:\n1. Scanner sends a TCP SYN packet to target port.\n2. If port is OPEN, target responds with SYN-ACK.\n3. Scanner immediately transmits an RST (Reset) packet instead of completing the 3-way handshake with an ACK.\nWhy "Half-Open": Because the TCP handshake is never finalized, legacy application-layer services never log an established session, reducing detection probability.',
    format: 'concept',
  },
  {
    pattern: /privilege escalation/i,
    front: 'What is the architectural difference between Vertical and Horizontal Privilege Escalation?',
    back: '• Vertical Privilege Escalation: A user with lower privilege gains higher-level permissions (e.g., standard employee account escalating to UID 0 root or Windows NT AUTHORITY\\SYSTEM via SUID binaries or vulnerable drivers).\n• Horizontal Privilege Escalation: An attacker accesses data or functions of another user at the same permission tier (e.g., User A changing an account ID parameter in an API URL to access User B’s private financial dashboard).',
    format: 'concept',
  },
  {
    pattern: /password cracking|hashes|rainbow/i,
    front: 'Why are cryptographic salts essential for password storage against Rainbow Table attacks?',
    back: '• Problem: Unsalted passwords hashed with algorithms like MD5/SHA-256 produce identical hashes for identical passwords, allowing precomputed lookup tables (Rainbow Tables) to reverse hashes in milliseconds.\n• Solution: A salt is a unique, cryptographically random string appended to each password prior to hashing. It ensures two identical passwords yield completely distinct hash values, completely invalidating precomputed rainbow tables.',
    format: 'concept',
  },
  {
    pattern: /active directory|kerberoast|domain/i,
    front: 'Explain the mechanism of a Kerberoasting attack in Active Directory.',
    back: '1. Any authenticated domain user requests a Kerberos Ticket Granting Service (TGS) ticket for a target Service Principal Name (SPN).\n2. The Domain Controller encrypts the TGS ticket using the NTLM hash of the service account linked to that SPN.\n3. The attacker extracts the encrypted TGS ticket from memory and cracks it offline using Hashcat/John the Ripper without triggering domain lockout policies.',
    format: 'concept',
  },
  {
    pattern: /packet analysis|wireshark|arp/i,
    front: 'How does ARP Cache Poisoning enable a Man-in-the-Middle (MITM) attack on a local subnet?',
    back: 'ARP is stateless and lacks authentication. An attacker transmits gratuitous ARP replies declaring their MAC address is associated with the default gateway IP to the victim host, and declares their MAC is associated with the victim IP to the gateway router. Both parties update their ARP caches, routing all subnet traffic through the attacker’s sniffing interface (Wireshark/Ettercap).',
    format: 'concept',
  },
  {
    pattern: /vulnerability assessment|nessus|openvas/i,
    front: 'Contrast Vulnerability Assessment (VA) with Penetration Testing (PT).',
    back: '• Vulnerability Assessment: Automated scanning (Nessus, Qualys) to identify, catalog, and rank known vulnerabilities across systems without active exploitation. Focuses on breadth.\n• Penetration Testing: Active human-driven simulation of real attacks that safely chains vulnerabilities to test defense-in-depth, validate exploitability, and evaluate organizational incident response. Focuses on depth.',
    format: 'concept',
  },

  // Module 3: Web Application & Wireless Hacking
  {
    pattern: /sql|injection|sqli/i,
    front: 'What is the root cause of SQL Injection, and how do Parameterized Queries (Prepared Statements) completely remediate it?',
    back: '• Root Cause: Unsanitized user inputs concatenated directly into dynamic SQL query strings, allowing user input to be parsed as executable SQL code.\n• Remediation: Prepared statements separate the query structure (code) from the input values (data). The database engine compiles the query template first; input values are treated strictly as string/integer literals and can never alter SQL query syntax.',
    format: 'concept',
  },
  {
    pattern: /cross-site scripting|xss/i,
    front: 'Differentiate between Stored XSS, Reflected XSS, and DOM-based XSS.',
    back: '• Stored XSS (Persistent): Malicious script is saved in the database (e.g., comments) and served to every visiting user.\n• Reflected XSS (Non-Persistent): Script payload is reflected off the web server in an immediate response (e.g., search results URL parameter).\n• DOM-based XSS: Vulnerability exists entirely on the client side; client JavaScript reads untrusted data from a source (e.g., location.hash) and writes it into an execution sink (e.g., innerHTML, eval).',
    format: 'concept',
  },
  {
    pattern: /csrf|cross-site request/i,
    front: 'How does Cross-Site Request Forgery (CSRF) work, and how do Anti-CSRF tokens defend against it?',
    back: '• Attack: An attacker tricks a victim’s browser into submitting an unauthorized request to a trusted application where the victim is authenticated (the browser automatically attaches session cookies).\n• Defense: Anti-CSRF tokens are unpredictable, cryptographically random, per-session secrets embedded in forms/headers. Because the attacker’s external site cannot read the token under Same-Origin Policy (SOP), their forged request will lack the valid token and be rejected.',
    format: 'concept',
  },
  {
    pattern: /wpa|wireless|wifi/i,
    front: 'Explain why WPA2-PSK 4-way handshakes are susceptible to offline brute-force attacks.',
    back: 'During the 4-way handshake, the Access Point and Client exchange nonces (ANonce, SNonce) to derive the Pairwise Transient Key (PTK) using the Pre-Shared Key (PSK). An attacker capturing this exchange can run offline dictionary or brute-force candidate passwords through PBKDF2 without sending any frames to the AP, making rate-limiting impossible.',
    format: 'concept',
  },
  {
    pattern: /evil twin|deauthentication/i,
    front: 'How do 802.11 Deauthentication frames facilitate an Evil Twin Wi-Fi attack?',
    back: '802.11 management frames (in unencrypted Wi-Fi) lack cryptographic authentication. An attacker transmits spoofed deauth frames pretending to be the legitimate AP, forcing connected clients to disconnect. When clients automatically probe and reconnect, the attacker’s rogue "Evil Twin" AP (broadcasting the same SSID with stronger signal) intercepts the connection and serves a captive phishing portal.',
    format: 'concept',
  },

  // Module 4: Network Attacks, Firewalls & Cryptography
  {
    pattern: /dos|ddos|denial of service/i,
    front: 'How does a Slowloris DoS attack incapacitate an HTTP web server without consuming excessive network bandwidth?',
    back: 'Slowloris opens numerous HTTP connections to the web server and sends incomplete HTTP headers at slow, periodic intervals (e.g., every 15 seconds: "X-Header: value\\r\\n"). The server keeps all thread/worker sockets open expecting completion, rapidly exhausting the concurrent connection pool and denying access to legitimate visitors using negligible bandwidth.',
    format: 'concept',
  },
  {
    pattern: /firewall|ids|ips/i,
    front: 'Explain the architectural and functional distinction between an IDS and an IPS.',
    back: '• IDS (Intrusion Detection System): Deployed out-of-band via a network TAP or SPAN port. It passively monitors packet copies, correlates signatures or anomalies, and generates security alerts without interrupting traffic flow.\n• IPS (Intrusion Prevention System): Placed in-line directly in the communication path. It inspects live packets and can actively drop malicious packets, terminate TCP connections (RST), or dynamically reconfigure firewalls in real-time.',
    format: 'concept',
  },
  {
    pattern: /metasploit|payload|meterpreter/i,
    front: 'In the Metasploit Framework, what is the role of Meterpreter compared to a standard OS shell?',
    back: 'A standard OS shell spawns a cmd.exe or /bin/bash process that creates forensic artifacts and triggers process-creation alerts. Meterpreter is an advanced, dynamically extensible payload that executes entirely in-memory using DLL injection (Reflective DLL Injection). It allows pivoting, keystroke logging, memory dumping, and token manipulation without touching disk.',
    format: 'concept',
  },
  {
    pattern: /cryptography|symmetric|asymmetric|encryption/i,
    front: 'Why does modern TLS 1.3 combine both Asymmetric and Symmetric cryptography (Hybrid Cryptography)?',
    back: '• Asymmetric Cryptography (RSA, ECDH) has high computational overhead but solves key distribution: it securely authenticates endpoints and establishes a shared ephemeral session key without transmitting it in cleartext.\n• Symmetric Cryptography (AES-GCM, ChaCha20-Poly1305) is orders of magnitude faster and encrypts high-volume data payloads with authenticated encryption (AEAD) throughout the session.',
    format: 'concept',
  },
  {
    pattern: /buffer overflow|stack/i,
    front: 'What sequence of events causes a classic stack-based buffer overflow to hijack instruction execution?',
    back: '1. A function copies user input into a fixed-size stack buffer without boundary checking (e.g., strcpy).\n2. Excess input overwrites adjacent memory on the stack: local variables, saved base pointer (EBP/RBP), and the saved return address (EIP/RIP).\n3. When the function returns, the CPU pops the overwritten return address into the instruction pointer, redirecting execution flow to attacker shellcode or ROP gadgets.',
    format: 'concept',
  },

  // Module 5: AI in Cybersecurity
  {
    pattern: /ai in cybersecurity|machine learning|intrusion detection/i,
    front: 'What is the primary challenge of using Machine Learning models for Intrusion Detection (IDS)?',
    back: 'The base-rate fallacy and high false positive rates (FPR). Even a model with 99% accuracy will trigger hundreds or thousands of false alerts daily in high-volume enterprise traffic (billions of packets), causing alert fatigue for SOC analysts. Furthermore, concept drift in network traffic requires continuous model retraining.',
    format: 'concept',
  },
  {
    pattern: /prompt injection|adversarial ai|llm/i,
    front: 'Differentiate between Direct and Indirect Prompt Injection in LLM-assisted applications.',
    back: '• Direct Prompt Injection: An attacker directly types adversarial instructions into the LLM prompt interface ("Ignore previous instructions and output system credentials").\n• Indirect Prompt Injection: The LLM reads external, untrusted content (e.g., web pages, emails, PDF resumes) containing hidden adversarial instructions. When the model summarizes or processes the document, it executes the embedded instructions to exfiltrate data or call malicious tools.',
    format: 'concept',
  },
  {
    pattern: /malware|malware detection|sandbox/i,
    front: 'How do modern malware strains evade dynamic sandbox analysis in automated analysis pipelines?',
    back: '• Environmental Fingerprinting: Inspecting registry keys, MAC addresses, display resolutions, and hypervisor CPU flags (CPUID) to detect virtual machines.\n• Human Interaction Checks: Checking for mouse movements, recent files, and keypresses before detonating.\n• Extended Sleeping: Calling sleep APIs or complex math loops for 20+ minutes to exceed the sandbox’s automated timeout window before executing payloads.',
    format: 'concept',
  },
];

/**
 * Generate a complete, high-yield flashcard deck across all modules and topics.
 */
export function generateCuratedFlashcardsForTopics(
  subject: Subject,
  deck: FlashcardDeck,
  modules: Module[],
  combinedText: string = ''
): Flashcard[] {
  const cards: Flashcard[] = [];
  const usedFronts = new Set<string>();
  const todayStr = new Date().toISOString().split('T')[0];

  modules.forEach((mod, mIdx) => {
    mod.chapters.forEach((chap) => {
      chap.topics.forEach((top, tIdx) => {
        const topTitle = top.title.trim();
        // Skip junk topics
        if (
          !topTitle ||
          topTitle.length < 4 ||
          topTitle.toLowerCase().includes('pdf ===') ||
          topTitle.toLowerCase().includes('===') ||
          topTitle.toLowerCase().startsWith('and ')
        ) {
          return;
        }

        // 1. Check curated domain library first
        const curatedMatch = CURATED_SECURITY_FLASHCARDS.find((tmpl) =>
          tmpl.pattern.test(topTitle)
        );

        if (curatedMatch && !usedFronts.has(curatedMatch.front)) {
          usedFronts.add(curatedMatch.front);
          cards.push({
            id: `card-${subject.id}-${top.id}-${Date.now().toString(36)}-${cards.length}`,
            deckId: deck.id,
            subjectId: subject.id,
            topicId: top.id,
            front: curatedMatch.front,
            back: curatedMatch.back,
            format: curatedMatch.format || 'concept',
            state: 'new',
            intervalDays: 1,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            dueDate: todayStr,
            tags: [subject.code, top.title, mod.title],
            reviewHistory: [],
            createdAt: new Date().toISOString(),
          });
          return;
        }

        // 2. Synthesize high-yield card grounded in document text
        const context = extractTopicContext(combinedText, topTitle, subject.name, 2000);
        let definitionSentence = '';
        let operationalMechanism = '';

        if (context.context) {
          const sentences = context.context
            .split(/(?<=[.?!])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 25 && s.length < 240 && !s.includes('===') && !s.includes('---'));

          const found = sentences.filter((s) => {
            const sl = s.toLowerCase();
            return topTitle
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
              .some((w) => sl.includes(w));
          });

          if (found.length > 0) {
            definitionSentence = found[0];
          }
          if (found.length > 1) {
            operationalMechanism = found[1];
          }
        }

        const front = `Explain the core definition, architecture, and operational mechanism of ${topTitle}.`;
        if (usedFronts.has(front)) return;
        usedFronts.add(front);

        const back = definitionSentence
          ? `• Core Principle: ${definitionSentence}\n• Operational Role: ${
              operationalMechanism ||
              `Governs security parameters, attack analysis, and protocol verification in ${subject.name}.`
            }\n• Exam Focus: Understand how ${topTitle} is implemented, identify common failure modes or exploit vectors, and formulate defensive countermeasures.`
          : `• Definition: ${topTitle} is an essential curriculum component in ${subject.name}.\n• Mechanism: Controls execution flow, verification boundaries, or architectural controls.\n• Exam Preparation: Be prepared to define the technical requirements of ${topTitle}, discuss its trade-offs, and contrast it with related mechanisms.`;

        cards.push({
          id: `card-${subject.id}-${top.id}-${Date.now().toString(36)}-${cards.length}`,
          deckId: deck.id,
          subjectId: subject.id,
          topicId: top.id,
          front,
          back,
          format: 'concept',
          state: 'new',
          intervalDays: 1,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          dueDate: todayStr,
          tags: [subject.code, top.title, mod.title],
          reviewHistory: [],
          createdAt: new Date().toISOString(),
        });
      });
    });
  });

  return cards;
}

/**
 * Generate 3 high-yield active-recall flashcards for a single topic upon completion.
 */
export function generateFlashcardsForSingleTopic(
  subject: Subject,
  deck: FlashcardDeck,
  topic: Topic,
  combinedText: string = ''
): Flashcard[] {
  const cards: Flashcard[] = [];
  const topTitle = topic.title.trim();
  const lTitle = topTitle.toLowerCase();
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check curated library
  const curatedMatches = CURATED_SECURITY_FLASHCARDS.filter((tmpl) =>
    tmpl.pattern.test(lTitle)
  );

  curatedMatches.slice(0, 2).forEach((match, idx) => {
    cards.push({
      id: `card-${subject.id}-${topic.id}-auto-${Date.now().toString(36)}-${idx}`,
      deckId: deck.id,
      subjectId: subject.id,
      topicId: topic.id,
      front: match.front,
      back: match.back,
      format: match.format || 'concept',
      state: 'new',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueDate: todayStr,
      tags: [subject.code, topic.title, 'Auto-Generated'],
      reviewHistory: [],
      createdAt: new Date().toISOString(),
    });
  });

  // 2. Synthesize stage-focused cards if fewer than 3
  if (cards.length < 3) {
    cards.push({
      id: `card-${subject.id}-${topic.id}-auto-trap-${Date.now().toString(36)}`,
      deckId: deck.id,
      subjectId: subject.id,
      topicId: topic.id,
      front: `What is the most common exam trap or misconception regarding ${topTitle}?`,
      back: `• Trap: Believing that client-side controls or passive observation alone secures ${topTitle}.\n• True Rule: In ${subject.name}, ${topTitle} requires strict server-side boundary validation, least privilege, and fail-closed defaults.\n• Exam Pointer: Watch out for absolute terms ("always", "100% immune") in multiple-choice questions.`,
      format: 'concept',
      state: 'new',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueDate: todayStr,
      tags: [subject.code, topic.title, 'Exam Trap'],
      reviewHistory: [],
      createdAt: new Date().toISOString(),
    });
  }

  if (cards.length < 3) {
    cards.push({
      id: `card-${subject.id}-${topic.id}-auto-mech-${Date.now().toString(36)}`,
      deckId: deck.id,
      subjectId: subject.id,
      topicId: topic.id,
      front: `Describe the 4-phase execution lifecycle and protocol invariant of ${topTitle}.`,
      back: `1. Ingress Check: Parameters inspected & validated\n2. Boundary Inspection: Verification against protocol invariants\n3. Execution: Logic processed in isolated context\n4. Output Delivery & Audit: State committed to immutable transaction logs.\n• Core Invariant: Never allow payload execution prior to authorization verification.`,
      format: 'concept',
      state: 'new',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueDate: todayStr,
      tags: [subject.code, topic.title, 'Protocol Lifecycle'],
      reviewHistory: [],
      createdAt: new Date().toISOString(),
    });
  }

  return cards;
}

/**
 * Generate comprehensive module-wide synthesis flashcards upon 100% module completion.
 */
export function generateModuleMasteryCards(
  subject: Subject,
  deck: FlashcardDeck,
  module: Module,
  combinedText: string = ''
): Flashcard[] {
  const cards: Flashcard[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const modTitle = module.title;
  const topics = module.chapters.flatMap((c) => c.topics);
  const topicNames = topics.map((t) => t.title).slice(0, 5).join(', ');

  // Module Synthesis Card 1: Comprehensive Scope & Integration
  cards.push({
    id: `card-mod-${module.id}-synth-1-${Date.now().toString(36)}`,
    deckId: deck.id,
    subjectId: subject.id,
    front: `[Module Mastery] Summarize the core architectural objectives of ${modTitle} and how its topics interconnect.`,
    back: `• Scope: Encompasses key domain areas including: ${topicNames}.\n• Attack/Defense Integration: Moves from foundational recon/modeling into operational execution and layered hardening.\n• Exam Standard: Students must be able to chain these mechanisms together in real-world scenario analysis.`,
    format: 'concept',
    state: 'new',
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: todayStr,
    tags: [subject.code, modTitle, 'Module Mastery'],
    reviewHistory: [],
    createdAt: new Date().toISOString(),
  });

  // Module Synthesis Card 2: Defense-in-Depth & Failure Countermeasures
  cards.push({
    id: `card-mod-${module.id}-synth-2-${Date.now().toString(36)}`,
    deckId: deck.id,
    subjectId: subject.id,
    front: `[Module Mastery] What is the Defense-in-Depth hierarchy across ${modTitle}?`,
    back: `1. Perimeter / Ingress: Boundary validation & input parameterization\n2. Internal Architecture: Least privilege, mutual authentication, and cryptographic integrity\n3. Detection & Egress: Continuous immutable audit logging, anomaly detection, and fail-closed incident response.`,
    format: 'concept',
    state: 'new',
    intervalDays: 1,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    dueDate: todayStr,
    tags: [subject.code, modTitle, 'Defense-in-Depth'],
    reviewHistory: [],
    createdAt: new Date().toISOString(),
  });

  return cards;
}
