import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Palette, Check } from 'lucide-react';
import { useTheme, type Theme } from '../../context/ThemeContext';

export type NavModule = 'dashboard' | 'paging' | 'segmentation' | 'virtual-memory' | 'replacement' | 'allocation';

interface HeaderProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeModule, onSelectModule }) => {
  const { theme, setTheme, themeNames } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems: { id: NavModule; label: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Studio Overview' },
    { id: 'paging', label: 'Paging Lab', badge: 'Live' },
    { id: 'segmentation', label: 'Segmentation', badge: 'Live' },
    { id: 'virtual-memory', label: 'Virtual Memory', badge: 'Live' },
    { id: 'replacement', label: 'Page Replacement', badge: 'v0.5.0' },
    { id: 'allocation', label: 'Dynamic Allocation', badge: 'v0.6.0' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-[var(--color-border-subtle)] bg-[var(--glass-bg)] px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Version Badge */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectModule('dashboard')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg shadow-[var(--color-accent-glow)]">
            <Cpu className="w-5 h-5 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent-tertiary)] border-2 border-[var(--color-bg-base)]"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-[var(--color-text-main)]">
                Memory<span className="text-[var(--color-accent-primary)]">Flow</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)]">
                v0.4.0
              </span>
            </div>
            <p className="text-[11px] text-[var(--color-text-subtle)] hidden sm:block">
              Dynamic Memory Management Visualizer • CA2
            </p>
          </div>
        </div>

        {/* Studio Navigation Pills */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--color-accent-primary)',
                        color: 'var(--color-accent-contrast)',
                        boxShadow: '0 4px 14px 0 var(--color-accent-glow)',
                      }
                    : undefined
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'font-semibold'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-muted)]'
                }`}
              >
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                      isActive
                        ? 'bg-black/20 text-current'
                        : 'bg-[var(--color-bg-base)] text-[var(--color-text-subtle)]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Action Utilities (Theme Selector & GitHub Link) */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Theme Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)] transition text-xs font-medium"
              title="Switch Visual Theme"
              aria-haspopup="true"
              aria-expanded={themeMenuOpen}
              aria-label="Switch visual theme"
            >
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
              <span className="hidden sm:inline capitalize">{theme}</span>
            </button>

            {themeMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
                role="menu"
                aria-label="Visual Themes"
              >
                <div className="px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                  Visual Themes
                </div>
                {themeNames.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      role="menuitem"
                      onClick={() => {
                        setTheme(t.id as Theme);
                        setThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition mb-0.5 ${
                        isSelected
                          ? 'bg-[var(--color-bg-muted)] text-[var(--color-text-main)] font-semibold'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-surface-elevated)] hover:text-[var(--color-text-main)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full border border-white/20 shadow-sm"
                          style={{ backgroundColor: t.accentColor }}
                        />
                        <div>
                          <div className="text-xs leading-none">{t.label}</div>
                          <div className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
                            {t.description.split(' ')[0]} mode
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* GitHub Repository Link */}
          <a
            href="https://github.com/PrinceChoudhary12/MemoryFlow"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)] transition text-xs font-medium"
            title="Open GitHub Repository"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="hidden md:inline">GitHub</span>
          </a>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="flex md:hidden overflow-x-auto gap-1 pt-2 pb-1 no-scrollbar border-t border-[var(--color-border-subtle)] mt-2" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectModule(item.id)}
              style={
                isActive
                  ? {
                      backgroundColor: 'var(--color-accent-primary)',
                      color: 'var(--color-accent-contrast)',
                    }
                  : undefined
              }
              className={`whitespace-nowrap px-2.5 py-1 rounded-md text-xs font-medium transition ${
                isActive
                  ? 'font-semibold shadow-sm'
                  : 'text-[var(--color-text-muted)] bg-[var(--color-bg-surface-elevated)]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
