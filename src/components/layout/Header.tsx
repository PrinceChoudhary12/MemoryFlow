import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Palette, Check, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export type NavModule =
  | 'dashboard'
  | 'paging'
  | 'segmentation'
  | 'virtual-memory'
  | 'replacement'
  | 'allocation'
  | 'analytics';

interface HeaderProps {
  activeModule: NavModule;
  onSelectModule: (module: NavModule) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeModule, onSelectModule }) => {
  const { theme, setTheme, themeNames } = useTheme();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const themeButtonRef = useRef<HTMLButtonElement>(null);

  const navItems: { id: NavModule; label: string; badge?: string }[] = [
    { id: 'dashboard', label: 'Studio Overview' },
    { id: 'paging', label: 'Paging Lab', badge: 'Live' },
    { id: 'segmentation', label: 'Segmentation', badge: 'Live' },
    { id: 'virtual-memory', label: 'Virtual Memory', badge: 'Live' },
    { id: 'replacement', label: 'Page Replacement', badge: 'Live' },
    { id: 'allocation', label: 'Dynamic Allocation', badge: 'Live' },
    { id: 'analytics', label: 'Analytics', badge: 'New' },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && themeMenuOpen) {
        setThemeMenuOpen(false);
        themeButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [themeMenuOpen]);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-[var(--color-border-subtle)] bg-[var(--glass-bg)] px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand & Version Badge */}
        <button
          type="button"
          className="flex items-center gap-2 sm:gap-3 bg-transparent p-0 text-left"
          aria-label="MemoryFlow home"
          onClick={() => onSelectModule('dashboard')}
        >
          <span className="relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white shadow-lg shadow-[var(--color-accent-glow)]">
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-accent-tertiary)] border-2 border-[var(--color-bg-base)]"></span>
          </span>
          <span className="block">
            <span className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-[var(--color-text-main)]">
                Memory<span className="text-[var(--color-accent-primary)]">Flow</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-[var(--color-bg-muted)] text-[var(--color-accent-primary)] border border-[var(--color-border-medium)]">
                v0.8.0
              </span>
            </span>
            <span className="hidden text-[11px] text-[var(--color-text-subtle)] sm:block">
              Dynamic Memory Management Visualizer
            </span>
          </span>
        </button>

        {/* Studio Navigation Pills */}
        <nav className="hidden min-w-0 flex-1 overflow-x-auto lg:flex items-center gap-1.5 p-1 rounded-xl bg-[var(--color-bg-surface-elevated)] border border-[var(--color-border-subtle)]" aria-label="Main Navigation">
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
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
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
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

        {/* Right Action Utilities (Theme Selector & Application Link) */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          
          {/* Theme Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              ref={themeButtonRef}
              type="button"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 sm:px-2.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)] transition text-xs font-medium"
              title="Switch Visual Theme"
              aria-expanded={themeMenuOpen}
              aria-controls={themeMenuOpen ? 'theme-options' : undefined}
              aria-label="Switch visual theme"
            >
              <Palette className="w-3.5 h-3.5 text-[var(--color-accent-primary)]" />
              <span className="hidden sm:inline capitalize">{theme}</span>
            </button>

            {themeMenuOpen && (
              <div 
                id="theme-options"
                className="absolute right-0 mt-2 w-56 rounded-xl glass-panel shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-subtle)] uppercase tracking-wider">
                  Visual Themes
                </div>
                {themeNames.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setTheme(t.id);
                        setThemeMenuOpen(false);
                        themeButtonRef.current?.focus();
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

          {/* Live Application Link */}
          <a
            href="https://princechoudhary12.github.io/MemoryFlow/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open MemoryFlow"
            className="flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg border border-[var(--color-border-medium)] bg-[var(--color-bg-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-accent-primary)] transition text-xs font-medium"
            title="Open MemoryFlow"
          >
            <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open MemoryFlow</span>
          </a>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <nav className="flex lg:hidden overflow-x-auto gap-1 pt-2 pb-1 no-scrollbar border-t border-[var(--color-border-subtle)] mt-2" aria-label="Mobile Navigation">
        {navItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
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
      </nav>
    </header>
  );
};
