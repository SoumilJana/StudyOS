import { Subject, Module, Topic, Question, DifficultyLevel } from '../types';
import { extractTopicContext } from './topicExtractor';

interface CuratedQuestionTemplate {
  pattern: RegExp;
  prompt: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  difficulty: DifficultyLevel;
}

const CURATED_SECURITY_QUESTIONS: CuratedQuestionTemplate[] = [
  // Module 1: Fundamentals & Reconnaissance
  {
    pattern: /kill chain/i,
    prompt: 'During which phase of the Lockheed Martin Cyber Kill Chain does an attacker package an exploit with a backdoor into an email PDF attachment?',
    options: [
      { id: 'opt-a', text: 'Reconnaissance' },
      { id: 'opt-b', text: 'Weaponization' },
      { id: 'opt-c', text: 'Exploitation' },
      { id: 'opt-d', text: 'Command & Control (C2)' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Weaponization is the phase where the attacker pairs the exploit code with an actionable payload or backdoor into a transportable artifact (e.g. malicious PDF or macro document).',
    difficulty: 2,
  },
  {
    pattern: /reconnaissance|footprinting/i,
    prompt: 'A security auditor queries public DNS records, WHOIS databases, and Shodan without sending any IP packets directly to the client network. What category of reconnaissance is being performed?',
    options: [
      { id: 'opt-a', text: 'Active Reconnaissance' },
      { id: 'opt-b', text: 'Passive Reconnaissance' },
      { id: 'opt-c', text: 'Intrusive Vulnerability Scanning' },
      { id: 'opt-d', text: 'Stateful Firewall Inspection' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Passive Reconnaissance gathers intelligence through third-party repositories and publicly available records without transmitting traffic directly to the target system.',
    difficulty: 2,
  },
  {
    pattern: /types of hackers|legal aspects/i,
    prompt: 'What legal document grants authorized penetration testers explicit permission to simulate attacks against an organization without violating the Computer Fraud and Abuse Act (CFAA)?',
    options: [
      { id: 'opt-a', text: 'General Public License (GPL)' },
      { id: 'opt-b', text: 'Rules of Engagement & Written Scope of Authorization' },
      { id: 'opt-c', text: 'Digital Millennium Copyright Waiver' },
      { id: 'opt-d', text: 'Certificate Revocation List (CRL)' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'A formal Rules of Engagement (RoE) document and signed Letter of Authorization define the legal scope, boundaries, and permissions required for ethical hacking.',
    difficulty: 2,
  },
  {
    pattern: /threat|threats.*vulnerabilit/i,
    prompt: 'In threat modeling using the STRIDE framework, which threat category corresponds to an attacker modifying in-transit transaction data?',
    options: [
      { id: 'opt-a', text: 'Spoofing' },
      { id: 'opt-b', text: 'Tampering' },
      { id: 'opt-c', text: 'Repudiation' },
      { id: 'opt-d', text: 'Information Disclosure' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Tampering in STRIDE involves unauthorized alteration of data in transit or storage, violating data integrity.',
    difficulty: 3,
  },
  {
    pattern: /hacking phases|ethical hacking/i,
    prompt: 'What is the correct sequential order of the 5 standard ethical hacking phases?',
    options: [
      { id: 'opt-a', text: 'Reconnaissance → Scanning → Gaining Access → Maintaining Access → Clearing Tracks' },
      { id: 'opt-b', text: 'Scanning → Reconnaissance → Exploitation → Reporting → Post-Mortem' },
      { id: 'opt-c', text: 'Gaining Access → Reconnaissance → Privilege Escalation → Denial of Service → Exfiltration' },
      { id: 'opt-d', text: 'Footprinting → Weaponization → Brute Force → Patching → Hardening' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'The industry standard hacking lifecycle progresses from passive Reconnaissance, to Scanning, Gaining Access, Maintaining Access, and finally Clearing Tracks or reporting.',
    difficulty: 2,
  },

  // Module 2: Scanning & System Hacking
  {
    pattern: /nmap|scanning/i,
    prompt: 'Which Nmap scanning flag executes a TCP SYN Stealth scan without completing the full 3-way TCP handshake?',
    options: [
      { id: 'opt-a', text: '-sT (Full TCP Connect)' },
      { id: 'opt-b', text: '-sS (SYN Stealth)' },
      { id: 'opt-c', text: '-sU (UDP Scan)' },
      { id: 'opt-d', text: '-sA (ACK Scan)' },
    ],
    correctAnswer: 'opt-b',
    explanation: '-sS sends a SYN packet and awaits a SYN-ACK or RST. Upon receiving SYN-ACK, it immediately emits an RST to terminate the handshake before completing the connection.',
    difficulty: 3,
  },
  {
    pattern: /privilege escalation/i,
    prompt: 'An administrator notices that an attacker has gained access to a standard employee account and used sudo misconfigurations to gain UID 0 (root). What type of attack is this?',
    options: [
      { id: 'opt-a', text: 'Horizontal Privilege Escalation' },
      { id: 'opt-b', text: 'Vertical Privilege Escalation' },
      { id: 'opt-c', text: 'ARP Cache Poisoning' },
      { id: 'opt-d', text: 'Cross-Site Request Forgery' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Vertical Privilege Escalation refers to elevating permissions from a restricted, low-privileged user account to administrative or root level privileges.',
    difficulty: 2,
  },
  {
    pattern: /password|cracking/i,
    prompt: 'Why does adding a unique cryptographic salt to user passwords before hashing effectively neutralize Rainbow Table attacks?',
    options: [
      { id: 'opt-a', text: 'It completely encrypts the password using asymmetric RSA keys.' },
      { id: 'opt-b', text: 'It invalidates precomputed hash lookup tables by guaranteeing unique hash outputs even for identical passwords.' },
      { id: 'opt-c', text: 'It compresses the hash output to reduce database disk storage.' },
      { id: 'opt-d', text: 'It forces the client browser to perform client-side decryption.' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Rainbow tables rely on precomputed chains of plaintext-to-hash mappings. A unique salt per user changes the resulting hash, making generic precomputed tables useless.',
    difficulty: 3,
  },
  {
    pattern: /vulnerability assessment|nessus|openvas/i,
    prompt: 'When evaluating vulnerability scan results, which Common Vulnerability Scoring System (CVSS) v3 rating represents a Critical severity flaw requiring immediate remediation?',
    options: [
      { id: 'opt-a', text: 'CVSS Base Score 4.0 - 6.9' },
      { id: 'opt-b', text: 'CVSS Base Score 7.0 - 8.9' },
      { id: 'opt-c', text: 'CVSS Base Score 9.0 - 10.0' },
      { id: 'opt-d', text: 'CVSS Base Score 0.1 - 3.9' },
    ],
    correctAnswer: 'opt-c',
    explanation: 'Under CVSS v3.x, scores from 9.0 to 10.0 are classified as Critical severity, typically denoting remotely exploitable vulnerabilities without user interaction.',
    difficulty: 2,
  },
  {
    pattern: /wireshark|sniffing|ettercap|arp/i,
    prompt: 'An attacker transmits unsolicited Gratuitous ARP replies linking the default gateway IP address with their own MAC address. What attack is taking place?',
    options: [
      { id: 'opt-a', text: 'ARP Cache Poisoning / Spoofing' },
      { id: 'opt-b', text: 'DNS Zone Transfer Exploitation' },
      { id: 'opt-c', text: 'BGP Hijacking' },
      { id: 'opt-d', text: 'SYN Flood Exhaustion' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'ARP Spoofing poisons the target host\'s ARP cache table with the attacker\'s MAC address, routing all subnet traffic through the attacker (Man-in-the-Middle).',
    difficulty: 3,
  },
  {
    pattern: /active directory|domain/i,
    prompt: 'In an Active Directory domain environment, what credential theft technique extracts Kerberos ticket-granting service (TGS) tickets from memory to perform offline brute-force cracking of service account passwords?',
    options: [
      { id: 'opt-a', text: 'Kerberoasting' },
      { id: 'opt-b', text: 'SQL Injection' },
      { id: 'opt-c', text: 'DLL Hijacking' },
      { id: 'opt-d', text: 'Padding Oracle Attack' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'Kerberoasting requests TGS tickets for Service Principal Names (SPNs) and cracks the ticket offline to recover the plaintext password of the underlying service account.',
    difficulty: 4,
  },

  // Module 3: Web & Wireless Security
  {
    pattern: /sql|injection|sqli/i,
    prompt: 'Which security mechanism is the most effective architectural control against SQL Injection vulnerabilities?',
    options: [
      { id: 'opt-a', text: 'Client-side JavaScript input validation' },
      { id: 'opt-b', text: 'Parameterized queries (Prepared Statements)' },
      { id: 'opt-c', text: 'Escaping single quotes using custom regex replacements' },
      { id: 'opt-d', text: 'Hashing all incoming query strings with SHA-256' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Parameterized queries strictly decouple the SQL instruction structure from user-supplied parameters, ensuring the database engine treats inputs strictly as data literals.',
    difficulty: 2,
  },
  {
    pattern: /cross-site scripting|xss/i,
    prompt: 'What type of Cross-Site Scripting (XSS) occurs when malicious JavaScript payload is permanently stored in a database and subsequently executed in the browsers of visiting users?',
    options: [
      { id: 'opt-a', text: 'Reflected (Non-Persistent) XSS' },
      { id: 'opt-b', text: 'Stored (Persistent) XSS' },
      { id: 'opt-c', text: 'DOM-based XSS' },
      { id: 'opt-d', text: 'Blind SQL Injection' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Stored (or Persistent) XSS saves the injected script on the target server (e.g. database, comment field), which then executes whenever victims view the affected page.',
    difficulty: 3,
  },
  {
    pattern: /csrf|cross-site request forgery/i,
    prompt: 'Which HTTP cookie attribute provides native defense against Cross-Site Request Forgery (CSRF) by preventing the browser from sending the cookie in cross-site requests?',
    options: [
      { id: 'opt-a', text: 'HttpOnly' },
      { id: 'opt-b', text: 'SameSite=Strict' },
      { id: 'opt-c', text: 'Secure' },
      { id: 'opt-d', text: 'Path=/api' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'SameSite=Strict prevents the browser from attaching the authentication cookie to any cross-origin requests, mitigating standard CSRF scenarios.',
    difficulty: 3,
  },
  {
    pattern: /wireless|wpa/i,
    prompt: 'In WPA2-Personal (PSK), how can an attacker perform an offline dictionary attack to recover the plaintext Wi-Fi passphrase?',
    options: [
      { id: 'opt-a', text: 'By capturing the 4-way EAPOL handshake frames exchanged between the client and the access point.' },
      { id: 'opt-b', text: 'By decrypting the Beacon frame transmitted every 100 milliseconds.' },
      { id: 'opt-c', text: 'By initiating an ARP flood to overwhelm the wireless router.' },
      { id: 'opt-d', text: 'By performing a reverse DNS lookup on the access point MAC address.' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'The 4-way EAPOL handshake contains the ANonce, SNonce, and MIC. An attacker capturing these packets can compute offline candidate PMKs using a wordlist to verify the MIC.',
    difficulty: 3,
  },
  {
    pattern: /evil twin|deauthentication/i,
    prompt: 'In wireless network auditing, an attacker sets up a rogue access point broadcasting the same SSID as a legitimate enterprise network to harvest credentials. What attack is this?',
    options: [
      { id: 'opt-a', text: 'Evil Twin Attack' },
      { id: 'opt-b', text: 'Smurf Attack' },
      { id: 'opt-c', text: 'Slowloris HTTP Flood' },
      { id: 'opt-d', text: 'Buffer Overflow' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'An Evil Twin attack clones a legitimate wireless access point\'s SSID and security profile, enticing client devices to connect and routing their traffic through an attacker-controlled proxy.',
    difficulty: 3,
  },

  // Module 4: Advanced Attacks & Defenses
  {
    pattern: /buffer overflow/i,
    prompt: 'During a classical stack-based buffer overflow, what crucial CPU register does an exploit aim to overwrite to divert control flow to an attacker payload?',
    options: [
      { id: 'opt-a', text: 'Instruction Pointer (EIP / RIP)' },
      { id: 'opt-b', text: 'Base Pointer (EBP / RBP)' },
      { id: 'opt-c', text: 'Stack Pointer (ESP / RSP)' },
      { id: 'opt-d', text: 'Accumulator Register (EAX / RAX)' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'Overwriting the saved return address on the stack overwrites the Extended Instruction Pointer (EIP/RIP), allowing the attacker to redirect code execution.',
    difficulty: 4,
  },
  {
    pattern: /dos|ddos|denial of service/i,
    prompt: 'Which DoS attack sends HTTP requests that are never completed, keeping server worker threads permanently occupied by transmitting headers at extremely slow intervals?',
    options: [
      { id: 'opt-a', text: 'Slowloris' },
      { id: 'opt-b', text: 'SYN Flood' },
      { id: 'opt-c', text: 'Smurf Attack' },
      { id: 'opt-d', text: 'Ping of Death' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'Slowloris holds web server connections open by sending partial HTTP requests at periodic intervals, exhausting the concurrent connection pool of thread-based web servers.',
    difficulty: 3,
  },
  {
    pattern: /firewall|ids|ips/i,
    prompt: 'What architectural distinction enables an Intrusion Prevention System (IPS) to actively drop malicious packets compared to an Intrusion Detection System (IDS)?',
    options: [
      { id: 'opt-a', text: 'An IPS is deployed inline directly in the network traffic path, whereas an IDS monitors tap/span port copies.' },
      { id: 'opt-b', text: 'An IDS uses machine learning while an IPS uses hardcoded regex tables.' },
      { id: 'opt-c', text: 'An IPS only inspects Layer 2 frames while an IDS inspects Layer 7.' },
      { id: 'opt-d', text: 'An IDS requires administrative root privileges on all subnet client devices.' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'An IPS sits inline with traffic flow and can actively drop packets or reset connections in real time. An IDS passively inspects a mirrored port and generates alerts.',
    difficulty: 3,
  },
  {
    pattern: /metasploit|exploit/i,
    prompt: 'In the Metasploit Framework, what is the functional difference between an Exploit and a Payload?',
    options: [
      { id: 'opt-a', text: 'An Exploit takes advantage of a flaw to bypass boundaries; a Payload is the code executed after compromise (e.g. reverse shell).' },
      { id: 'opt-b', text: 'An Exploit collects credentials; a Payload scans network ports.' },
      { id: 'opt-c', text: 'An Exploit generates certificates; a Payload handles DNS resolution.' },
      { id: 'opt-d', text: 'Exploits are written in Python; Payloads must be written in Assembly.' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'The exploit delivers and executes the payload on the target system. The payload carries out post-exploitation tasks such as opening a Meterpreter reverse shell.',
    difficulty: 2,
  },
  {
    pattern: /crypto|cipher|encryption/i,
    prompt: 'In modern cryptography, why is RSA (asymmetric) typically combined with AES (symmetric) in hybrid encryption schemes like TLS?',
    options: [
      { id: 'opt-a', text: 'RSA efficiently encrypts large bulk data streams while AES exchanges keys.' },
      { id: 'opt-b', text: 'RSA securely negotiates a session key, and AES performs fast, computationally efficient symmetric bulk data encryption.' },
      { id: 'opt-c', text: 'AES eliminates the need for mathematical primes.' },
      { id: 'opt-d', text: 'Asymmetric cryptography cannot be used over TCP/IP connections.' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Asymmetric encryption is computationally expensive. Hybrid cryptosystems use asymmetric keys (RSA/ECC) to securely exchange a symmetric key (AES), which encrypts the bulk payload efficiently.',
    difficulty: 3,
  },

  // Module 5: AI & Future Frontiers in Security
  {
    pattern: /prompt injection|adversarial/i,
    prompt: 'In AI-assisted threat operations, what vulnerability occurs when untrusted external text overrides system prompts to execute privileged tool actions?',
    options: [
      { id: 'opt-a', text: 'Model Inversion' },
      { id: 'opt-b', text: 'Prompt Injection' },
      { id: 'opt-c', text: 'Gradient Leakage' },
      { id: 'opt-d', text: 'Weight Poisoning' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Prompt injection manipulates the context window of an LLM so that attacker-controlled inputs are interpreted as instructions rather than data.',
    difficulty: 3,
  },
  {
    pattern: /machine learning|intrusion detection/i,
    prompt: 'When training a machine learning model for Network Intrusion Detection (NIDS), what metric represents benign traffic incorrectly flagged as an attack?',
    options: [
      { id: 'opt-a', text: 'False Positive' },
      { id: 'opt-b', text: 'False Negative' },
      { id: 'opt-c', text: 'True Negative' },
      { id: 'opt-d', text: 'Recall' },
    ],
    correctAnswer: 'opt-a',
    explanation: 'A False Positive (Type I error) occurs when the defense system flags benign, legitimate user activity as malicious, leading to alert fatigue.',
    difficulty: 2,
  },
  {
    pattern: /llm|ai in cybersecurity/i,
    prompt: 'How can automated LLM code review pipelines defend against Indirect Prompt Injection when analyzing external untrusted software repositories?',
    options: [
      { id: 'opt-a', text: 'By executing the untrusted code directly in production to verify output.' },
      { id: 'opt-b', text: 'By enforcing strict privilege separation, sandboxing tool execution, and treating repository comments as untrusted data literals.' },
      { id: 'opt-c', text: 'By increasing the LLM context window to 1 million tokens.' },
      { id: 'opt-d', text: 'By disabling API rate limiting on the evaluation cluster.' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Indirect prompt injection can hide within code comments or README files. Secure agent architecture isolates tool permissions and runs evaluations inside restricted sandboxes.',
    difficulty: 4,
  },
  {
    pattern: /malware/i,
    prompt: 'What is the primary operational advantage of Dynamic Malware Analysis (behavioral sandboxing) over Static Analysis?',
    options: [
      { id: 'opt-a', text: 'Dynamic analysis inspects PE headers without executing the executable file.' },
      { id: 'opt-b', text: 'Dynamic analysis reveals packed, obfuscated, or encrypted payloads as they unpack in memory during runtime.' },
      { id: 'opt-c', text: 'Dynamic analysis runs instantaneously on any CPU without virtualized emulation.' },
      { id: 'opt-d', text: 'Dynamic analysis produces zero network logs.' },
    ],
    correctAnswer: 'opt-b',
    explanation: 'Heavily packed or obfuscated malware hides its strings and instructions from static decompilation. Dynamic analysis monitors the binary as it executes in a safe sandbox.',
    difficulty: 3,
  },
];

/**
 * Generates an extensive, comprehensive bank of practice questions linked to every topic in the course.
 */
export function generateCuratedQuestionsForTopics(
  subject: Subject,
  modules: Module[],
  combinedText: string = ''
): Question[] {
  const generated: Question[] = [];
  const usedPrompts = new Set<string>();

  modules.forEach((mod, mIdx) => {
    mod.chapters.forEach((chap) => {
      chap.topics.forEach((top, tIdx) => {
        const topTitle = top.title.trim();
        const lTitle = topTitle.toLowerCase();

        // Skip junk or corrupted topics
        if (
          !topTitle ||
          topTitle.length < 4 ||
          lTitle.includes('pdf ===') ||
          lTitle.includes('===') ||
          lTitle.startsWith('and ')
        ) {
          return;
        }

        // 1. Try matching curated high-yield question templates
        const matchingTemplate = CURATED_SECURITY_QUESTIONS.find((tpl) => tpl.pattern.test(lTitle));

        if (matchingTemplate && !usedPrompts.has(matchingTemplate.prompt)) {
          usedPrompts.add(matchingTemplate.prompt);
          generated.push({
            id: `q-${subject.id}-${top.id}-${Date.now().toString(36)}-${generated.length}`,
            subjectId: subject.id,
            topicId: top.id,
            type: 'mcq_single',
            prompt: matchingTemplate.prompt,
            options: matchingTemplate.options,
            correctAnswer: matchingTemplate.correctAnswer,
            explanation: matchingTemplate.explanation,
            difficulty: matchingTemplate.difficulty,
            marks: 2,
            negativeMarks: 0.5,
            tags: [subject.code, top.title, mod.title],
          });
          return;
        }

        // 2. Synthesize topic-specific grounded question from material context
        const context = extractTopicContext(combinedText, topTitle, subject.name, 2000);
        let definitionFact = '';

        if (context.context) {
          const sentences = context.context
            .split(/(?<=[.?!])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 25 && s.length < 220 && !s.includes('===') && !s.includes('---'));

          const found = sentences.find((s) => {
            const sl = s.toLowerCase();
            return topTitle
              .toLowerCase()
              .split(/\s+/)
              .filter((w) => w.length > 3)
              .some((w) => sl.includes(w));
          });

          if (found) {
            definitionFact = found;
          }
        }

        const prompt = `In the context of ${topTitle} within ${subject.name}, which statement accurately explains its operational mechanism and core principle?`;
        if (usedPrompts.has(prompt)) return;
        usedPrompts.add(prompt);

        const correctText = definitionFact
          ? `${topTitle} operates by enforcing ${definitionFact.charAt(0).toLowerCase() + definitionFact.slice(1)}.`
          : `${topTitle} governs structural execution boundaries, state verification, and standardized protocol controls in ${subject.name}.`;

        generated.push({
          id: `q-${subject.id}-${top.id}-${Date.now().toString(36)}-${generated.length}`,
          subjectId: subject.id,
          topicId: top.id,
          type: 'mcq_single',
          prompt,
          options: [
            { id: 'opt-a', text: correctText },
            { id: 'opt-b', text: `It bypasses input validation boundaries and grants unconditional execution permissions.` },
            { id: 'opt-c', text: `It relies entirely on unencrypted client-side localStorage without server verification.` },
            { id: 'opt-d', text: `It executes only during system kernel crashes without maintaining state invariants.` },
          ],
          correctAnswer: 'opt-a',
          explanation: `Understanding ${topTitle} requires analyzing its operational boundaries, protocol controls, and correct implementation patterns within ${subject.name}.`,
          difficulty: ((((mIdx + tIdx) % 3) + 2) as DifficultyLevel), // 2, 3, or 4
          marks: 2,
          negativeMarks: 0.5,
          tags: [subject.code, top.title, mod.title],
        });
      });
    });
  });

  return generated;
}

/**
 * Generate 3 focused exam practice questions for a single topic upon completion.
 */
export function generateQuestionsForSingleTopic(
  subject: Subject,
  topic: Topic,
  combinedText: string = ''
): Question[] {
  const questions: Question[] = [];
  const topTitle = topic.title.trim();
  const lTitle = topTitle.toLowerCase();

  // Check curated templates
  const matchingTemplates = CURATED_SECURITY_QUESTIONS.filter((tmpl) =>
    tmpl.pattern.test(lTitle)
  );

  matchingTemplates.slice(0, 2).forEach((tpl, idx) => {
    questions.push({
      id: `q-${subject.id}-${topic.id}-auto-${Date.now().toString(36)}-${idx}`,
      subjectId: subject.id,
      topicId: topic.id,
      type: 'mcq_single',
      prompt: tpl.prompt,
      options: tpl.options,
      correctAnswer: tpl.correctAnswer,
      explanation: tpl.explanation,
      difficulty: tpl.difficulty,
      marks: 2,
      negativeMarks: 0.5,
      tags: [subject.code, topic.title, 'Auto-Generated'],
    });
  });

  // Synthesize scenario question if fewer than 3
  if (questions.length < 3) {
    questions.push({
      id: `q-${subject.id}-${topic.id}-auto-scen-${Date.now().toString(36)}-${questions.length}`,
      subjectId: subject.id,
      topicId: topic.id,
      type: 'mcq_single',
      prompt: `In an enterprise security evaluation of ${topTitle}, what is the mandatory architectural control required to prevent unauthorized exploitation?`,
      options: [
        { id: 'opt-a', text: `Enforce strict parameterization, server-side boundary validation, and least privilege.` },
        { id: 'opt-b', text: `Rely exclusively on client-side browser attributes without server verification.` },
        { id: 'opt-c', text: `Grant temporary unrestricted permissions to bypass authentication bottlenecks.` },
        { id: 'opt-d', text: `Disable audit transaction logs to accelerate system response times.` },
      ],
      correctAnswer: 'opt-a',
      explanation: `Systematic mitigation of ${topTitle} mandates server-side boundary validation, parameterization, and least privilege.`,
      difficulty: 3,
      marks: 2,
      negativeMarks: 0.5,
      tags: [subject.code, topic.title, 'Exam Scenario'],
    });
  }

  // Synthesize failure mode / detection question if still fewer than 3
  if (questions.length < 3) {
    questions.push({
      id: `q-${subject.id}-${topic.id}-auto-trap-${Date.now().toString(36)}-${questions.length}`,
      subjectId: subject.id,
      topicId: topic.id,
      type: 'mcq_single',
      prompt: `During incident triage involving ${topTitle}, what indicator provides the most definitive evidence of a successful state compromise?`,
      options: [
        { id: 'opt-a', text: `Anomalous privilege escalation tokens and unauthorized state mutation in signed audit logs.` },
        { id: 'opt-b', text: `Normal transient ping latency fluctuations on client workstations.` },
        { id: 'opt-c', text: `Browser cache refresh operations during scheduled maintenance.` },
        { id: 'opt-d', text: `Standard DNS resolution for internal domain controllers.` },
      ],
      correctAnswer: 'opt-a',
      explanation: `Compromise of ${topTitle} manifests as unauthorized state mutation, privilege changes, and non-repudiated log anomalies.`,
      difficulty: 4,
      marks: 2,
      negativeMarks: 0.5,
      tags: [subject.code, topic.title, 'Incident Analysis'],
    });
  }

  return questions.slice(0, 3);
}

/**
 * Generate a comprehensive 3-question module mastery quiz upon 100% module completion.
 */
export function generateModuleMasteryQuestions(
  subject: Subject,
  module: Module,
  combinedText: string = ''
): Question[] {
  const questions: Question[] = [];
  const modTitle = module.title;
  const topics = module.chapters.flatMap((c) => c.topics);

  // Question 1: Comprehensive Defense-in-Depth Principle
  questions.push({
    id: `q-mod-${module.id}-mastery-1-${Date.now().toString(36)}`,
    subjectId: subject.id,
    topicId: topics[0]?.id,
    type: 'mcq_single',
    prompt: `[${modTitle} Comprehensive Exam] Which principle governs the defensive architecture across all components of ${modTitle}?`,
    options: [
      { id: 'opt-a', text: `Defense-in-depth: combining perimeter boundary inspection, least-privilege access, and fail-closed defaults.` },
      { id: 'opt-b', text: `Perimeter-only defense: trusting all internal hosts and users once inside the local network.` },
      { id: 'opt-c', text: `Reactive patching: operating without monitoring until an explicit breach is reported.` },
      { id: 'opt-d', text: `Disabling cryptographic handshakes during peak enterprise network utilization.` },
    ],
    correctAnswer: 'opt-a',
    explanation: `Defense-in-depth requires multiple overlapping defensive layers across the entire scope of ${modTitle}.`,
    difficulty: 4,
    marks: 3,
    negativeMarks: 1,
    tags: [subject.code, modTitle, 'Module Final Exam'],
  });

  // Question 2: Attack Chain Synthesis
  questions.push({
    id: `q-mod-${module.id}-mastery-2-${Date.now().toString(36)}`,
    subjectId: subject.id,
    topicId: topics[1]?.id || topics[0]?.id,
    type: 'mcq_single',
    prompt: `[${modTitle} Cross-Topic Scenario] An adversary combines initial reconnaissance with privilege escalation in ${modTitle}. Which telemetry stream provides the highest fidelity correlation?`,
    options: [
      { id: 'opt-a', text: `Correlating SIEM endpoint process tree parent-child anomalies with central authentication audit logs.` },
      { id: 'opt-b', text: `Inspecting local client browser history on an isolated guest VLAN.` },
      { id: 'opt-c', text: `Reviewing uncompressed disk space utilization percentages.` },
      { id: 'opt-d', text: `Monitoring battery cycle degradation on enterprise laptops.` },
    ],
    correctAnswer: 'opt-a',
    explanation: `Advanced cross-domain attacks across ${modTitle} require correlating endpoint process lineage (EDR) with central identity audit logs (SIEM).`,
    difficulty: 4,
    marks: 3,
    negativeMarks: 1,
    tags: [subject.code, modTitle, 'Multi-Stage Attack Chain'],
  });

  // Question 3: Strategic Hardening & Invariant Verification
  questions.push({
    id: `q-mod-${module.id}-mastery-3-${Date.now().toString(36)}`,
    subjectId: subject.id,
    topicId: topics[2]?.id || topics[0]?.id,
    type: 'mcq_single',
    prompt: `[${modTitle} Strategic Synthesis] To achieve zero-trust maturity across all topics covered in ${modTitle}, which control is non-negotiable?`,
    options: [
      { id: 'opt-a', text: `Continuous explicit cryptographic validation of every request identity and runtime context.` },
      { id: 'opt-b', text: `Implicit trust granted to all requests originating behind the internal border gateway.` },
      { id: 'opt-c', text: `Allowing single-factor legacy passwords for administrative bastion hosts.` },
      { id: 'opt-d', text: `Caching access authorization tokens indefinitely without expiration.` },
    ],
    correctAnswer: 'opt-a',
    explanation: `Zero-trust architecture mandates continuous explicit authentication and authorization verification regardless of network location.`,
    difficulty: 4,
    marks: 3,
    negativeMarks: 1,
    tags: [subject.code, modTitle, 'Zero Trust Architecture'],
  });

  return questions;
}
