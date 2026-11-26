import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Moon, Search, ShieldCheck, Sun, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useWds } from '../../contexts/WdsContext';
import { SearchModal } from '../common/SearchModal';

const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/news', label: 'News' },
  { to: '/debators', label: 'Debators' },
  { to: '/writers', label: 'Writers' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/about', label: 'About WDS' },
];

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const { adminUser } = useWds();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E5E0D5] dark:border-slate-800 bg-[#FAF8F4]/95 dark:bg-[#0B111E]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#0B1528] dark:text-[#F1EFEA] whitespace-nowrap shrink-0"
          >
            WDS
          </Link>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Primary Navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'border-[#B68D40] text-[#0B1528] dark:text-white'
                      : 'border-transparent text-[#4A4F5A] dark:text-slate-300 hover:text-[#0B1528] dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Search, Theme Toggle, and Visually Distinct Admin Sign-In */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search WDS"
              className="p-2.5 text-[#4A4F5A] dark:text-slate-300 hover:text-[#0B1528] dark:hover:text-white transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              className="p-2.5 text-[#4A4F5A] dark:text-slate-300 hover:text-[#0B1528] dark:hover:text-white transition-colors cursor-pointer"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458] hover:bg-[#0B1528] hover:text-white dark:hover:bg-[#C9A458] dark:hover:text-[#0B111E] transition-colors whitespace-nowrap shrink-0"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {adminUser ? 'Admin Console' : 'Admin Sign-in'}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2.5 text-[#0B1528] dark:text-[#F1EFEA] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/55" onClick={() => setMobileOpen(false)}>
          <div
            className="ml-auto w-72 max-w-[85vw] h-full bg-[#FAF8F4] dark:bg-[#0B111E] border-l border-[#E5E0D5] dark:border-slate-800 p-6 flex flex-col justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E5E0D5] dark:border-slate-800 mb-6">
                <span className="font-serif text-xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">WDS</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 text-[#4A4F5A] dark:text-slate-300 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `py-3 px-2 text-base font-medium border-b border-[#ECE8DF] dark:border-slate-800/70 ${
                        isActive
                          ? 'text-[#0B1528] dark:text-[#C9A458] font-semibold'
                          : 'text-[#4A4F5A] dark:text-slate-300'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
                <Link
                  to="/submit"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4 py-3 px-4 text-center text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E]"
                >
                  Submit Your Work
                </Link>
              </nav>
            </div>

            <div className="pt-6 border-t border-[#E5E0D5] dark:border-slate-800">
              <Link
                to="/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-xs font-medium border border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458]"
              >
                <ShieldCheck className="w-4 h-4" />
                {adminUser ? 'Admin Console' : 'Admin Sign-in'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
