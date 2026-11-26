import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PenLine, Search } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { formatEditorialDate, toMillis } from '../lib/sanitize';
import { EditorialImage } from '../components/common/EditorialImage';

const PAGE_SIZE = 6;

export function NewsPage() {
  const { publishedNews, newsCategories, loadingPublic } = useWds();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'all';
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const featuredArticle = useMemo(
    () => publishedNews.find((n) => n.featured) || publishedNews[0] || null,
    [publishedNews]
  );

  const filteredNews = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const list = publishedNews.filter((item) => {
      if (selectedCategory !== 'all') {
        const catMatch =
          item.categoryId === selectedCategory ||
          item.categoryName.toLowerCase().replace(/\s+/g, '-') === selectedCategory.toLowerCase();
        if (!catMatch) return false;
      }
      if (q) {
        const hay = `${item.title} ${item.subheading || ''} ${item.excerpt} ${item.authorName} ${(item.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'popular') {
      return [...list].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }
    return [...list].sort(
      (a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt)
    );
  }, [publishedNews, selectedCategory, searchText, sortBy]);

  const displayedNews = filteredNews.slice(0, visibleCount);

  const handleCategoryChange = (slugOrAll: string) => {
    setSelectedCategory(slugOrAll);
    setVisibleCount(PAGE_SIZE);
    if (slugOrAll === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slugOrAll);
    }
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
      {/* Masthead */}
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
            Pillar 01 · WDS Newsroom
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
            News & Campus Reporting
          </h1>
          <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 mt-3 max-w-2xl">
            Verified school updates, academic dispatches, event coverage, and editorial commentary from Our Lady of Grace Senior High School.
          </p>
        </div>
        <Link
          to="/submit?pillar=news"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 whitespace-nowrap shrink-0"
        >
          <PenLine className="w-4 h-4" />
          Submit News Tip / Article
        </Link>
      </div>

      {/* Featured Story */}
      {featuredArticle && selectedCategory === 'all' && !searchText.trim() && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border-b border-[#D8D3C8] dark:border-slate-800 pb-12">
          <div className="lg:col-span-7">
            <Link to={`/news/${featuredArticle.id}`} className="block h-full">
              <EditorialImage
                src={featuredArticle.coverImage}
                alt={featuredArticle.title}
                title={featuredArticle.title}
                aspectClass="aspect-[16/10] lg:h-full"
                className="border border-[#E5E0D5] dark:border-slate-800"
              />
            </Link>
          </div>
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-3">
              <span className="font-semibold uppercase tracking-wider text-[#8C6D32] dark:text-[#C9A458]">
                Featured · {featuredArticle.categoryName}
              </span>
              <span className="mx-2">·</span>
              <span>{formatEditorialDate(featuredArticle.publishedAt || featuredArticle.createdAt)}</span>
              <span className="mx-2">·</span>
              <span>{featuredArticle.readingTime} min read</span>
            </div>
            <Link to={`/news/${featuredArticle.id}`} className="group">
              <h2 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-3">
                {featuredArticle.title}
              </h2>
            </Link>
            {featuredArticle.subheading && (
              <p className="text-base font-medium text-[#242833] dark:text-slate-200 mb-3">
                {featuredArticle.subheading}
              </p>
            )}
            <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-5">
              {featuredArticle.excerpt}
            </p>
            <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400">
              <span>By {featuredArticle.authorName}</span>
              <Link to={`/news/${featuredArticle.id}`} className="font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                Read full report →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Filter & Search Toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => handleCategoryChange('all')}
              className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                  : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700 hover:border-[#0B1528]'
              }`}
            >
              All Categories
            </button>
            {newsCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                  selectedCategory === cat.slug || selectedCategory === cat.id
                    ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                    : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700 hover:border-[#0B1528]'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#7A808C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filter articles..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'popular')}
              aria-label="Sort news articles"
              className="px-3 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      {loadingPublic ? (
        <div className="py-12 text-center text-sm text-[#5C626F] dark:text-slate-400">
          Loading newsroom dispatches...
        </div>
      ) : displayedNews.length === 0 ? (
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center space-y-3">
          <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA]">
            No published news matches your selection.
          </p>
          <p className="text-sm text-[#5C626F] dark:text-slate-400">
            Try another category or submit a campus story for editorial review.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {displayedNews.map((article) => (
              <article key={article.id} className="group flex flex-col justify-between border-b border-[#E5E0D5] dark:border-slate-800 pb-6">
                <Link to={`/news/${article.id}`} className="block">
                  <EditorialImage
                    src={article.coverImage}
                    alt={article.title}
                    title={article.title}
                    aspectClass="aspect-[4/3]"
                    className="mb-4 border border-[#E5E0D5] dark:border-slate-800"
                  />
                  <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-2">
                    <span className="font-medium text-[#8C6D32] dark:text-[#C9A458]">{article.categoryName}</span>
                    <span className="mx-1.5">·</span>
                    <span>{formatEditorialDate(article.publishedAt || article.createdAt)}</span>
                    <span className="mx-1.5">·</span>
                    <span>{article.readingTime} min read</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#4A4F5A] dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                    {article.excerpt}
                  </p>
                </Link>
                <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400 pt-2">
                  <span>By {article.authorName}</span>
                  <span className="font-mono-tabular">{article.likesCount || 0} likes</span>
                </div>
              </article>
            ))}
          </div>

          {visibleCount < filteredNews.length && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="px-6 py-2.5 text-sm font-medium border border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458] hover:bg-[#0B1528] hover:text-white dark:hover:bg-[#C9A458] dark:hover:text-[#0B111E] transition-colors cursor-pointer"
              >
                Load More Stories ({filteredNews.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
