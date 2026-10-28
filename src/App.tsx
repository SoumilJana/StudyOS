import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudyOSProvider } from './context/StudyOSContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { CommandPalette } from './components/layout/CommandPalette';
import { HourlyCheckinModal } from './components/modals/HourlyCheckinModal';
import { Lock } from 'lucide-react';

// Views
import { CommandCenterView } from './views/CommandCenterView';
import { LearningStudioView } from './views/LearningStudioView';
import { ExamArenaView } from './views/ExamArenaView';
import { MemoryLabView } from './views/MemoryLabView';
import { RevisionCalendarView } from './views/RevisionCalendarView';
import { DeadlinePlannerView } from './views/DeadlinePlannerView';
import { FocusRoomView } from './views/FocusRoomView';
import { TimeIntelligenceView } from './views/TimeIntelligenceView';
import { WorkbenchView } from './views/WorkbenchView';
import { ResourceLibraryView } from './views/ResourceLibraryView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated, isLoading, openAuthModal } = useAuth();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar for Desktop & Mobile Drawer */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header onToggleSidebar={() => setMobileOpen(true)} />

        {/* Unauthenticated Security Banner */}
        {!isAuthenticated && !isLoading && (
          <div className="flex items-center justify-between border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Read-Only Mode:</strong> You are not logged in. You must log in first before you can make changes or add courses, tasks, and deadlines to the database.
              </span>
            </div>
            <button
              onClick={() => openAuthModal('make changes or add records to your database')}
              className="ml-3 shrink-0 rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-slate-950 transition hover:bg-amber-400 shadow-sm"
            >
              Log In First
            </button>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <Routes>
            <Route path="/" element={<CommandCenterView />} />
            <Route path="/learning" element={<LearningStudioView />} />
            <Route path="/arena" element={<ExamArenaView />} />
            <Route path="/memory" element={<MemoryLabView />} />
            <Route path="/calendar" element={<RevisionCalendarView />} />
            <Route path="/deadlines" element={<DeadlinePlannerView />} />
            <Route path="/focus" element={<FocusRoomView />} />
            <Route path="/time" element={<TimeIntelligenceView />} />
            <Route path="/workbench" element={<WorkbenchView />} />
            <Route path="/resources" element={<ResourceLibraryView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>

      {/* Global Command Palette (Cmd+K) */}
      <CommandPalette />

      {/* Hourly Check-in Prompt Modal */}
      <HourlyCheckinModal />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudyOSProvider>
          <AppLayout />
        </StudyOSProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
