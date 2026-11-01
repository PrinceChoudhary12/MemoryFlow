import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { Header, type NavModule } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Dashboard } from './pages/Dashboard';
import { PagingPage } from './pages/PagingPage';
import { SegmentationPage } from './pages/SegmentationPage';
import { VirtualMemoryPage } from './pages/VirtualMemoryPage';
import { ReplacementPage } from './pages/ReplacementPage';
import { AllocationPage } from './pages/AllocationPage';

const AppContent: React.FC = () => {
  const [activeModule, setActiveModule] = useState<NavModule>('dashboard');

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'paging':
        return <PagingPage onBack={() => setActiveModule('dashboard')} />;
      case 'segmentation':
        return <SegmentationPage onBack={() => setActiveModule('dashboard')} />;
      case 'virtual-memory':
        return <VirtualMemoryPage onBack={() => setActiveModule('dashboard')} />;
      case 'replacement':
        return <ReplacementPage onBack={() => setActiveModule('dashboard')} />;
      case 'allocation':
        return <AllocationPage onBack={() => setActiveModule('dashboard')} />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={(mod) => setActiveModule(mod)} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-base)] text-[var(--color-text-main)] transition-colors duration-200">
      <Header activeModule={activeModule} onSelectModule={setActiveModule} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 sm:py-8">
        {renderActiveModule()}
      </main>

      <Footer />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
