import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Swords,
  BrainCircuit,
  CalendarCheck2,
  ClockAlert,
  Hourglass,
  Activity,
  Briefcase,
  FolderArchive,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useStudyOS } from '../../context/StudyOSContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const {
    dueFlashcardsCount,
    dueRevisionsToday,
    weakTopics,
    nearestDeadline,
    tasks,
  } = useStudyOS();

  const activeTasksCount = tasks.filter((t) => t.status !== 'done').length;

  const getNearestDeadlineDays = () => {
    if (!nearestDeadline) return null;
    const diff = new Date(nearestDeadline.dueDate).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days > 0 ? `${days}d` : 'Today';
  };

  const navSections = [
    {
      title: 'CORE',
      items: [
        {
          to: '/',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          to: '/deadlines',
          label: 'Deadlines & Schedule',
          icon: ClockAlert,
          badge: getNearestDeadlineDays(),
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
        },
        {
          to: '/workbench',
          label: 'Tasks',
          icon: Briefcase,
          badge: activeTasksCount > 0 ? `${activeTasksCount}` : null,
          badgeColor: 'bg-slate-700/50 text-slate-300',
        },
      ],
    },
    {
      title: 'STUDY',
      items: [
        {
          to: '/learning',
          label: 'Course Materials',
          icon: GraduationCap,
          badge: null,
        },
        {
          to: '/arena',
          label: 'Practice Quizzes',
          icon: Swords,
          badge: weakTopics.length > 0 ? `${weakTopics.length} weak` : null,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
        },
        {
          to: '/memory',
          label: 'Flashcards',
          icon: BrainCircuit,
          badge: dueFlashcardsCount > 0 ? `${dueFlashcardsCount} due` : null,
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        {
          to: '/focus',
          label: 'Focus Timer',
          icon: Hourglass,
          badge: null,
        },
        {
          to: '/calendar',
          label: 'Calendar',
          icon: CalendarCheck2,
          badge: dueRevisionsToday.length > 0 ? `${dueRevisionsToday.length}` : null,
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
        },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        {
          to: '/resources',
          label: 'Library',
          icon: FolderArchive,
          badge: null,
        },
        {
          to: '/time',
          label: 'Time Logs',
          icon: Activity,
          badge: null,
        },
        {
          to: '/analytics',
          label: 'Analytics',
          icon: BarChart3,
          badge: null,
        },
        {
          to: '/settings',
          label: 'Settings',
          icon: Settings,
          badge: null,
        },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between border-r border-slate-800 bg-slate-950/90 text-slate-300">
      <div className="flex-1 overflow-y-auto px-2 py-4">
        {/* Workspace Groups */}
        <div className="space-y-4">
          {navSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!collapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => onCloseMobile?.()}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/15 text-indigo-400 font-semibold border-l-2 border-indigo-500 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
                    {!collapsed && (
                      <div className="flex flex-1 items-center justify-between overflow-hidden">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                              item.badgeColor || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Footer & Collapse Toggle */}
      <div className="border-t border-slate-800 p-2">
        <button
          onClick={onToggleCollapse}
          className="hidden w-full items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-slate-100 md:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : (
            <div className="flex w-full items-center justify-between px-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>v1.0.0 Alpha</span>
              </span>
              <ChevronLeft className="h-4 w-4" />
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-slate-950 transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
