import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer Component', () => {
  it('renders markdown tables properly with normalized rows', () => {
    const rawTableWithDoublePipes = `
The **Cyber Kill Chain** breaks an intrusion into seven sequential phases.

| Phase | Description || |-------|--------------|| | **1. Reconnaissance** | Attacker gathers information about the target. || | **2. Weaponization** | Attacker couples payload with delivery mechanism. |

The **Attack Lifecycle** mirrors the kill chain.
    `;

    const html = renderToString(<MarkdownRenderer content={rawTableWithDoublePipes} />);
    
    // Checks that a <table> element was rendered
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('<td');
    expect(html).toContain('Phase');
    expect(html).toContain('Description');
    expect(html).toContain('Reconnaissance');
    expect(html).toContain('Weaponization');
    // Checks bold rendering
    expect(html).toContain('<strong class="font-bold text-white">Cyber Kill Chain</strong>');
  });

  it('renders lists, code blocks, and blockquotes', () => {
    const markdown = `
### Key Principles
- First-Principles Derivation
- State Machine Invariants

1. Step One
2. Step Two

> Important Security Invariant

\`\`\`python
def scan_network():
    pass
\`\`\`
    `;

    const html = renderToString(<MarkdownRenderer content={markdown} />);
    expect(html).toContain('<h3');
    expect(html).toContain('<ul');
    expect(html).toContain('<ol');
    expect(html).toContain('<blockquote');
    expect(html).toContain('<pre');
    expect(html).toContain('def scan_network():');
  });
});
