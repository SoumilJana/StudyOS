import React, { useState } from 'react';
import {
  BrainCircuit,
  RotateCw,
  Plus,
  Layers,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  BookOpen,
  X,
  Check,
} from 'lucide-react';
import { useStudyOS } from '../context/StudyOSContext';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { CardRating, CardFormat, Flashcard } from '../types';

export const MemoryLabView: React.FC = () => {
  const { decks, flashcards, dueFlashcardsCount, subjects } = useStudyOS();
  const { requireAuth } = useAuth();

  const [selectedDeckId, setSelectedDeckId] = useState<string>('all');
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // New Card Form State
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [newFormat, setNewFormat] = useState<CardFormat>('concept');
  const [newDeckId, setNewDeckId] = useState<string>(decks[0]?.id || '');
  const [newSourceRef, setNewSourceRef] = useState('');

  React.useEffect(() => {
    if (!newDeckId && decks.length > 0) {
      setNewDeckId(decks[0].id);
    }
  }, [decks, newDeckId]);

  const today = new Date().toISOString().split('T')[0];

  const dueCards = flashcards.filter(
    (c) =>
      c.dueDate <= today &&
      (selectedDeckId === 'all' || c.deckId === selectedDeckId)
  );

  const startReview = () => {
    if (dueCards.length === 0) return;
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setIsReviewing(true);
  };

  const handleRateCard = (rating: CardRating) => {
    if (!requireAuth('save flashcard ratings to the database')) return;
    const card = dueCards[currentCardIndex];
    if (!card) return;

    storage.reviewFlashcard(card.id, rating, 15);
    setIsFlipped(false);

    if (currentCardIndex + 1 < dueCards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setIsReviewing(false);
    }
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAuth('add flashcards to the database')) return;
    if (!newFront || !newBack) return;

    let targetDeckId = newDeckId;
    if (!targetDeckId) {
      if (decks.length > 0) {
        targetDeckId = decks[0].id;
      } else {
        const defaultDeck = {
          id: `deck-${Date.now()}`,
          title: 'General Study Deck',
          description: 'Spaced repetition flashcards',
          color: '#6366f1',
          createdAt: new Date().toISOString(),
        };
        storage.saveDeck(defaultDeck);
        targetDeckId = defaultDeck.id;
      }
    }

    const newCard: Flashcard = {
      id: `fc-${Date.now()}`,
      deckId: targetDeckId,
      front: newFront,
      back: newBack,
      format: newFormat,
      tags: ['User Created'],
      sourceReference: newSourceRef || undefined,
      state: 'new',
      intervalDays: 1,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      dueDate: today,
      reviewHistory: [],
      createdAt: new Date().toISOString(),
    };

    storage.saveFlashcard(newCard);
    storage.addXP(15, 'Created new flashcard');
    setShowCreateModal(false);
    setNewFront('');
    setNewBack('');
    setNewSourceRef('');
  };

  const masteredCount = flashcards.filter((c) => c.state === 'mastered').length;
  const learningCount = flashcards.filter((c) => c.state === 'learning' || c.state === 'review').length;
  const retentionEstimate = flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Memory Lab
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Spaced repetition memory consolidation (SM-2 / FSRS) designed to counteract cognitive forgetting curves.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!requireAuth('create flashcards in the database')) return;
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>Create Card</span>
          </button>
          <button
            onClick={startReview}
            disabled={dueCards.length === 0}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-40"
          >
            <BrainCircuit className="h-4 w-4" />
            <span>Review Due Cards ({dueCards.length})</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Due Today</span>
          <div className="mt-2 text-2xl font-black text-amber-400">{dueCards.length}</div>
          <p className="mt-1 text-[10px] text-slate-500">Requires recall prompt</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Mastered Cards</span>
          <div className="mt-2 text-2xl font-black text-emerald-400">{masteredCount}</div>
          <p className="mt-1 text-[10px] text-slate-500">Interval &gt; 14 days</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">In Active Learning</span>
          <div className="mt-2 text-2xl font-black text-indigo-400">{learningCount}</div>
          <p className="mt-1 text-[10px] text-slate-500">Repetitions in progress</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Retention Estimate</span>
          <div className="mt-2 text-2xl font-black text-white">{retentionEstimate}%</div>
          <p className="mt-1 text-[10px] text-slate-500">Stability index</p>
        </div>
      </div>

      {/* Main Review or Deck List */}
      {isReviewing && dueCards[currentCardIndex] ? (
        /* Active SM-2 Review Card */
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Card {currentCardIndex + 1} of {dueCards.length}
            </span>
            <button
              onClick={() => setIsReviewing(false)}
              className="text-slate-400 hover:text-white"
            >
              Exit Review
            </button>
          </div>

          {/* Flashcard container with flip animation */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[280px] rounded-3xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-8 shadow-2xl flex flex-col justify-between transition-all hover:border-indigo-500/50"
          >
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="rounded bg-slate-800 px-2 py-0.5 uppercase">
                {dueCards[currentCardIndex].format}
              </span>
              <span>{isFlipped ? 'Answer (Click to flip back)' : 'Prompt (Click to reveal)'}</span>
            </div>

            <div className="my-6 text-center text-lg sm:text-xl font-bold text-white">
              {isFlipped ? dueCards[currentCardIndex].back : dueCards[currentCardIndex].front}
            </div>

            {dueCards[currentCardIndex].sourceReference && (
              <div className="text-center text-[11px] text-slate-500">
                Source: {dueCards[currentCardIndex].sourceReference}
              </div>
            )}
          </div>

          {/* Recall Rating Controls (Only show when flipped) */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-2.5 animate-in fade-in">
              <button
                onClick={() => handleRateCard('again')}
                className="flex flex-col items-center rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 hover:bg-rose-500/20 text-rose-300 transition-colors"
              >
                <span className="text-xs font-bold">Again</span>
                <span className="text-[10px] text-slate-400 mt-0.5">&lt; 1 day</span>
              </button>
              <button
                onClick={() => handleRateCard('hard')}
                className="flex flex-col items-center rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 hover:bg-amber-500/20 text-amber-300 transition-colors"
              >
                <span className="text-xs font-bold">Hard</span>
                <span className="text-[10px] text-slate-400 mt-0.5">2 days</span>
              </button>
              <button
                onClick={() => handleRateCard('good')}
                className="flex flex-col items-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 hover:bg-indigo-500/20 text-indigo-300 transition-colors"
              >
                <span className="text-xs font-bold">Good</span>
                <span className="text-[10px] text-slate-400 mt-0.5">4 days</span>
              </button>
              <button
                onClick={() => handleRateCard('easy')}
                className="flex flex-col items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 hover:bg-emerald-500/20 text-emerald-300 transition-colors"
              >
                <span className="text-xs font-bold">Easy</span>
                <span className="text-[10px] text-slate-400 mt-0.5">7 days</span>
              </button>
            </div>
          ) : (
            <div className="text-center text-xs text-slate-500">
              Tap card or press space to flip and rate recall quality
            </div>
          )}
        </div>
      ) : (
        /* Decks Grid & Cards List */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white">Your Flashcard Decks</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {decks.length === 0 ? (
              <div className="col-span-3 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-8 text-center">
                <BrainCircuit className="mx-auto h-8 w-8 text-indigo-400/60" />
                <h4 className="mt-3 text-sm font-bold text-white">No Flashcard Decks Yet</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Decks will be generated automatically when you import a syllabus, or you can create individual cards using the "Add Flashcard" button above.
                </p>
              </div>
            ) : (
              decks.map((deck) => {
                const deckCards = flashcards.filter((c) => c.deckId === deck.id);
                const deckDue = deckCards.filter((c) => c.dueDate <= today).length;
                return (
                  <div
                    key={deck.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-all hover:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">{deck.title}</span>
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: deck.color || '#6366f1' }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">{deck.description}</p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                      <span className="text-slate-400">{deckCards.length} total cards</span>
                      {deckDue > 0 ? (
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                          {deckDue} due today
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[11px]">All caught up</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Add New Flashcard</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Front (Prompt)</label>
                <textarea
                  rows={2}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. State the Raft Election Safety rule"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Back (Answer)</label>
                <textarea
                  rows={3}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. At most one leader can be elected in a given term."
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Target Deck</label>
                  <select
                    value={newDeckId}
                    onChange={(e) => setNewDeckId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value as CardFormat)}
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-200"
                  >
                    <option value="concept">Concept</option>
                    <option value="formula">Formula</option>
                    <option value="basic">Basic QA</option>
                    <option value="code">Code Snippet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Source Reference (Optional)</label>
                <input
                  type="text"
                  value={newSourceRef}
                  onChange={(e) => setNewSourceRef(e.target.value)}
                  placeholder="e.g. Textbook Ch. 5, page 42"
                  className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-slate-100 placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
