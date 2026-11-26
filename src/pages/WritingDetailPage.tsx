import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowLeft, Check, Copy, Flag, Heart, Share2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useWds } from '../contexts/WdsContext';
import { formatEditorialDate } from '../lib/sanitize';
import { WritingWork } from '../types/wds';
import { EditorialImage } from '../components/common/EditorialImage';
import { RichContent } from '../components/common/RichContent';
import { ReportModal } from '../components/common/ReportModal';

export function WritingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publishedWritings, votedKeys, castVote } = useWds();
  const [work, setWork] = useState<WritingWork | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const liveMatch = useMemo(
    () => publishedWritings.find((w) => w.id === id) || null,
    [publishedWritings, id]
  );

  useEffect(() => {
    if (liveMatch) {
      setWork(liveMatch);
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
        const snap = await getDoc(doc(db, 'writings', id));
        if (!cancelled) {
          if (snap.exists() && snap.data().status === 'published') {
            setWork({ id: snap.id, ...(snap.data() as Omit<WritingWork, 'id'>) });
          } else {
            setWork(null);
          }
        }
      } catch (err) {
        if (!cancelled) handleFirestoreError(err, OperationType.GET, `writings/${id}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, liveMatch]);

  const related = useMemo(() => {
    if (!work) return [];
    return publishedWritings.filter((w) => w.id !== work.id).slice(0, 3);
  }, [publishedWritings, work]);

  const hasLiked = id ? votedKeys.has(`writing_${id}`) : false;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share && work) {
      try {
        await navigator.share({ title: work.title, url: window.location.href });
        return;
      } catch {
        // fallback
      }
    }
    handleCopy();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#5C626F] dark:text-slate-400">
        Loading manuscript...
      </div>
    );
  }

  if (!work) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
          Work not available
        </h1>
        <Link to="/writers" className="text-sm font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
          ← Back to Writers Journal
        </Link>
      </div>
    );
  }

  const isPoetry = work.categoryName.toLowerCase().includes('poetry');

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <Link
          to="/writers"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#5C626F] dark:text-slate-400 hover:text-[#0B1528] dark:hover:text-[#C9A458]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Writers
        </Link>
      </div>

      <header className="max-w-2xl mx-auto text-center mb-10">
        <div className="text-xs text-[#5C626F] dark:text-slate-400 mb-3">
          <span className="font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
            {work.categoryName}
          </span>
          <span className="mx-2">·</span>
          <span>{formatEditorialDate(work.publishedAt || work.createdAt)}</span>
          <span className="mx-2">·</span>
          <span>{work.readingTime} min read</span>
        </div>

        <h1 className={`font-serif text-3xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA] leading-[1.15] mb-4 ${isPoetry ? 'italic' : ''}`}>
          {work.title}
        </h1>

        <p className="text-sm font-medium text-[#1A1D24] dark:text-slate-200">
          By {work.authorName}
        </p>
      </header>

      {work.coverImage && (
        <div className="max-w-3xl mx-auto mb-12">
          <EditorialImage
            src={work.coverImage}
            alt={work.title}
            title={work.title}
            aspectClass="aspect-[16/9]"
            className="border border-[#E5E0D5] dark:border-slate-800"
          />
        </div>
      )}

      <div className={isPoetry ? 'max-w-xl mx-auto py-4' : 'max-w-2xl mx-auto'}>
        <RichContent content={work.body} variant={isPoetry ? 'poetry' : 'essay'} />

        {work.bioApproved && work.authorBio && (
          <aside className="mt-12 p-6 border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729]">
            <p className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-1">
              About the Author
            </p>
            <p className="font-serif text-base font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-1">
              {work.authorName}
            </p>
            <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              {work.authorBio}
            </p>
          </aside>
        )}

        <div className="mt-10 pt-6 border-t border-[#D8D3C8] dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={hasLiked}
              onClick={() => castVote('writing', work.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors cursor-pointer ${
                hasLiked
                  ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                  : 'border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528]'
              }`}
            >
              <Heart className={`w-4 h-4 ${hasLiked ? 'fill-current' : ''}`} />
              <span className="font-mono-tabular">{work.likesCount || 0}</span>
              <span>{hasLiked ? 'Appreciated' : 'Appreciate'}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy Link'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-[#5C626F] dark:text-slate-400 hover:text-[#9A3412] cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" /> Report issue
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#D8D3C8] dark:border-slate-800">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-6">
            More from the Journal
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {related.map((rel) => (
              <Link key={rel.id} to={`/writers/${rel.id}`} className="group block">
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458] mb-1.5">
                  {rel.categoryName} · {rel.readingTime} min read
                </div>
                <h3 className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline mb-1">
                  {rel.title}
                </h3>
                <p className="text-xs text-[#5C626F] dark:text-slate-400">By {rel.authorName}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="writing"
        targetId={work.id}
        targetTitle={work.title}
      />
    </article>
  );
}
