import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Eye, Feather, Newspaper, Scale, Send } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useWds } from '../contexts/WdsContext';
import {
  checkSubmissionGuard,
  containsSuspiciousSpam,
  countWords,
  estimateReadingTime,
  isSafeUrl,
  makeSlug,
  makeUniqueId,
  recordSubmissionGuard,
  sanitizeMultilineText,
  sanitizePlainText,
} from '../lib/sanitize';
import { LIMITS } from '../types/wds';
import { RichContent } from '../components/common/RichContent';

export function SubmitPage() {
  const { newsCategories, writerCategories, mediaLibrary, debates, platformConfig } = useWds();
  const [searchParams] = useSearchParams();
  const initialPillar = searchParams.get('pillar') === 'news' ? 'news' : 'writers';

  const [pillar, setPillar] = useState<'writers' | 'news'>(initialPillar);
  const [previewMode, setPreviewMode] = useState(false);

  const [authorName, setAuthorName] = useState('');
  const [authorBio, setAuthorBio] = useState('');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);

  const [challengeA] = useState(() => Math.floor(Math.random() * 7) + 2);
  const [challengeB] = useState(() => Math.floor(Math.random() * 5) + 1);
  const [challengeInput, setChallengeInput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const activeDebate = useMemo(
    () => debates.find((d) => d.status === 'active') || null,
    [debates]
  );

  const availableCategories = pillar === 'writers' ? writerCategories : newsCategories;
  const selectedCategory = useMemo(() => {
    return availableCategories.find((c) => c.id === categoryId) || availableCategories[0];
  }, [availableCategories, categoryId]);

  const wordCount = useMemo(() => countWords(body), [body]);
  const charCount = body.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanTitle = sanitizePlainText(title);
    const cleanExcerpt = sanitizePlainText(excerpt);
    const cleanBody = sanitizeMultilineText(body);
    const cleanAuthor = sanitizePlainText(authorName) || 'Anonymous Contributor';
    const cleanBio = sanitizePlainText(authorBio);
    const cleanCover = coverImage.trim();

    if (cleanTitle.length < LIMITS.TITLE_MIN || cleanTitle.length > LIMITS.TITLE_MAX) {
      setError(`Title must be between ${LIMITS.TITLE_MIN} and ${LIMITS.TITLE_MAX} characters.`);
      return;
    }
    if (cleanBody.length < 20) {
      setError('Main text must be at least 20 characters.');
      return;
    }
    if (pillar === 'news' && cleanExcerpt.length < LIMITS.EXCERPT_MIN) {
      setError(`News summary/excerpt must be at least ${LIMITS.EXCERPT_MIN} characters.`);
      return;
    }
    if (cleanCover && !isSafeUrl(cleanCover)) {
      setError('Cover image URL must use https://, http://, or be selected from the WDS Editorial Media Library.');
      return;
    }
    if (!copyrightConfirmed) {
      setError('Please confirm the originality and copyright declaration before submitting.');
      return;
    }
    if (Number(challengeInput.trim()) !== challengeA + challengeB) {
      setError('Please answer the verification sum accurately.');
      return;
    }

    const spamIssue = containsSuspiciousSpam(`${cleanTitle} ${cleanExcerpt} ${cleanBody}`);
    if (spamIssue) {
      setError(spamIssue);
      return;
    }

    const guard = checkSubmissionGuard(pillar, `${cleanTitle}:${cleanBody}`);
    if (!guard.ok) {
      setError(guard.reason);
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category.');
      return;
    }

    setSubmitting(true);
    const id = makeUniqueId(pillar === 'writers' ? 'wr' : 'nw');
    try {
      if (pillar === 'writers') {
        await setDoc(doc(db, 'writings', id), {
          title: cleanTitle,
          slug: `${makeSlug(cleanTitle)}-${id.slice(-5)}`,
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          excerpt: cleanExcerpt.slice(0, LIMITS.EXCERPT_MAX),
          body: cleanBody.slice(0, LIMITS.WRITING_BODY_MAX),
          coverImage: cleanCover,
          authorName: cleanAuthor.slice(0, LIMITS.AUTHOR_MAX),
          authorBio: cleanBio.slice(0, LIMITS.BIO_MAX),
          bioApproved: false,
          status: 'pending',
          featured: false,
          editorsPick: false,
          poetrySpotlight: false,
          likesCount: 0,
          readingTime: estimateReadingTime(cleanBody),
          wordCount: Math.max(1, countWords(cleanBody)),
          copyrightConfirmed: true,
          sourceType: 'public_submission',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'news', id), {
          title: cleanTitle,
          slug: `${makeSlug(cleanTitle)}-${id.slice(-5)}`,
          subheading: '',
          excerpt: cleanExcerpt.slice(0, LIMITS.EXCERPT_MAX),
          body: cleanBody.slice(0, LIMITS.NEWS_BODY_MAX),
          categoryId: selectedCategory.id,
          categoryName: selectedCategory.name,
          tags: [],
          coverImage: cleanCover,
          coverCaption: '',
          authorName: cleanAuthor.slice(0, LIMITS.AUTHOR_MAX),
          status: 'pending',
          featured: false,
          likesCount: 0,
          readingTime: estimateReadingTime(cleanBody),
          sourceType: 'public_submission',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      recordSubmissionGuard(pillar, `${cleanTitle}:${cleanBody}`);
      setSubmittedRef(id);
      setTitle('');
      setExcerpt('');
      setBody('');
      setAuthorBio('');
      setCoverImage('');
      setCopyrightConfirmed(false);
      setChallengeInput('');
      setPreviewMode(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${pillar === 'writers' ? 'writings' : 'news'}/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-6">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
          Public Submission Desk · No Account Required
        </p>
        <h1 className="font-serif text-4xl font-bold text-[#0B1528] dark:text-[#F1EFEA] mb-3">
          Submit Your Work to WDS
        </h1>
        <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 max-w-2xl">
          Every submission remains private in our moderation queue until reviewed and approved by WDS editors.
        </p>
      </div>

      {/* Pillar Switcher + Debate Link */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPillar('writers');
              setCategoryId('');
              setSubmittedRef(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border cursor-pointer ${
              pillar === 'writers'
                ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
            }`}
          >
            <Feather className="w-4 h-4" />
            Creative Writing
          </button>

          <button
            type="button"
            onClick={() => {
              setPillar('news');
              setCategoryId('');
              setSubmittedRef(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border cursor-pointer ${
              pillar === 'news'
                ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
            }`}
          >
            <Newspaper className="w-4 h-4" />
            News Report / Tip
          </button>
        </div>

        {activeDebate && (
          <Link
            to={`/debators/${activeDebate.id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline"
          >
            <Scale className="w-4 h-4" />
            Looking to submit a debate argument? Go to Active Motion →
          </Link>
        )}
      </div>

      {submittedRef ? (
        <div className="border border-emerald-700/40 bg-emerald-50/70 dark:bg-emerald-950/30 p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-[#14532D] dark:text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Submission Received & Queued for Moderation</span>
          </div>
          <p className="text-sm text-[#242833] dark:text-slate-200 leading-relaxed">
            Reference ID: <span className="font-mono-tabular font-semibold">{submittedRef}</span>. Your work is stored privately with status <strong>PENDING</strong> and will be published only after review by the WDS editorial board.
          </p>
          <button
            type="button"
            onClick={() => setSubmittedRef(null)}
            className="px-5 py-2 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer"
          >
            Submit Another Piece
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="flex items-center justify-between border-b border-[#E5E0D5] dark:border-slate-800 pb-3 mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#5C626F] dark:text-slate-400">
                {previewMode ? 'Draft Preview' : 'Manuscript Editor'}
              </span>
              <button
                type="button"
                onClick={() => setPreviewMode((p) => !p)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0B1528] dark:text-[#C9A458] hover:underline cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                {previewMode ? 'Back to Editor' : 'Preview Draft'}
              </button>
            </div>

            {previewMode ? (
              <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 space-y-5">
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458]">
                  {selectedCategory?.name} · By {authorName.trim() || 'Anonymous Contributor'} · {wordCount} words
                </div>
                <h2 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
                  {title || 'Untitled Draft'}
                </h2>
                {coverImage && isSafeUrl(coverImage) && (
                  <img
                    src={coverImage}
                    alt="Draft cover"
                    referrerPolicy="no-referrer"
                    className="w-full max-h-72 object-cover border border-[#E5E0D5] dark:border-slate-800"
                  />
                )}
                {excerpt && (
                  <p className="text-sm italic text-[#5C626F] dark:text-slate-400">{excerpt}</p>
                )}
                <RichContent
                  content={body || 'Your body text preview will appear here.'}
                  variant={
                    pillar === 'writers' && selectedCategory?.name.toLowerCase().includes('poetry')
                      ? 'poetry'
                      : pillar === 'writers'
                        ? 'essay'
                        : 'article'
                  }
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                      Category *
                    </label>
                    <select
                      value={selectedCategory?.id || ''}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                    >
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                      Display Name or Pseudonym (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={LIMITS.AUTHOR_MAX}
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Leave blank for Anonymous Contributor"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                      Title *
                    </label>
                    <span className="font-mono-tabular text-[#7A808C]">
                      {title.length}/{LIMITS.TITLE_MAX}
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={LIMITS.TITLE_MAX}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={pillar === 'writers' ? 'Title of your poem, story, or essay' : 'Headline for your campus report'}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                      {pillar === 'news' ? 'Short Summary / Excerpt *' : 'Short Description (Optional)'}
                    </label>
                    <span className="font-mono-tabular text-[#7A808C]">
                      {excerpt.length}/{LIMITS.EXCERPT_MAX}
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    required={pillar === 'news'}
                    maxLength={LIMITS.EXCERPT_MAX}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="One or two sentences introducing this piece..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                      Main Work *
                    </label>
                    <span className="font-mono-tabular text-[#7A808C]">
                      {wordCount} words · {charCount} chars
                    </span>
                  </div>
                  <textarea
                    rows={12}
                    required
                    maxLength={pillar === 'writers' ? LIMITS.WRITING_BODY_MAX : LIMITS.NEWS_BODY_MAX}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder={
                      pillar === 'writers'
                        ? 'Write or paste your work here. Line breaks and stanza spacing are preserved for Poetry...'
                        : 'Write your report clearly with verified facts, dates, and context...'
                    }
                    className="w-full px-3.5 py-3 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 leading-relaxed"
                  />
                </div>

                {pillar === 'writers' && (
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                      Optional Author Bio (Moderated separately before display)
                    </label>
                    <input
                      type="text"
                      maxLength={LIMITS.BIO_MAX}
                      value={authorBio}
                      onChange={(e) => setAuthorBio(e.target.value)}
                      placeholder="e.g., Form 2 General Arts student interested in Ghanaian poetry"
                      className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                    Optional Cover Image (Select from WDS Gallery or enter HTTPS URL)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-2.5">
                    {mediaLibrary.slice(0, 5).map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setCoverImage(coverImage === asset.url ? '' : asset.url)}
                        className={`border p-1 transition-all cursor-pointer ${
                          coverImage === asset.url
                            ? 'border-[#0B1528] dark:border-[#C9A458] ring-2 ring-[#B68D40]/40'
                            : 'border-[#D8D3C8] dark:border-slate-700 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={asset.url}
                          alt={asset.altText}
                          referrerPolicy="no-referrer"
                          className="w-full h-14 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    maxLength={LIMITS.URL_MAX}
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="Or paste a valid https:// image URL (optional)"
                    className="w-full px-3.5 py-2 text-xs bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                  />
                </div>

                <div className="border-t border-[#E5E0D5] dark:border-slate-800 pt-5 space-y-4">
                  <label className="flex items-start gap-3 text-xs text-[#242833] dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={copyrightConfirmed}
                      onChange={(e) => setCopyrightConfirmed(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>
                      <strong>Copyright & Originality Declaration:</strong> I confirm this is original work (or properly verified reporting), I hold the right to submit it to WDS, and I consent to moderation prior to publication.
                    </span>
                  </label>

                  <div className="max-w-xs">
                    <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                      Human Verification: {challengeA} + {challengeB} = ? *
                    </label>
                    <input
                      type="number"
                      required
                      value={challengeInput}
                      onChange={(e) => setChallengeInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-[#9A3412] dark:text-amber-400">{error}</p>}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : 'Submit for Editorial Review'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Editorial Guidelines & Privacy Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                Editorial Guidelines
              </h2>
              <p className="text-xs text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {platformConfig.participationGuidelines}
              </p>
            </div>

            <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                Privacy Notice
              </h2>
              <p className="text-xs text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
                WDS does not require student accounts or collect private phone numbers, home addresses, or student IDs on public forms. Unpublished submissions remain strictly private to moderators.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
