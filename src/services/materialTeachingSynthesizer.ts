import { TutoringResponse } from '../types';
import { extractTopicContext } from './topicExtractor';

export const STAGE_TITLES = [
  'Foundational Mental Model & Intuition',
  'Core Mechanics & Step-by-Step Architecture',
  'Mathematical/Technical Derivations & Axioms',
  'Common Misconceptions & High-Yield Exam Traps',
  'Real-World Failure Modes & Edge Cases',
  'Synthesis & Active Recall Checkpoint',
];

export const STAGE_SUBTITLES = [
  'High-level intuition, real-world analogies, and the fundamental problem this solves.',
  'Step-by-step technical architecture, packet/execution flow, and protocol mechanics.',
  'Exact tool syntax, parameter flags, mathematical formulas, and boundary constraints.',
  'Tricky exam questions, subtle distinctions, and where students commonly lose marks.',
  'Real-world vulnerability breakdowns, exploit vectors, bypasses, and defensive hardening.',
  'Executive summary, 5-point self-test checklist, and active retention challenge.',
];

interface DomainProfile {
  name: string;
  detector: RegExp;
  analogy: (topic: string) => string;
  conceptKeywords: string[];
  sampleTerms: string[];
  contrastPair: (topic: string) => { current: string; alternative: string; distinction: string };
  commonTrap: (topic: string) => string;
  failureMode: (topic: string) => { flaw: string; exploit: string; mitigation: string };
}

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    name: 'Cybersecurity & Ethical Hacking',
    detector: /hack|secur|exploit|vulnerab|payload|malware|penetr|firewall|sniff|spoof|recon|attack|cipher|encrypt|privilege|osint|mitm|injection|xss|sql|trojan|nmap|kill chain/i,
    analogy: (topic) =>
      `Think of **${topic}** like airport border security or a high-security bank vault: an attacker searches for unattended side doors, forged credentials, or blind spots, while the defense must enforce verified physical manifests, multi-factor identity checks, and least-privilege compartmentalization.`,
    conceptKeywords: ['Attacker Vector', 'Defensive Mitigation', 'Boundary Enforcement', 'Least Privilege', 'State Verification'],
    sampleTerms: [
      'Principle of Least Privilege (PoLP): Restrict permissions to the bare minimum required for execution',
      'Defense-in-Depth: Multi-tiered layered controls preventing single-point compromises',
      'Prepared Statements: Complete syntactic separation of executable code from untrusted user data',
    ],
    contrastPair: (topic) => ({
      current: `${topic} (Targeted Control)`,
      alternative: 'Generic Perimeter Filtering (Firewall-Only)',
      distinction: `${topic} verifies application-layer state and semantic legitimacy, whereas generic perimeters only filter IP addresses and ports without inspecting inner payloads.`,
    }),
    commonTrap: (topic) =>
      `Examiners frequently trick students into believing client-side validation (HTML/JS) or basic regex string filtering is sufficient protection for ${topic}. Always specify server-side parameterization and structural separation of code and data.`,
    failureMode: (topic) => ({
      flaw: `Unsanitized input boundaries or missing cryptographic integrity checks in ${topic}`,
      exploit: `Attacker crafts malicious payloads or out-of-order state transitions to bypass permission tiers`,
      mitigation: `Cryptographic signing, parameterized queries, and strict input schema whitelisting`,
    }),
  },
  {
    name: 'Computer Science & Software Systems',
    detector: /algorithm|data structure|tree|graph|hash|sort|search|complexity|memory|pointer|concurrency|thread|database|cache|compiler|stack|queue|cpu/i,
    analogy: (topic) =>
      `Think of **${topic}** like an automated logistics fulfillment warehouse: you trade floor space (memory complexity) to reduce the time it takes forklifts to locate and dispatch packages (time complexity).`,
    conceptKeywords: ['Time Complexity', 'Space Complexity', 'Memory Invariants', 'Concurrency Safety', 'Data Representation'],
    sampleTerms: [
      'Asymptotic Bound: O(N log N) optimal average-case partitioning',
      'Structural Invariance: Integrity constraints preserved before and after state mutation',
      'Locality of Reference: Maximizing CPU cache line hits via contiguous memory layout',
    ],
    contrastPair: (topic) => ({
      current: `${topic} (Optimized Structure)`,
      alternative: 'Naive Linear Scan / Unindexed Storage',
      distinction: `${topic} maintains indexing invariants for sub-linear retrieval, whereas naive storage incurs O(N) traversal overhead on every query.`,
    }),
    commonTrap: (topic) =>
      `Confusing average-case time complexity with worst-case bounds under adversarial input distributions (e.g. Quicksort O(N log N) average vs O(N²) worst-case without randomized pivoting).`,
    failureMode: (topic) => ({
      flaw: `Unchecked recursion depth, memory leaks, or race conditions during concurrent access in ${topic}`,
      exploit: `Resource exhaustion, deadlocks, or segmentation faults causing complete service downtime`,
      mitigation: `Tail-call optimization, re-entrant synchronization primitives, and strict bounding limits`,
    }),
  },
  {
    name: 'Mathematics, Physics & Engineering',
    detector: /calculus|deriv|integr|matrix|vector|probabil|statist|algebra|tensor|mechanic|thermo|quantum|newton|fourier|linear|regression/i,
    analogy: (topic) =>
      `Think of **${topic}** like calibrating a high-precision telescope: small mathematical variations at the aperture compound exponentially over distance unless constrained by governing physical conservation laws and boundary limits.`,
    conceptKeywords: ['Analytical Derivation', 'Boundary Conditions', 'Convergence Criteria', 'Symmetry Invariants', 'Conservation Laws'],
    sampleTerms: [
      'Conservation Law: Total system energy/momentum remains constant under isolated operations',
      'Cauchy Convergence: Sequence elements become arbitrarily close beyond threshold index N',
      'Linear Transformation: Invariance under scalar multiplication and vector addition',
    ],
    contrastPair: (topic) => ({
      current: `${topic} (Analytical Exact Solution)`,
      alternative: 'Empirical Numerical Approximation',
      distinction: `${topic} yields closed-form mathematical guarantees, whereas numerical simulations accumulate round-off error over extended iterations.`,
    }),
    commonTrap: (topic) =>
      `Applying fundamental formulas without proving that boundary conditions and domain continuity criteria are satisfied across the integration/differentiation interval.`,
    failureMode: (topic) => ({
      flaw: `Singularities, division by zero, or divergent iterations when parameters cross critical thresholds`,
      exploit: `Mathematical breakdown leading to unphysical solutions or computational overflow`,
      mitigation: `Rigorous epsilon-delta domain boundary validation and regularization penalties`,
    }),
  },
  {
    name: 'Business, Economics & Finance',
    detector: /financ|market|econom|accounting|asset|liabil|equity|valuation|cash flow|wacc|dcf|capital|revenue|pricing|tax|invest|risk/i,
    analogy: (topic) =>
      `Think of **${topic}** like water flowing through an irrigation dam: water stored in the reservoir represents capital assets, the spillway represents operating cash flow, and evaporation represents cost of capital and inflation drag.`,
    conceptKeywords: ['Valuation Mechanics', 'Risk-Adjusted Hurdle Rate', 'Capital Allocation', 'Market Equilibrium', 'Opportunity Cost'],
    sampleTerms: [
      'Time Value of Money (TVM): Present Value PV = FV / (1 + r)^t',
      'Weighted Average Cost of Capital (WACC): Blended cost of debt and equity funding',
      'Marginal Efficiency: Optimal capital allocation occurs where Marginal Revenue equals Marginal Cost',
    ],
    contrastPair: (topic) => ({
      current: `${topic} (Economic Intrinsic Value)`,
      alternative: 'Accounting Book Value',
      distinction: `${topic} accounts for future discounted free cash flows and risk premiums, whereas accounting book value reflects backward-looking historical asset acquisition costs.`,
    }),
    commonTrap: (topic) =>
      `Confusing accounting net income (which includes non-cash accruals and depreciation) with actual operating cash flow available for reinvestment or debt service.`,
    failureMode: (topic) => ({
      flaw: `Mismatched asset-liability duration or over-leveraged debt structures in ${topic}`,
      exploit: `Sudden liquidity contractions forcing distressed asset sales and technical insolvency`,
      mitigation: `Conservative debt-service coverage ratios and continuous scenario stress-testing`,
    }),
  },
  {
    name: 'General Academic Science & Systems',
    detector: /.*/,
    analogy: (topic) =>
      `Think of **${topic}** like a precision ecosystem: every internal mechanism operates under specific governing laws, and modifying one variable triggers cascading feedback loops across adjacent components.`,
    conceptKeywords: ['System Invariants', 'Input-Output Mapping', 'Dynamic Equilibrium', 'Feedback Loops', 'Boundary Conditions'],
    sampleTerms: [
      'Governing Axiom: Invariants must remain consistent throughout transformation lifecycles',
      'Feedback Regulation: Output signals dynamically modulate input throttles to maintain stability',
      'Boundary Protocol: Formal handshake establishing preconditions before state transitions',
    ],
    contrastPair: (topic) => ({
      current: `${topic} (Systemic Principle)`,
      alternative: 'Isolated Symptomatic Observation',
      distinction: `${topic} models root mechanisms and structural interactions, rather than merely logging visible surface symptoms.`,
    }),
    commonTrap: (topic) =>
      `Treating correlated indicators as causative mechanisms without establishing direct causal linkages and verified control trials.`,
    failureMode: (topic) => ({
      flaw: `Unmonitored state drift or unchecked positive feedback amplification in ${topic}`,
      exploit: `System destabilization when operational loads exceed rated architectural thresholds`,
      mitigation: `Decoupled circuit breakers, automated health checks, and verified fallback routines`,
    }),
  },
];

function detectDomain(topic: string, chapter: string): DomainProfile {
  const combined = `${chapter} ${topic}`;
  for (const profile of DOMAIN_PROFILES) {
    if (profile.detector.test(combined)) {
      return profile;
    }
  }
  return DOMAIN_PROFILES[DOMAIN_PROFILES.length - 1];
}

/**
 * Material-Aware Multi-Stage Heuristic Synthesizer
 * Generates truly distinct, pedagogically progressive educational lessons across all 6 stages.
 */
export function synthesizeMaterialLesson(
  chapterTitle: string,
  topicTitle: string,
  stepIndex: number,
  referenceDocumentText?: string
): TutoringResponse {
  const stageIndex = Math.abs(stepIndex) % STAGE_TITLES.length;
  const stageTitle = STAGE_TITLES[stageIndex];
  const stageSubtitle = STAGE_SUBTITLES[stageIndex];
  const domain = detectDomain(topicTitle, chapterTitle);

  // Extract targeted document context
  const extraction = referenceDocumentText
    ? extractTopicContext(referenceDocumentText, topicTitle, chapterTitle, 5000)
    : { context: '', hasExactMatch: false, matchScore: 0, matchedKeywords: [] };

  const hasContext = extraction.context.trim().length > 0;
  const contextText = extraction.context;

  // Extract meaningful sentences
  const sentences = contextText
    .split(/[.?!]\s+/)
    .map((s) => s.trim().replace(/\s+/g, ' '))
    .filter((s) => s.length > 25 && s.length < 240 && !s.includes('===') && !s.includes('---'));

  const topicSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes(topicTitle.toLowerCase()) ||
      extraction.matchedKeywords.some((k) => lower.includes(k))
    );
  });

  const bestSentences = topicSentences.length > 0 ? topicSentences : sentences;
  const primarySentence = bestSentences[0] || `${topicTitle} is a foundational concept in ${chapterTitle}.`;
  const secondarySentence = bestSentences[1] || `Understanding how ${topicTitle} operates is critical for exam mastery.`;
  const tertiarySentence = bestSentences[2] || `Its technical implementation governs security boundaries and state protocols.`;

  let explanation = '';
  let keyFormulas: string[] = [];
  let retrievalQuestion = {
    prompt: '',
    options: ['', '', '', ''] as [string, string, string, string],
    correctIndex: 0,
    explanation: '',
  };
  let examTip = '';

  // =========================================================================
  // STAGE 0: Foundational Mental Model & Intuition
  // =========================================================================
  if (stageIndex === 0) {
    explanation = `### ${topicTitle} — Foundational Mental Model
*${stageSubtitle}*

---

#### 1. The Core Intuition & Real-World Analogy
${domain.analogy(topicTitle)}

When approaching **${topicTitle}**, students often make the mistake of memorizing acronyms or isolated steps. Instead, think about the **fundamental problem** this was invented to solve:

> *"Without ${topicTitle}, how would a system guarantee integrity, distinguish authentic requests from malicious tampering, or prevent catastrophic failure?"*

#### 2. First-Principles Mental Map
| Dimension | How It Functions in ${topicTitle} | Architectural Purpose |
| :--- | :--- | :--- |
| **The Trigger / Input** | Arrival of untrusted data, packet, or user request | Establishes entry state |
| **The Core Filter** | Verification against strict invariant rules | Separates legitimate signals from noise/attacks |
| **The Expected Outcome** | Verified state transition or graceful rejection | Guarantees system resilience |

#### 3. Grounding from Course Syllabus
${hasContext ? `• **Core Definition**: ${primarySentence}.\n• **Key Context**: ${secondarySentence}.` : `• **Syllabus Focus**: Master the foundational definition and operational role of ${topicTitle} within ${chapterTitle}.`}

#### 4. The Mental Check
Before diving into technical syntax, ask yourself: *If you had to explain ${topicTitle} to a non-technical manager in two sentences, what governing principle would you highlight?*`;

    keyFormulas = [
      `${topicTitle} Core Premise: Solve structural verification without introducing single-point bottlenecks`,
      domain.sampleTerms[0],
      `Invariant Rule: Always validate boundary assumptions before state transitions`,
    ];

    retrievalQuestion = {
      prompt: `From a foundational conceptual standpoint, what is the primary purpose of ${topicTitle} in ${chapterTitle}?`,
      options: [
        `To enforce structural invariants, boundary validation, and systematic control guarantees.`,
        `To eliminate the need for server-side processing by relying purely on client-side trust.`,
        `To serve as an optional cosmetic layer that has no direct operational or security impact.`,
        `To bypass existing protocol handshakes in order to accelerate throughput without validation.`,
      ],
      correctIndex: 0,
      explanation: `Conceptually, ${topicTitle} exists to enforce boundary invariants and provide systematic control guarantees.`,
    };

    examTip = `On university and certification exams, introductory questions often ask you to "Define and state the primary objective of ${topicTitle}." Always begin your answer with the problem it solves, then state its governing mechanism.`;
  }

  // =========================================================================
  // STAGE 1: Core Mechanics & Step-by-Step Architecture
  // =========================================================================
  else if (stageIndex === 1) {
    explanation = `### ${topicTitle} — Core Mechanics & Execution Workflow
*${stageSubtitle}*

---

#### 1. Step-by-Step Execution Sequence
Under the hood, **${topicTitle}** progresses through a deterministic 4-stage lifecycle:

\`\`\`
[1. Request / Probe] ───► [2. Inspection / Handshake] ───► [3. Execution / Routing] ───► [4. Final State & Audit]
\`\`\`

1. **Phase 1: Initiation & Pre-Flight Check**: The system establishes the communication channel, inspecting headers, authentication tokens, and parameter schemas.
2. **Phase 2: Boundary Inspection & Handshake**: The mechanism compares incoming values against protocol invariants (e.g. TCP flags, cryptographic hashes, or input types).
3. **Phase 3: Execution & State Transition**: If validation succeeds, the operation executes within an isolated, controlled execution context.
4. **Phase 4: Output Delivery & Audit Logging**: Results are returned to the caller, and the state event is committed to persistent transaction logs.

#### 2. Protocol & Component Interaction Matrix
| Phase | Actor / Layer | Operational Function | Critical Verification |
| :--- | :--- | :--- | :--- |
| **Ingress** | Client / Network Interface | Transmits initial parameters | Schema & boundary checking |
| **Processing** | Core Controller / Engine | Executes logic of ${topicTitle} | Prevents privilege bypass |
| **Egress** | System Storage / Response | Emits verified state or alerts | Audit log immutability |

#### 3. Course Material Observations
${hasContext ? `• **Mechanism**: ${secondarySentence}.\n• **Technical Detail**: ${tertiarySentence}.` : `• **Operational Invariant**: Ensure every transaction through ${topicTitle} adheres to least-privilege standards.`}`;

    keyFormulas = [
      `Protocol Lifecycle: Ingress Check → Boundary Inspection → Execution → State Commitment`,
      domain.sampleTerms[1],
      `State Invariant: Never allow execution before authorization verification completes`,
    ];

    retrievalQuestion = {
      prompt: `During the technical execution lifecycle of ${topicTitle}, what must occur before any state transition or payload execution is permitted?`,
      options: [
        `Strict boundary verification, schema validation, and authorization checks.`,
        `Unconditional execution followed by retroactive asynchronous error suppression.`,
        `Disabling system audit logs to conserve network buffer memory.`,
        `Forwarding raw user parameters directly to system shells without escaping.`,
      ],
      correctIndex: 0,
      explanation: `Rigorous system architecture requires boundary checking and parameter validation prior to any state transition.`,
    };

    examTip = `When an exam asks for a "Step-by-step description" of ${topicTitle}, use numbered sequential steps and explicitly mention input preconditions, processing rules, and expected outputs. Diagrams earn significant partial credit.`;
  }

  // =========================================================================
  // STAGE 2: Mathematical/Technical Derivations & Axioms
  // =========================================================================
  else if (stageIndex === 2) {
    explanation = `### ${topicTitle} — Technical Syntax, Formulas & Rules
*${stageSubtitle}*

---

#### 1. Command Syntax & Parameter Directives
To implement and inspect **${topicTitle}** in real environments, practitioners utilize structured commands and parameter flags:

| Directive / Parameter | Technical Meaning | Operational Impact |
| :--- | :--- | :--- |
| \`--target-scope <spec>\` | Explicit boundary constraint | Limits execution strictly to authorized domains |
| \`--verify-checksum / -v\` | Verbose integrity inspection | Logs real-time packet/state transitions |
| \`--strict-boundary\` | Zero-tolerance parameter parsing | Rejects malformed requests immediately |
| \`--timeout-ms <n>\` | Latency watchdog | Prevents slowloris and resource-exhaustion locks |

#### 2. Mathematical Metrics & Evaluation Criteria
When quantifying performance and security in **${topicTitle}**, standard formulas are used:

- **Accuracy & Detection Metric**:
  $$\\text{Precision} = \\frac{TP}{TP + FP}, \\quad \\text{Recall} = \\frac{TP}{TP + FN}$$
- **Asymptotic Overhead Bound**:
  $$\\mathcal{O}(\\log N) \\le \\text{Latency}(\\text{${topicTitle}}) \\le \\mathcal{O}(N)$$
- **CVSS / Risk Score Formulation**:
  $$\\text{Risk Severity} = \\text{Likelihood} \\times \\text{Impact}$$

#### 3. Technical Constraints from Course Notes
${hasContext ? `• **Formal Rule**: ${primarySentence}.\n• **Implementation Metric**: ${tertiarySentence}.` : `• **Axiom**: In ${chapterTitle}, all implementations of ${topicTitle} must adhere to formal protocol specifications.`}`;

    keyFormulas = [
      `CVSS Risk Score = Likelihood × Impact (Scale 0.0 to 10.0)`,
      `Precision = TP / (TP + FP) vs Recall = TP / (TP + FN)`,
      domain.sampleTerms[2],
    ];

    retrievalQuestion = {
      prompt: `Which mathematical or technical rule is universally enforced when configuring parameters for ${topicTitle}?`,
      options: [
        `Explicit boundary specifications must constrain execution scope to authorized domains.`,
        `Timeout values must be set to infinity to prevent connection retries.`,
        `Input values should be treated as executable code by default.`,
        `Mathematical entropy checks should be disabled to maximize compression.`,
      ],
      correctIndex: 0,
      explanation: `Strict parameter constraints and scoped boundary definitions are essential for deterministic execution.`,
    };

    examTip = `For technical and calculation questions, always write the general formula first before plugging in numbers. Showing your step-by-step arithmetic ensures maximum partial credit even if a calculation typo occurs.`;
  }

  // =========================================================================
  // STAGE 3: Common Misconceptions & High-Yield Exam Traps
  // =========================================================================
  else if (stageIndex === 3) {
    const contrast = domain.contrastPair(topicTitle);

    explanation = `### ${topicTitle} — Common Misconceptions & Exam Traps
*${stageSubtitle}*

---

#### 1. The High-Yield Contrast Table (What Students Frequently Confuse)
Examiners love testing subtle distinctions between **${topicTitle}** and closely related concepts:

| Comparison Attribute | ${contrast.current} | ${contrast.alternative} |
| :--- | :--- | :--- |
| **Primary Scope** | Deep semantic inspection & granular state control | High-level surface observation |
| **Operational Layer** | Application and protocol logic | Network or perimeter boundary |
| **Common Confusion** | Often assumed to be interchangeable | Actually operates at a different abstraction tier |
| **How to Distinguish** | ${contrast.distinction} | Focuses on volumetric or routing statistics |

#### 2. The 3 Classic Exam Traps in This Topic
1. **Trap 1: The Client-Side Fallacy**: Believing that client-side sanitization (e.g. JavaScript forms) removes the need for server-side verification. *Examiner trick: "The form has HTML5 required attributes, so SQLi is impossible." (False!)*
2. **Trap 2: Confusing Detection with Prevention**: Writing that an IDS actively blocks attacks, or that a sniffer modifies traffic. *Always specify that passive monitors only alert, while active controls drop packets.*
3. **Trap 3: The Out-of-Order State Assumption**: Assuming attackers will follow standard protocol sequences. Attackers intentionally skip initialization steps or send truncated handshakes to cause memory leaks.

#### 3. Warning from Course Syllabus
${domain.commonTrap(topicTitle)}`;

    keyFormulas = [
      `Exam Golden Rule: Client-side validation is a UX feature, NEVER a security control`,
      `Contrast Rule: Passive monitors alert out-of-band; Active controls drop packets inline`,
      `Trap Alert: Watch for extreme keywords in exam choices: "Always", "Never", "Completely immune"`,
    ];

    retrievalQuestion = {
      prompt: `Which of the following represents a classic exam trap or misconception regarding ${topicTitle}?`,
      options: [
        `Assuming that client-side input validation eliminates the need for server-side boundary checks.`,
        `Recognizing that layered security requires both host-level and network-level controls.`,
        `Understanding that passive monitoring tools cannot actively drop network packets.`,
        `Treating parameterized queries as the gold standard for preventing injection flaws.`,
      ],
      correctIndex: 0,
      explanation: `Relying on client-side controls is one of the most common student mistakes and real-world vulnerabilities.`,
    };

    examTip = `Beware of absolute keywords in multiple-choice questions ("always", "never", "guarantees 100% security"). In engineering and cybersecurity, absolute claims are almost invariably incorrect. Look for nuanced answers mentioning layered defense.`;
  }

  // =========================================================================
  // STAGE 4: Real-World Failure Modes & Edge Cases
  // =========================================================================
  else if (stageIndex === 4) {
    const failure = domain.failureMode(topicTitle);

    explanation = `### ${topicTitle} — Real-World Failure Modes & Mitigations
*${stageSubtitle}*

---

#### 1. Failure Mode & Evasion Matrix
When **${topicTitle}** breaks down in production, it typically traces to one of these failure modes:

| Failure Category | Vulnerability / Root Cause | Real-World Exploit Scenario | Defensive Remediation |
| :--- | :--- | :--- | :--- |
| **Boundary Violation** | Missing input parameterization | Attacker injects control sequences into data channels | Parameterized prepared statements |
| **State Desync** | Race conditions during concurrent calls | Attacker exhausts connection pool or bypasses limits | Atomic mutex locks & rate limiting |
| **Evasion / Bypass** | Fragmented packets or encoding tricks | WAF or IDS fails to reassemble payload before checking | Full TCP stream reassembly |
| **Excess Privilege** | Process running as UID 0 / root | Attacker compromises low-severity flaw to get root | Principle of Least Privilege & sandboxing |

#### 2. Case Study: How ${topicTitle} Fails in Practice
> **The Vulnerability**: ${failure.flaw}.
> **The Attack Vector**: ${failure.exploit}.
> **The Hardening Rule**: ${failure.mitigation}.

#### 3. Defense-in-Depth Checklist
1. **Input Sanitization**: Whitelist valid character sets; reject all unexpected characters.
2. **Cryptographic Validation**: Verify HMAC signatures or TLS 1.3 certificates on all payload transfers.
3. **Failsafe Defaults**: When an exception occurs, fail closed (deny access), never fail open.`;

    keyFormulas = [
      `Failsafe Axiom: When an error or timeout occurs, ALWAYS fail closed (deny access)`,
      `Defense Checklist: Whitelist Schema → Cryptographic HMAC → Rate Limiting → Least Privilege`,
      `Evasion Countermeasure: Normalize and reassemble all data streams before pattern inspection`,
    ];

    retrievalQuestion = {
      prompt: `When an unexpected exception or timeout occurs during the execution of ${topicTitle}, what is the mandatory architectural response?`,
      options: [
        `Fail closed: immediately deny access and log the incident to an immutable audit record.`,
        `Fail open: grant unrestricted administrative access to prevent user inconvenience.`,
        `Silently ignore the exception and continue executing untrusted payload commands.`,
        `Delete previous system transaction logs to free up memory buffers.`,
      ],
      correctIndex: 0,
      explanation: `A fundamental rule of computer systems and security engineering is "Fail Safe / Fail Closed".`,
    };

    examTip = `Case study exam questions frequently describe a scenario where "Company X suffered a breach despite having system Y." The winning answer always points out missing defense-in-depth or failure to follow the principle of fail-safe defaults.`;
  }

  // =========================================================================
  // STAGE 5: Synthesis & Active Recall Checkpoint
  // =========================================================================
  else {
    explanation = `### ${topicTitle} — Synthesis & Mastery Verification
*${stageSubtitle}*

---

#### 1. Executive 3-Minute Summary
- **What it is**: ${primarySentence}
- **How it works**: Operates via deterministic state inspection, boundary validation, and protocol enforcement within ${chapterTitle}.
- **How it is defended**: Hardened through defense-in-depth, least privilege, and fail-closed architectural defaults.

#### 2. The 5-Point Self-Assessment Checklist
Test your active recall out loud without looking at notes. Can you:
1. Explain the primary definition and real-world intuition of **${topicTitle}** in plain English?
2. Draw or trace the 4-step execution lifecycle from ingress to audit commitment?
3. State the exact command flags, formulas, or parameters used to configure it?
4. Contrast it against its closest related concept without confusing their operational layers?
5. Identify its primary failure mode and explain how to harden against it?

#### 3. Next Action Steps
- **Memory Lab**: Click **"Gen Flashcards"** above to add active-recall cards for this topic into your spaced repetition queue.
- **Exam Arena**: Click **"Gen Practice Qs"** or jump to the **Exam Arena** to test your retrieval under timed exam conditions!`;

    keyFormulas = [
      `Mastery Criteria: Can explain Intuition, Protocol Mechanics, Formulas, Traps, and Defenses`,
      `Spaced Repetition: Review this topic's flashcards at 24h, 72h, and 7-day intervals`,
      `Active Retrieval: Self-testing outperforms passive re-reading by over 300% in exam retention`,
    ];

    retrievalQuestion = {
      prompt: `Which approach represents the most effective learning methodology for mastering ${topicTitle} prior to an exam?`,
      options: [
        `Active recall through self-testing, flashcards, and explaining mechanisms out loud from first principles.`,
        `Passively re-reading textbook chapters multiple times without self-testing.`,
        `Memorizing raw answer keys without understanding the underlying technical protocol.`,
        `Cramming all modules exclusively the night before the examination.`,
      ],
      correctIndex: 0,
      explanation: `Cognitive science proves that active retrieval and spaced repetition dramatically outperform passive reading.`,
    };

    examTip = `Before walking into your exam, do a "brain dump" of the top 3 formulas and protocol steps for ${topicTitle} on your scrap paper. This prevents blanking out under test anxiety.`;
  }

  return {
    stage: stageIndex + 1,
    stageTitle,
    explanation,
    keyFormulasOrDefinitions: keyFormulas,
    retrievalQuestion,
    examTip,
    sourceCitation: hasContext ? 'Course Document Grounding' : `${chapterTitle} — ${domain.name}`,
    modelUsed: hasContext ? 'Material-Grounded Cognitive Engine' : `${domain.name} Engine`,
  };
}
