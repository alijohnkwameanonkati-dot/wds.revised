import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Feather, Sparkles } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { GENERATED_IMAGES } from '../lib/defaults';
import { formatEditorialDate, toMillis } from '../lib/sanitize';
import { EditorialImage } from '../components/common/EditorialImage';

export function WritersPage() {
  const { publishedWritings, writerCategories, loadingPublic } = useWds();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');

  const featuredWork = useMemo(
    () => publishedWritings.find((w) => w.featured) || publishedWritings[0] || null,
    [publishedWritings]
  );

  const editorsPicks = useMemo(
    () => publishedWritings.filter((w) => w.editorsPick).slice(0, 3),
    [publishedWritings]
  );

  const poetrySpotlight = useMemo(
    () =>
      publishedWritings.find((w) => w.poetrySpotlight) ||
      publishedWritings.find((w) => w.categoryName.toLowerCase() === 'poetry') ||
      null,
    [publishedWritings]
  );

  const filteredWritings = useMemo(() => {
    const base = publishedWritings.filter((w) => {
      if (selectedCategory === 'all') return true;
      return (
        w.categoryId === selectedCategory ||
        w.categoryName.toLowerCase().replace(/\s+/g, '-') === selectedCategory.toLowerCase()
      );
    });
    if (sortBy === 'popular') {
      return [...base].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }
    return [...base].sort(
      (a, b) => toMillis(b.publishedAt || b.createdAt) - toMillis(a.publishedAt || a.createdAt)
    );
  }, [publishedWritings, selectedCategory, sortBy]);

  const featuredWriters = useMemo(() => {
    const map = new Map<string, { name: string; bio?: string; count: number; latestId: string }>();
    publishedWritings.forEach((w) => {
      const key = w.authorName.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          name: w.authorName,
          bio: w.bioApproved ? w.authorBio : undefined,
          count: 1,
          latestId: w.id,
        });
      }
    });
    return Array.from(map.values()).slice(0, 4);
  }, [publishedWritings]);

  const handleCat = (slugOrAll: string) => {
    setSelectedCategory(slugOrAll);
    if (slugOrAll === 'all') searchParams.delete('category');
    else searchParams.set('category', slugOrAll);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* Expressive Literary Masthead */}
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
            Pillar 03 · WDS Literary Magazine
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold italic text-[#0B1528] dark:text-[#F1EFEA]">
            The Writers Journal
          </h1>
          <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 mt-3 max-w-2xl">
            Original poetry, short fiction, personal essays, reflections, and speeches crafted by students of Our Lady of Grace Senior High School.
          </p>
        </div>
        <Link
          to="/submit?pillar=writers"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 whitespace-nowrap shrink-0"
        >
          <Feather className="w-4 h-4" />
          Submit Creative Work
        </Link>
      </div>

      {/* Featured Writing + Poetry Spotlight */}
      {(featuredWork || poetrySpotlight) && selectedCategory === 'all' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {featuredWork && (
            <div className="lg:col-span-7 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458] uppercase tracking-widest mb-3">
                  Featured Work · {featuredWork.categoryName}
                </div>
                <Link to={`/writers/${featuredWork.id}`} className="group block">
                  <EditorialImage
                    src={featuredWork.coverImage || GENERATED_IMAGES.writersManuscript}
                    alt={featuredWork.title}
                    title={featuredWork.title}
                    aspectClass="aspect-[16/9]"
                    className="mb-5 border border-[#E5E0D5] dark:border-slate-800"
                  />
                  <h2 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-3">
                    {featuredWork.title}
                  </h2>
                </Link>
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-4">
                  {featuredWork.excerpt || featuredWork.body.slice(0, 180)}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400 pt-4 border-t border-[#ECE8DF] dark:border-slate-800">
                <span>By {featuredWork.authorName} · {featuredWork.wordCount} words</span>
                <Link to={`/writers/${featuredWork.id}`} className="font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                  Read piece →
                </Link>
              </div>
            </div>
          )}

          {poetrySpotlight && (
            <div className="lg:col-span-5 border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-4">
                  <span>Poetry Spotlight</span>
                  <Sparkles className="w-4 h-4" />
                </div>
                <Link to={`/writers/${poetrySpotlight.id}`} className="group block">
                  <h3 className="font-serif text-2xl sm:text-3xl font-semibold italic text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-4">
                    {poetrySpotlight.title}
                  </h3>
                </Link>
                <blockquote className="font-serif text-base sm:text-lg leading-relaxed text-[#242833] dark:text-slate-200 whitespace-pre-line border-y border-[#D8D3C8] dark:border-slate-700 py-5 my-4">
                  {poetrySpotlight.body.split('\n\n')[0]}
                </blockquote>
              </div>
              <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400 pt-2">
                <span>By {poetrySpotlight.authorName}</span>
                <Link to={`/writers/${poetrySpotlight.id}`} className="font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline">
                  Read full poem →
                </Link>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Editor's Picks & Featured Writers */}
      {editorsPicks.length > 0 && selectedCategory === 'all' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-y border-[#D8D3C8] dark:border-slate-800 py-10">
          <div className="lg:col-span-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-6">
              Editor&apos;s Picks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {editorsPicks.map((pick) => (
                <Link key={pick.id} to={`/writers/${pick.id}`} className="group block">
                  <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-1.5">
                    {pick.categoryName} · {pick.readingTime} min
                  </div>
                  <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-2">
                    {pick.title}
                  </h3>
                  <p className="text-xs text-[#4A4F5A] dark:text-slate-300">By {pick.authorName}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 lg:border-l border-[#D8D3C8] dark:border-slate-800 lg:pl-8">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-5">
              Featured Writers
            </h2>
            <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
              {featuredWriters.map((writer) => (
                <Link key={writer.name} to={`/writers/${writer.latestId}`} className="block py-2.5 group">
                  <div className="flex items-baseline justify-between">
                    <span className="font-medium text-sm text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline">
                      {writer.name}
                    </span>
                    <span className="font-mono-tabular text-xs text-[#7A808C]">
                      {writer.count} {writer.count === 1 ? 'work' : 'works'}
                    </span>
                  </div>
                  {writer.bio && (
                    <p className="text-xs text-[#5C626F] dark:text-slate-400 line-clamp-1 mt-0.5">
                      {writer.bio}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Category Navigation & Archive */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => handleCat('all')}
              className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 border cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                  : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
              }`}
            >
              All Genres
            </button>
            {writerCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCat(cat.slug)}
                className={`px-3.5 py-2 text-xs font-medium whitespace-nowrap shrink-0 border cursor-pointer ${
                  selectedCategory === cat.slug || selectedCategory === cat.id
                    ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                    : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
            aria-label="Sort creative works"
            className="px-3 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 shrink-0"
          >
            <option value="latest">Latest Submissions</option>
            <option value="popular">Popular Writing</option>
          </select>
        </div>

        {loadingPublic ? (
          <p className="text-sm text-[#5C626F] dark:text-slate-400 py-8">Loading literary works...</p>
        ) : filteredWritings.length === 0 ? (
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center space-y-3">
            <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA]">
              No published works in this category yet.
            </p>
            <Link to="/submit?pillar=writers" className="inline-block text-sm font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
              Submit an original piece →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {filteredWritings.map((work) => (
              <article key={work.id} className="group border-b border-[#E5E0D5] dark:border-slate-800 pb-6 flex flex-col justify-between">
                <Link to={`/writers/${work.id}`} className="block">
                  {work.coverImage && (
                    <EditorialImage
                      src={work.coverImage}
                      alt={work.title}
                      title={work.title}
                      aspectClass="aspect-[4/3]"
                      className="mb-4 border border-[#E5E0D5] dark:border-slate-800"
                    />
                  )}
                  <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-2">
                    <span className="font-medium text-[#8C6D32] dark:text-[#C9A458]">{work.categoryName}</span>
                    <span className="mx-1.5">·</span>
                    <span>{formatEditorialDate(work.publishedAt || work.createdAt)}</span>
                    <span className="mx-1.5">·</span>
                    <span>{work.readingTime} min read</span>
                  </div>
                  <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-2">
                    {work.title}
                  </h3>
                  <p className="text-sm text-[#4A4F5A] dark:text-slate-300 line-clamp-3 leading-relaxed mb-3">
                    {work.excerpt || work.body.slice(0, 150)}
                  </p>
                </Link>
                <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400 pt-2">
                  <span>By {work.authorName}</span>
                  <span className="font-mono-tabular">{work.likesCount || 0} appreciations</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
