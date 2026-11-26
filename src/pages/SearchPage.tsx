import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, X } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { formatEditorialDate } from '../lib/sanitize';

export function SearchPage() {
  const { publishedNews, publishedWritings, debates, approvedArguments, categories } = useWds();
  const [searchParams, setSearchParams] = useSearchParams();
  const [queryText, setQueryText] = useState(searchParams.get('q') || '');
  const [filter, setFilter] = useState<'all' | 'news' | 'debates' | 'arguments' | 'writers'>('all');

  const results = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return [];

    const matches: Array<{
      id: string;
      group: 'News' | 'Debates' | 'Arguments' | 'Writers' | 'Categories';
      title: string;
      snippet: string;
      meta: string;
      to: string;
    }> = [];

    if (filter === 'all' || filter === 'news') {
      publishedNews.forEach((n) => {
        const hay = `${n.title} ${n.subheading || ''} ${n.excerpt} ${n.categoryName} ${(n.tags || []).join(' ')} ${n.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `n-${n.id}`,
            group: 'News',
            title: n.title,
            snippet: n.excerpt,
            meta: `${n.categoryName} · ${n.authorName} · ${formatEditorialDate(n.publishedAt || n.createdAt)}`,
            to: `/news/${n.id}`,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'debates') {
      debates.forEach((d) => {
        const hay = `${d.title} ${d.question} ${d.description}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `d-${d.id}`,
            group: 'Debates',
            title: d.question,
            snippet: d.description,
            meta: `${d.status.toUpperCase()} · ${d.approvedArgumentsCount} arguments`,
            to: `/debators/${d.id}`,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'arguments') {
      approvedArguments.forEach((a) => {
        const hay = `${a.title} ${a.mainArgument} ${a.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `a-${a.id}`,
            group: 'Arguments',
            title: a.title,
            snippet: a.mainArgument.slice(0, 180),
            meta: `${a.position} · ${a.authorName} · ${a.supportCount} supports`,
            to: `/debators/${a.debateId}`,
          });
        }
      });
    }

    if (filter === 'all' || filter === 'writers') {
      publishedWritings.forEach((w) => {
        const hay = `${w.title} ${w.excerpt || ''} ${w.body.slice(0, 400)} ${w.categoryName} ${w.authorName}`.toLowerCase();
        if (hay.includes(q)) {
          matches.push({
            id: `w-${w.id}`,
            group: 'Writers',
            title: w.title,
            snippet: w.excerpt || w.body.slice(0, 160),
            meta: `${w.categoryName} · ${w.authorName}`,
            to: `/writers/${w.id}`,
          });
        }
      });
    }

    if (filter === 'all') {
      categories.forEach((c) => {
        if (c.name.toLowerCase().includes(q)) {
          matches.push({
            id: `c-${c.id}`,
            group: 'Categories',
            title: c.name,
            snippet: `Browse all entries under ${c.name}.`,
            meta: c.pillar === 'news' ? 'News Category' : 'Writers Category',
            to: c.pillar === 'news' ? `/news?category=${c.slug}` : `/writers?category=${c.slug}`,
          });
        }
      });
    }

    return matches;
  }, [queryText, filter, publishedNews, publishedWritings, debates, approvedArguments, categories]);

  const updateQuery = (val: string) => {
    setQueryText(val);
    if (val.trim()) setSearchParams({ q: val }, { replace: true });
    else setSearchParams({}, { replace: true });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
          Unified Discovery
        </p>
        <h1 className="font-serif text-4xl font-bold text-[#0B1528] dark:text-[#F1EFEA] mb-6">
          Search WDS Archive
        </h1>

        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700">
          <Search className="w-5 h-5 text-[#7A808C]" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search articles, debates, arguments, poems, authors, or tags..."
            className="w-full bg-transparent text-base text-[#1A1D24] dark:text-[#F1EFEA] focus:outline-none"
          />
          {queryText && (
            <button
              type="button"
              onClick={() => updateQuery('')}
              className="text-xs text-[#5C626F] hover:text-[#0B1528] dark:text-slate-400 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto">
        {(['all', 'news', 'debates', 'arguments', 'writers'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 text-xs font-medium border capitalize cursor-pointer ${
              filter === tab
                ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {!queryText.trim() ? (
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-10 text-center text-sm text-[#5C626F] dark:text-slate-400">
          Enter a keyword, author name, tag, or debate topic above to search across all published WDS content.
        </div>
      ) : results.length === 0 ? (
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center space-y-3">
          <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA]">
            No published results for "{queryText}"
          </p>
          <button
            type="button"
            onClick={() => updateQuery('')}
            className="text-sm text-[#8C6D32] dark:text-[#C9A458] underline cursor-pointer"
          >
            Clear search query
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#D8D3C8] dark:divide-slate-800 border-y border-[#D8D3C8] dark:border-slate-800">
          {results.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className="py-5 flex items-center justify-between gap-6 group hover:bg-[#F2EFE8]/60 dark:hover:bg-[#101829] px-2 transition-colors"
            >
              <div className="space-y-1">
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458]">
                  {item.group} · <span className="text-[#5C626F] dark:text-slate-400">{item.meta}</span>
                </div>
                <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline">
                  {item.title}
                </h2>
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 line-clamp-2">
                  {item.snippet}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#7A808C] shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
