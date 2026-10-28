# STUDY OS — Personal Learning, Exam Preparation & Productivity Kernel

A unified, game-inspired operating system for personal learning, exam preparation, deliberate practice, time tracking, and deliverable management.

Built with **React 19, TypeScript, Tailwind CSS v4, and Vite**.

---

## 🌟 The 12 Integrated Workspaces

1. **Command Center (`/`)**:
   Answers the 8 core daily questions: *What should I do next? What is my nearest deadline? Am I on track? Which topics are weak? What revisions are due? How much focused work have I completed? Where did my time go? Which projects need attention?*
2. **AI Learning Studio (`/learning`)**:
   Document-grounded cognitive tutoring through a 12-stage learning workflow with active recall checkpoints, key formulas, exam pointers, and instant generation of flashcards & practice questions.
3. **Exam Arena & Mistake Notebook (`/arena`)**:
   High-stakes practice simulations with single/multi MCQs, True/False, numerical problems, and short-answer questions. Includes negative marking, attempt persistence across browser reloads, and automatic logging of misconceptions into the Mistake Notebook.
4. **Memory Lab (`/memory`)**:
   Algorithmic Spaced Repetition (SM-2 / FSRS matrix) with Again, Hard, Good, and Easy ratings. Real-time recall intervals, stability index, and deck management.
5. **Smart Revision Calendar (`/calendar`)**:
   Explainable revision scheduling combining flashcard decay intervals, assessment mistakes, and exam urgency. Supports Day, Week, Month, and Agenda views with one-click completion or postponement recalculation.
6. **Deadline Planner (`/deadlines`)**:
   Live ticking countdown timers for critical exams and deliverables with automatic backward planning that distributes study phases, practice problem sets, and mock exams across available calendar days.
7. **Focus Room (`/focus`)**:
   Timestamp-based Pomodoro timer with 50/10 and 25/5 presets, interruption logging, task and subject linkage, and a distraction-free full-screen mode that survives page reloads.
8. **Time Intelligence (`/time`)**:
   Manual activity tracking across 16 categories with hourly check-in prompt dialogs and a daily reconciliation engine that guarantees zero double-counting with Pomodoro sessions.
9. **Workbench (`/workbench`)**:
   Deliverable tracker for assignments, coding projects, and research. Features Kanban board, task dependencies, milestone health indicators, and direct Pomodoro launch.
10. **Resource Library (`/resources`)**:
    Central searchable document repository supporting PDFs, DOCX, Markdown, code snippets, and URLs with hash deduplication and direct grounding into the Learning Studio.
11. **Study & Productivity Analytics (`/analytics`)**:
    Strict metric separation ensuring time spent is never confused with mastery. Visualizes topic mastery distribution, question accuracy by difficulty, category allocation, and a transparent Exam Readiness Index.
12. **Settings & Data Ownership (`/settings`)**:
    Customizable AI provider (Gemini, OpenAI, Claude, or zero-latency offline heuristic engine), quiet hours, daily targets, and full JSON backup export & import.

---

## 🛠️ Technology Stack & Architecture

- **Runtime**: React 19, TypeScript, Vite 8
- **Styling**: Tailwind CSS v4 (dark game-inspired charcoal/navy design system)
- **Icons**: Lucide React
- **Storage**: Offline-First Reactive Storage Engine with in-memory cache, synchronous reads, and LocalStorage persistence.
- **AI Architecture**: Provider-independent service layer supporting Google Gemini, OpenAI, Claude, and an intelligent offline cognitive heuristic fallback engine so all AI actions work immediately out of the box with zero external configuration required.
- **Testing**: Vitest automated test suite verifying mastery calculations, SM-2 interval formulas, backward study scheduling, and time reconciliation.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Run Automated Tests
```bash
npm test
```

### 4. Build for Production
```bash
npm run build
```

---

## ⌨️ Keyboard Shortcuts
- `⌘K` or `Ctrl+K`: Open Global Command Palette & Quick Actions
- `Esc`: Close open modal / palette
