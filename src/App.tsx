
import React, { lazy, Suspense, useState } from 'react';

import { ThemeProvider } from './context/ThemeProvider';
import { Header, type NavModule } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

import { Dashboard } from './pages/Dashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';

import { useAnalytics } from './context/AnalyticsContext';
import { AnalyticsProvider } from './context/AnalyticsContext.tsx';

// Lazy-loaded application modules
const PagingPage = lazy(() =>
  import('./pages/PagingPage').then((module) => ({
    default: module.PagingPage,
  }))
);

const SegmentationPage = lazy(() =>
  import('./pages/SegmentationPage').then((module) => ({
    default: module.SegmentationPage,
  }))
);

const VirtualMemoryPage = lazy(() =>
  import('./pages/VirtualMemoryPage').then((module) => ({
    default: module.VirtualMemoryPage,
  }))
);

const ReplacementPage = lazy(() =>
  import('./pages/ReplacementPage').then((module) => ({
    default: module.ReplacementPage,
  }))
);

const AllocationPage = lazy(() =>
  import('./pages/AllocationPage').then((module) => ({
    default: module.AllocationPage,
  }))
);

const AnalyticsPage = lazy(() =>
  import('./pages/AnalyticsPage').then((module) => ({
    default: module.AnalyticsPage,
  }))
);

// Main application content
const AppContent: React.FC = () => {
  const [activeModule, setActiveModule] =
    useState<NavModule>('dashboard');

  const [showProfile, setShowProfile] = useState(false);

  const { reports, captureError } = useAnalytics();

  const { user, loading, signOut } = useAuth();

  // Authentication loading state
  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-muted)]"
        role="status"
        aria-live="polite"
      >
        Checking your session...
      </div>
    );
  }

  // Show authentication page when signed out
  if (!user) {
    return <AuthPage />;
  }

  // Handle module navigation
  const handleModuleSelect = (module: NavModule) => {
    setActiveModule(module);
    setShowProfile(false);
  };

  // Open Profile page
  const handleOpenProfile = () => {
    setShowProfile(true);
  };

  // Handle sign out
  const handleSignOut = () => {
    void signOut();
  };

  // Render selected module
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'paging':
        return (
          <PagingPage
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'segmentation':
        return (
          <SegmentationPage
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'virtual-memory':
        return (
          <VirtualMemoryPage
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'replacement':
        return (
          <ReplacementPage
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'allocation':
        return (
          <AllocationPage
            onBack={() => setActiveModule('dashboard')}
          />
        );

      case 'analytics':
        return (
          <AnalyticsPage
            reports={reports}
            captureError={captureError}
          />
        );

      case 'dashboard':
      default:
        return (
          <Dashboard
            onNavigate={(module) => setActiveModule(module)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)] text-[var(--color-text-main)] transition-colors duration-200">

      {/* Application Header */}
      <Header
        activeModule={activeModule}
        onSelectModule={handleModuleSelect}
        onOpenProfile={handleOpenProfile}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 sm:py-8">
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              className="text-sm text-[var(--color-text-muted)]"
            >
              Loading module...
            </div>
          }
        >
          {showProfile ? (
            <ProfilePage />
          ) : (
            renderActiveModule()
          )}
        </Suspense>
      </main>

      {/* Application Footer */}
      <Footer />
    </div>
  );
};

// Root application with context providers
export function App() {
  return (
    <ThemeProvider>
      <AnalyticsProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AnalyticsProvider>
    </ThemeProvider>
  );
}

export default App;
