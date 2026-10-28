import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sparkles,
  ArrowRight,
  Clock,
  Swords,
  BrainCircuit,
  Briefcase,
  FolderArchive,
  Hourglass,
  Calendar,
  X,
} from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';

export const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    subjects,
    tasks,
    deadlines,
    decks,
    startTimer,
    setShowHourlyPrompt,
  } = useStudyOS();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };
    if (isCommandPaletteOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Flattened searchable items
  interface PaletteItem {
    id: string;
    title: string;
    category: 'Actions' | 'Navigation' | 'Subjects' | 'Tasks' | 'Deadlines' | 'Decks';
    subtitle?: string;
    icon: any;
    onSelect: () => void;
  }

  const items: PaletteItem[] = [
    // Quick Actions
    {
      id: 'act-focus-50',
      title: 'Start 50/10 Focus Session',
      category: 'Actions',
      subtitle: 'Launches 50-minute deep study timer',
      icon: Hourglass,
      onSelect: () => {
        startTimer(50, 'focus');
        navigate('/focus');
      },
    },
    {
      id: 'act-focus-25',
      title: 'Start 25/5 Pomodoro Session',
      category: 'Actions',
      subtitle: 'Launches 25-minute sprint timer',
      icon: Hourglass,
      onSelect: () => {
        startTimer(25, 'focus');
        navigate('/focus');
      },
    },
    {
      id: 'act-hourly-checkin',
      title: 'Record Hourly Activity Check-in',
      category: 'Actions',
      subtitle: 'Log what you worked on during the last hour',
      icon: Clock,
      onSelect: () => {
        setShowHourlyPrompt(true);
      },
    },
    {
      id: 'act-review-cards',
      title: 'Review Due Flashcards (Spaced Repetition)',
      category: 'Actions',
      subtitle: 'Open Memory Lab recall session',
      icon: BrainCircuit,
      onSelect: () => navigate('/memory'),
    },
    {
      id: 'act-exam-mistakes',
      title: 'Review Mistake Notebook',
      category: 'Actions',
      subtitle: 'Re-test misconceptions and tricky questions',
      icon: Swords,
      onSelect: () => navigate('/arena'),
    },

    // Navigation
    {
      id: 'nav-home',
      title: 'Command Center',
      category: 'Navigation',
      subtitle: 'Dashboard overview',
      icon: Sparkles,
      onSelect: () => navigate('/'),
    },
    {
      id: 'nav-learning',
      title: 'AI Learning Studio',
      category: 'Navigation',
      subtitle: 'Interactive chapter tutoring & document analysis',
      icon: Sparkles,
      onSelect: () => navigate('/learning'),
    },
    {
      id: 'nav-deadlines',
      title: 'Deadline Planner',
      category: 'Navigation',
      subtitle: 'Exam countdowns and backward study scheduling',
      icon: Calendar,
      onSelect: () => navigate('/deadlines'),
    },
    {
      id: 'nav-workbench',
      title: 'Workbench (Tasks & Projects)',
      category: 'Navigation',
      subtitle: 'Manage assignments, milestones, and deliverables',
      icon: Briefcase,
      onSelect: () => navigate('/workbench'),
    },
    {
      id: 'nav-resources',
      title: 'Resource Library',
      category: 'Navigation',
      subtitle: 'Search documents, notes, and attachments',
      icon: FolderArchive,
      onSelect: () => navigate('/resources'),
    },
  ];

  // Add subjects
  subjects.forEach((s) => {
    items.push({
      id: `sub-${s.id}`,
      title: s.name,
      category: 'Subjects',
      subtitle: `${s.code} • ${s.modules.length} modules`,
      icon: Sparkles,
      onSelect: () => navigate('/learning'),
    });
  });

  // Add tasks
  tasks.forEach((t) => {
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      category: 'Tasks',
      subtitle: `Status: ${t.status} • Priority: ${t.priority}`,
      icon: Briefcase,
      onSelect: () => navigate('/workbench'),
    });
  });

  // Add deadlines
  deadlines.forEach((d) => {
    items.push({
      id: `dl-${d.id}`,
      title: d.title,
      category: 'Deadlines',
      subtitle: `Due ${new Date(d.dueDate).toLocaleDateString()} • ${d.estimatedWorkloadHours}h estimated`,
      icon: Calendar,
      onSelect: () => navigate('/deadlines'),
    });
  });

  // Add decks
  decks.forEach((deck) => {
    items.push({
      id: `deck-${deck.id}`,
      title: deck.title,
      category: 'Decks',
      subtitle: deck.description,
      icon: BrainCircuit,
      onSelect: () => navigate('/memory'),
    });
  });

  const filtered = items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: PaletteItem) => {
    item.onSelect();
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 p-4 pt-16 backdrop-blur-sm sm:pt-24">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/80">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-slate-800 px-4 py-3">
          <Search className="mr-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, subject, topic, or search query..."
            autoFocus
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="rounded p-1 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or entities found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex cursor-pointer items-center justify-between rounded-xl p-2.5 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                        {item.subtitle && (
                          <div className="text-[11px] text-slate-500">{item.subtitle}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase font-mono text-slate-400">
                        {item.category}
                      </span>
                      {isSelected && <ArrowRight className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-4 py-2 text-[10px] text-slate-500">
          <span>Navigate with arrows, Enter to select</span>
          <span>Esc to exit</span>
        </div>
      </div>
    </div>
  );
};
