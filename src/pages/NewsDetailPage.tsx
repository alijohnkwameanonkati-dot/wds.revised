import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Copy, Flag, Heart, Share2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useWds } from '../contexts/WdsContext';
import { formatEditorialDate, toMillis } from '../lib/sanitize';
import { NewsArticle } from '../types/wds';
import { EditorialImage } from '../components/common/EditorialImage';
import { RichContent } from '../components/common/RichContent';
import { ReportModal } from '../components/common/ReportModal';

export function NewsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publishedNews, votedKeys, castVote } = useWds();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [voteNote, setVoteNote] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const liveMatch = useMemo(
    () => publishedNews.find((n) => n.id === id) || null,
    [publishedNews, id]
  );

  useEffect(() => {
    if (liveMatch) {
      setArticle(liveMatch);
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'news', id));
        if (!cancelled) {
          if (snap.exists() && snap.data().status === 'published') {
            setArticle({ id: snap.id, ...(snap.data() as Omit<NewsArticle, 'id'>) });
          } else {
            setArticle(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setArticle(null);
          handleFirestoreError(err, OperationType.GET, `news/${id}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, liveMatch]);

  const related = useMemo(() => {
    if (!article) return [];
    return publishedNews
      .filter((n) => n.id !== article.id)
      .sort((a, b) => (a.categoryId === article.categoryId ? -1 : 1) - (b.categoryId === article.categoryId ? -1 : 1))
      .slice(0, 3);
  }, [publishedNews, article]);

  const hasLiked = id ? votedKeys.has(`news_${id}`) : false;

  const handleLike = async () => {
    if (!article) return;
    const res = await castVote('news', article.id);
    if (res === 'already_voted') {
      setVoteNote('You have already liked this article.');
    } else {
      setVoteNote('Liked.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && article) {
      try {
        await navigator.share({ title: article.title, text: article.excerpt, url: window.location.href });
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopyLink();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#5C626F] dark:text-slate-400">
        Loading article...
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
          Article not available
        </h1>
        <p className="text-sm text-[#4A4F5A] dark:text-slate-300">
          This dispatch may have been archived or is still awaiting moderation.
        </p>
        <Link to="/news" className="inline-flex items-center gap-2 text-sm font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Newsroom
        </Link>
      </div>
    );
  }

  const showUpdated =
    article.updatedAt &&
    article.publishedAt &&
    toMillis(article.updatedAt) - toMillis(article.publishedAt) > 60000;

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <Link
          to="/news"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#5C626F] dark:text-slate-400 hover:text-[#0B1528] dark:hover:text-[#C9A458]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to News
        </Link>
      </div>

      <header className="max-w-3xl mb-10">
        <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-3">
          <span className="font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
            {article.categoryName}
          </span>
          <span className="mx-2">·</span>
          <span>Published {formatEditorialDate(article.publishedAt || article.createdAt)}</span>
          {showUpdated && (
            <>
              <span className="mx-2">·</span>
              <span>Updated {formatEditorialDate(article.updatedAt)}</span>
            </>
          )}
          <span className="mx-2">·</span>
          <span>{article.readingTime} min read</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA] leading-[1.12] mb-4">
          {article.title}
        </h1>

        {article.subheading && (
          <p className="text-lg sm:text-xl text-[#4A4F5A] dark:text-slate-300 leading-relaxed mb-5">
            {article.subheading}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E5E0D5] dark:border-slate-800 text-sm">
          <span className="font-medium text-[#1A1D24] dark:text-slate-200">
            By {article.authorName}
          </span>
          {article.tags && article.tags.length > 0 && (
            <span className="text-xs text-[#5C626F] dark:text-slate-400">
              {article.tags.join(' · ')}
            </span>
          )}
        </div>
      </header>

      {article.coverImage && (
        <figure className="mb-10">
          <EditorialImage
            src={article.coverImage}
            alt={article.title}
            title={article.title}
            aspectClass="aspect-[16/9]"
            className="border border-[#E5E0D5] dark:border-slate-800"
          />
          {article.coverCaption && (
            <figcaption className="mt-2.5 text-xs font-serif italic text-[#5C626F] dark:text-slate-400">
              {article.coverCaption}
            </figcaption>
          )}
        </figure>
      )}

      {/* Comfortable Reading Column */}
      <div className="max-w-2xl mx-auto">
        <RichContent content={article.body} variant="article" />

        {/* Article Actions */}
        <div className="mt-12 pt-6 border-t border-[#D8D3C8] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              disabled={hasLiked}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors cursor-pointer ${
                hasLiked
                  ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                  : 'border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] dark:hover:border-[#C9A458]'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
              <span className="font-mono-tabular">{article.likesCount || 0}</span>
              <span>{hasLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] dark:hover:border-[#C9A458] cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] dark:hover:border-[#C9A458] cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#5C626F] dark:text-slate-400 hover:text-[#9A3412] dark:hover:text-amber-400 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" />
            Report issue
          </button>
        </div>
        {voteNote && (
          <p className="mt-2 text-xs text-[#5C626F] dark:text-slate-400">{voteNote}</p>
        )}
      </div>

      {/* Related Articles */}
      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#D8D3C8] dark:border-slate-800">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-6">
            Related Dispatches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {related.map((rel) => (
              <Link key={rel.id} to={`/news/${rel.id}`} className="group block">
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458] mb-1.5">
                  {rel.categoryName} · {rel.readingTime} min read
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-1.5">
                  {rel.title}
                </h3>
                <p className="text-xs text-[#5C626F] dark:text-slate-400">
                  By {rel.authorName}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="news"
        targetId={article.id}
        targetTitle={article.title}
      />
    </article>
  );
}
