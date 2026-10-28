# STUDY OS — Personal Learning, Exam Preparation & Productivity Kernel

A unified, game-inspired operating system for personal learning, exam preparation, deliberate practice, time tracking, deliverable management, and spaced repetition.

Built with **React 19, TypeScript, Tailwind CSS v4, Vite 8, and Supabase (PostgreSQL, Storage, Auth, Edge Functions)**.

[![Tests](https://img.shields.io/badge/tests-17%20passed-success)](https://github.com/SoumilJana/StudyOS)
[![Supabase](https://img.shields.io/badge/Supabase-Free%20Tier%20Ready-3ECF8E?logo=supabase)](https://supabase.com)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Free%20AI%20Models-6366F1)](https://openrouter.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org)

---

## 🌟 The 12 Integrated Workspaces

1. **Command Center (`/`)**:
   Answers the 8 core daily questions: *What should I do next? What is my nearest deadline? Am I on track? Which topics are weak? What revisions are due? How much focused work have I completed? Where did my time go? Which projects need attention?*
2. **AI Learning Studio (`/learning`)**:
   Document-grounded cognitive tutoring through a 12-stage learning workflow with active recall checkpoints, key formulas, exam pointers, and instant generation of flashcards & practice questions.
3. **Exam Arena & Mistake Notebook (`/arena`)**:
   High-stakes practice simulations with 8 question types (single/multi MCQs, True/False, numerical, short-answer). Includes negative marking, attempt persistence across browser reloads, and automatic logging of misconceptions into the Mistake Notebook.
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
    Supabase Cloud Account authentication, two-way cloud sync, customizable AI provider, quiet hours, daily targets, and full JSON backup export & import.

---

## 🛠️ Technology Stack & Cloud Architecture

### Frontend
- **React 19 & TypeScript**: Strict types, functional architecture, zero `any` leaks.
- **Tailwind CSS v4**: Dark game-inspired obsidian & deep indigo theme with custom scrollbars, subtle glow accents, and responsive desktop/tablet/mobile layouts.
- **Lucide React**: Crisp iconography for every learning & productivity construct.
- **Command Palette (`⌘K`)**: Quick navigation, session launch, and action shortcuts.

### Backend Infrastructure (Supabase Free Tier)
- **Database (PostgreSQL)**: 20 production tables (`subjects`, `exams`, `modules`, `chapters`, `topics`, `deadlines`, `projects`, `tasks`, `flashcard_decks`, `flashcards`, `questions`, `mistake_records`, `revision_events`, `focus_sessions`, `time_logs`, `hourly_checkins`, `resources`, `user_profiles`, `gamification_profiles`, `ai_cache`).
- **Security & Authorization**: Row Level Security (RLS) enabled on all 20 tables with `TO authenticated USING ((select auth.uid()) = user_id)` and `WITH CHECK` clauses.
- **Storage**: Supabase Storage bucket `resources` for user documents (PDF, DOCX, Markdown) with private user-folder access policies (`(storage.foldername(name))[1] = auth.uid()`).
- **Edge Functions**: Secure server-side `ai-proxy` running Deno/TypeScript that proxies requests to OpenRouter free models, checks the `ai_cache` table to eliminate duplicate LLM calls, and enforces rate limits.
- **Credential Protection**: Zero API keys or service role secrets exposed in the frontend bundle.

### AI Architecture & Free-First Principle
- **Default AI Provider**: OpenRouter free tier with fast inference (`nvidia/nemotron-3.5-lightning:free`), automatic model fallbacks, and exponential backoff.
- **Free-First & Offline Resilience**: The application is 100% functional without AI or an internet connection. Timers, flashcards, question bank, deadline countdowns, backward planning, and time intelligence work seamlessly offline via the local reactive storage engine.
- **Local Heuristic Engine**: Built-in pedagogical rules generate cognitive checkpoints, flashcards, and questions when offline or when quotas are exhausted.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/SoumilJana/StudyOS.git
cd StudyOS
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` settings:
```env
VITE_SUPABASE_URL=https://ckiryrgdenoycrqqatyi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_OPENROUTER_MODEL=nvidia/nemotron-3.5-lightning:free
VITE_AI_PROVIDER=openrouter
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Automated Tests
```bash
npm test
```
Runs 17 unit and integration tests covering SM-2 interval calculations, topic mastery progression, time log deduplication, deterministic UUID mapping, and AI proxy mocks.

### 5. Build for Production
```bash
npm run build
```

---

## ☁️ Supabase Cloud Operations

### Database Migrations
Migrations are managed in `supabase/migrations/`:
- `20261028000000_study_os_schema.sql`: 20 tables, indexes, triggers, and RLS policies.
- `20261028000001_storage_setup.sql`: Storage bucket configuration and private upload security.

To push migrations to remote Supabase:
```bash
npx supabase db push
```

### Deploying Edge Functions
```bash
npx supabase functions deploy ai-proxy --no-verify-jwt
```

### Managing Server Secrets
```bash
npx supabase secrets set OPENROUTER_API_KEY="sk-or-v1-..."
npx supabase secrets set OPENROUTER_MODEL="nvidia/nemotron-3.5-lightning:free"
```

---

## ⌨️ Keyboard Shortcuts
- `⌘K` or `Ctrl+K`: Open Global Command Palette & Quick Actions
- `Esc`: Close open modal / palette

---

## 📄 License
MIT License. Built for scholars, engineers, and lifelong learners.
