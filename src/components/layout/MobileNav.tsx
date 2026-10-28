import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Swords,
  BrainCircuit,
  Briefcase,
} from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';

export const MobileNav: React.FC = () => {
  const { dueFlashcardsCount, weakTopics, tasks } = useStudyOS();
  const activeTasksCount = tasks.filter((t) => t.status !== 'done').length;

  const items = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/learning',
      label: 'Study',
      icon: GraduationCap,
      badge: null,
    },
    {
      to: '/arena',
      label: 'Quizzes',
      icon: Swords,
      badge: weakTopics.length > 0 ? `${weakTopics.length}` : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      to: '/memory',
      label: 'Cards',
      icon: BrainCircuit,
      badge: dueFlashcardsCount > 0 ? `${dueFlashcardsCount}` : null,
      badgeColor: 'bg-amber-400 text-slate-950',
    },
    {
      to: '/workbench',
      label: 'Tasks',
      icon: Briefcase,
      badge: activeTasksCount > 0 ? `${activeTasksCount}` : null,
      badgeColor: 'bg-indigo-500 text-white',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-950/85 px-2 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] pt-1.5 backdrop-blur-xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)] md:hidden">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group relative flex flex-1 flex-col items-center justify-center rounded-xl py-1 transition-all duration-200 ${
                  isActive
                    ? 'text-indigo-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`relative flex items-center justify-center rounded-xl px-3 py-1 transition-all ${
                      isActive
                        ? 'bg-indigo-600/15 border border-indigo-500/25 shadow-sm shadow-indigo-500/10 scale-105'
                        : 'group-hover:bg-slate-900/40'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.badge && (
                      <span
                        className={`absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-mono font-bold shadow-sm ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 text-[10px] tracking-tight leading-none truncate max-w-[64px]">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
