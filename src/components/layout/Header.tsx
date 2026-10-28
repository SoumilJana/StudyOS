import React, { useState } from 'react';
import {
  Flame,
  Zap,
  Bell,
  Search,
  Play,
  Pause,
  Clock,
  Sparkles,
  Menu,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const {
    timer,
    pauseTimer,
    resumeTimer,
    todayFocusMinutes,
    todayTargetMinutes,
    gamification,
    notifications,
    setIsCommandPaletteOpen,
  } = useStudyOS();

  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const focusPercent = Math.min(100, Math.round((todayFocusMinutes / Math.max(1, todayTargetMinutes)) * 100));

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 backdrop-blur-md md:px-6">
      {/* Left: Hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          onClick={() => navigate('/')}
          className="flex cursor-pointer items-center gap-2.5 font-bold tracking-tight text-white transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-wider text-slate-100">
              STUDY<span className="text-indigo-400">.OS</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
              Personal Learning Kernel
            </span>
          </div>
        </div>
      </div>

      {/* Center: Global Quick Action Search / Cmd+K */}
      <div className="hidden max-w-md flex-1 px-4 lg:block">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 shadow-inner hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <span>Search topics, exams, flashcards, tasks...</span>
          </span>
          <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Timer Chip, Stats & Badges */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Timer Chip */}
        <div
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
            timer.isRunning && !timer.isPaused
              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
              : timer.isPaused
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-slate-800 bg-slate-900/60 text-slate-400'
          }`}
        >
          <button
            onClick={() => navigate('/focus')}
            className="flex items-center gap-1.5 font-mono font-medium hover:underline"
            title="Open Focus Room"
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimer(timer.secondsLeft)}</span>
            <span className="hidden text-[10px] uppercase sm:inline">
              ({timer.mode})
            </span>
          </button>

          {timer.isRunning ? (
            timer.isPaused ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  resumeTimer();
                }}
                className="rounded p-0.5 hover:text-amber-200"
                title="Resume timer"
              >
                <Play className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  pauseTimer();
                }}
                className="rounded p-0.5 hover:text-indigo-200"
                title="Pause timer"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            )
          ) : null}
        </div>

        {/* Daily Focus Progress Mini Pill */}
        <div
          onClick={() => navigate('/time')}
          className="hidden cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-300 transition-colors hover:border-slate-700 sm:flex"
          title={`Daily target: ${todayFocusMinutes}/${todayTargetMinutes}m (${focusPercent}%)`}
        >
          <span className="text-[11px] text-slate-400 font-medium">Focus:</span>
          <span className="font-mono font-semibold text-slate-100">{todayFocusMinutes}m</span>
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${focusPercent}%` }}
            />
          </div>
        </div>

        {/* Gamification Streak & XP */}
        <div className="flex items-center gap-1.5">
          <div
            onClick={() => navigate('/')}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-400 transition-transform active:scale-95"
            title={`Active streak: ${gamification.currentStreak} days`}
          >
            <Flame className="h-3.5 w-3.5 fill-amber-400" />
            <span>{gamification.currentStreak}d</span>
          </div>

          <div
            onClick={() => navigate('/analytics')}
            className="hidden cursor-pointer items-center gap-1 rounded-lg border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-300 transition-transform active:scale-95 sm:flex"
            title={`Rank: ${gamification.rank} • Total XP: ${gamification.xp}`}
          >
            <Zap className="h-3.5 w-3.5 fill-violet-400" />
            <span>Lv.{gamification.level}</span>
          </div>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative rounded-lg border border-slate-800 bg-slate-900/60 p-2 text-slate-400 transition-colors hover:border-slate-700 hover:text-slate-100"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 p-3 shadow-2xl z-50">
              <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-200">Notifications ({unreadCount} unread)</span>
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-[11px] text-indigo-400 hover:underline"
                >
                  View calendar
                </button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    No active alerts. All caught up!
                  </div>
                ) : (
                  notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.actionUrl) navigate(n.actionUrl);
                        setShowNotifications(false);
                      }}
                      className={`cursor-pointer rounded-lg p-2 text-left transition-colors ${
                        n.read ? 'bg-slate-950/40 text-slate-400' : 'bg-slate-800/60 text-slate-200 border-l-2 border-indigo-500'
                      } hover:bg-slate-800`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        {n.category === 'exam' && <AlertCircle className="h-3 w-3 text-rose-400" />}
                        {n.category === 'revision' && <Calendar className="h-3 w-3 text-amber-400" />}
                        {n.category === 'focus' && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        <span>{n.title}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-tight text-slate-400">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
