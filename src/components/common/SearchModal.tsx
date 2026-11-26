import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Search, X } from 'lucide-react';
import { useWds } from '../../contexts/WdsContext';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY = 'wds_recent_searches_v1';
const SUGGESTIONS = ['Poetry', 'Symposium', 'Artificial Intelligence', 'Editorial', 'Reading'];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { publishedNews, publishedWritings, debates, approvedArguments, categories } = useWds();
  const [queryText, setQueryText] = useState('');
  const [filterPillar, setFilterPillar] = useState<'all' | 'news' | 'debates' | 'writers'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const recordSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const updated = [clean, ...recentSearches.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage error
    }
  };

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];

    const items: Array<{
      id: string;
      pillar: 'News' | 'Debators' | 'Writers' | 'Category';
      title: string;
      subtitle: string;
      to: string;
    }> = [];

    if (filterPillar === 'all' || filterPillar === 'news') {
      publishedNews.forEach((n) => {
        const hay = `${n.title} ${n.excerpt} ${n.categoryName} ${(n.tags || []).join(' ')} ${n.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          items.push({
            id: `n-${n.id}`,
            pillar: 'News',
            title: n.title,
            subtitle: `${n.categoryName} · ${n.authorName}`,
            to: `/news/${n.id}`,
          });
        }
      });
    }

    if (filterPillar === 'all' || filterPillar === 'debates') {
      debates.forEach((d) => {
        const hay = `${d.title} ${d.question} ${d.description}`.toLowerCase();
        if (hay.includes(q)) {
          items.push({
            id: `d-${d.id}`,
            pillar: 'Debators',
            title: d.title,
            subtitle: `${d.status.toUpperCase()} · ${d.approvedArgumentsCount} arguments`,
            to: `/debators/${d.id}`,
          });
        }
      });
      approvedArguments.forEach((a) => {
        const hay = `${a.title} ${a.mainArgument} ${a.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          items.push({
            id: `a-${a.id}`,
            pillar: 'Debators',
            title: a.title,
            subtitle: `Argument (${a.position}) · ${a.authorName}`,
            to: `/debators/${a.debateId}`,
          });
        }
      });
    }

    if (filterPillar === 'all' || filterPillar === 'writers') {
      publishedWritings.forEach((w) => {
        const hay = `${w.title} ${w.excerpt || ''} ${w.categoryName} ${w.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          items.push({
            id: `w-${w.id}`,
            pillar: 'Writers',
            title: w.title,
            subtitle: `${w.categoryName} · ${w.authorName}`,
            to: `/writers/${w.id}`,
          });
        }
      });
    }

    if (filterPillar === 'all') {
      categories.forEach((c) => {
        if (c.name.toLowerCase().includes(q)) {
          items.push({
            id: `c-${c.id}`,
            pillar: 'Category',
            title: c.name,
            subtitle: `${c.pillar === 'news' ? 'News' : 'Writers'} Category`,
            to: c.pillar === 'news' ? `/news?category=${c.slug}` : `/writers?category=${c.slug}`,
          });
        }
      });
    }

    return items.slice(0, 12);
  }, [queryText, filterPillar, publishedNews, publishedWritings, debates, approvedArguments, categories]);

  if (!isOpen) return null;

  const handleSelect = (to: string) => {
    recordSearch(queryText);
    onClose();
    navigate(to);
  };

  const handleFullSearchPage = (e: React.FormEvent) => {
    e.preventDefault();
    recordSearch(queryText);
    onClose();
    navigate(`/search?q=${encodeURIComponent(queryText.trim())}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-16 sm:pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search WDS"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#FAF8F4] dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleFullSearchPage} className="flex items-center gap-3 px-5 py-4 border-b border-[#E5E0D5] dark:border-slate-800">
          <Search className="w-5 h-5 text-[#5C626F] dark:text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search news, debates, arguments, poetry, writers, or tags..."
            className="w-full bg-transparent text-base text-[#1A1D24] dark:text-[#F1EFEA] placeholder:text-[#7A808C] focus:outline-none"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => setQueryText('')}
              aria-label="Clear search"
              className="p-1.5 text-[#5C626F] hover:text-[#1A1D24] dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-medium text-[#5C626F] dark:text-slate-400 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer"
          >
            Esc
          </button>
        </form>

        <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[#E5E0D5] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0D1424] overflow-x-auto">
          {(['all', 'news', 'debates', 'writers'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterPillar(tab)}
              className={`px-3 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                filterPillar === tab
                  ? 'bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E]'
                  : 'text-[#4A4F5A] dark:text-slate-300 hover:text-[#0B1528] dark:hover:text-white'
              }`}
            >
              {tab === 'all' ? 'All Pillars' : tab === 'news' ? 'News' : tab === 'debates' ? 'Debators' : 'Writers'}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {!queryText.trim() ? (
            <div className="space-y-6">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs uppercase tracking-widest text-[#5C626F] dark:text-slate-400">
                      Recent Searches
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRecentSearches([]);
                        localStorage.removeItem(RECENT_SEARCHES_KEY);
                      }}
                      className="text-xs text-[#8C6D32] dark:text-[#C9A458] hover:underline cursor-pointer"
                    >
                      Clear history
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQueryText(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] dark:hover:border-[#C9A458] cursor-pointer"
                      >
                        <Clock className="w-3 h-3 text-[#7A808C]" />
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs uppercase tracking-widest text-[#5C626F] dark:text-slate-400 mb-2.5">
                  Suggested Topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQueryText(s)}
                      className="px-3 py-1.5 text-xs bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] dark:hover:border-[#C9A458] cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-[#4A4F5A] dark:text-slate-300 mb-2">
                No matching entries found for "{queryText}".
              </p>
              <button
                type="button"
                onClick={() => setQueryText('')}
                className="text-xs font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline cursor-pointer"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E0D5] dark:divide-slate-800">
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.to)}
                  className="w-full text-left py-3.5 px-2 flex items-center justify-between gap-4 hover:bg-[#F2EFE8] dark:hover:bg-[#152036] transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-[#8C6D32] dark:text-[#C9A458] mb-0.5">
                      {item.pillar} · {item.subtitle}
                    </div>
                    <div className="font-serif text-base font-medium text-[#1A1D24] dark:text-[#F1EFEA] truncate">
                      {item.title}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#7A808C] shrink-0" />
                </button>
              ))}
              <div className="pt-3 text-right">
                <button
                  type="button"
                  onClick={handleFullSearchPage}
                  className="text-xs font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline cursor-pointer"
                >
                  Open full search view →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
