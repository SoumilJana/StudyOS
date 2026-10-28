import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Swords,
  Hourglass,
  CalendarCheck2,
  Briefcase,
} from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';

export const MobileNav: React.FC = () => {
  const { dueFlashcardsCount, weakTopics } = useStudyOS();

  const items = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/arena', label: 'Quizzes', icon: Swords, alert: weakTopics.length > 0 },
    { to: '/focus', label: 'Focus', icon: Hourglass },
    { to: '/workbench', label: 'Tasks', icon: Briefcase },
    { to: '/calendar', label: 'Calendar', icon: CalendarCheck2, alert: dueFlashcardsCount > 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-14 border-t border-slate-800 bg-slate-950/95 px-2 backdrop-blur-md md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-indigo-400 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <div className="relative">
              <Icon className="h-5 w-5" />
              {item.alert && (
                <span className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </div>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
