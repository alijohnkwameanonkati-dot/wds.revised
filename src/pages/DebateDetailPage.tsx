import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Flag,
  MessageCircle,
  Send,
  Share2,
  ThumbsUp,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useWds } from '../contexts/WdsContext';
import {
  checkSubmissionGuard,
  containsSuspiciousSpam,
  formatEditorialDate,
  makeUniqueId,
  recordSubmissionGuard,
  sanitizeMultilineText,
  sanitizePlainText,
  toMillis,
} from '../lib/sanitize';
import { ArgumentPosition, DebateTopic, LIMITS } from '../types/wds';
import { ReportModal } from '../components/common/ReportModal';

export function DebateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { debates, approvedArguments, approvedReplies, votedKeys, castVote } = useWds();
  const [debate, setDebate] = useState<DebateTopic | null>(null);
  const [loading, setLoading] = useState(true);

  const [posFilter, setPosFilter] = useState<'ALL' | ArgumentPosition>('ALL');
  const [sortBy, setSortBy] = useState<'supported' | 'newest'>('supported');
  const [copied, setCopied] = useState(false);

  // Argument submission state
  const [showArgForm, setShowArgForm] = useState(false);
  const [argAuthor, setArgAuthor] = useState('');
  const [argTitle, setArgTitle] = useState('');
  const [argPosition, setArgPosition] = useState<ArgumentPosition>('FOR');
  const [argMain, setArgMain] = useState('');
  const [argReason, setArgReason] = useState('');
  const [argRefs, setArgRefs] = useState('');
  const [challengeA] = useState(() => Math.floor(Math.random() * 6) + 2);
  const [challengeB] = useState(() => Math.floor(Math.random() * 5) + 1);
  const [challengeInput, setChallengeInput] = useState('');
  const [argSubmitting, setArgSubmitting] = useState(false);
  const [argError, setArgError] = useState<string | null>(null);
  const [argSubmitted, setArgSubmitted] = useState(false);

  // Reply state
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyAuthor, setReplyAuthor] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyMessage, setReplyMessage] = useState<string | null>(null);

  // Report modal state
  const [reportTarget, setReportTarget] = useState<{
    type: 'argument' | 'reply';
    id: string;
    title: string;
  } | null>(null);

  const liveMatch = useMemo(() => debates.find((d) => d.id === id) || null, [debates, id]);

  useEffect(() => {
    if (liveMatch) {
      setDebate(liveMatch);
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
        const snap = await getDoc(doc(db, 'debates', id));
        if (!cancelled) {
          setDebate(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<DebateTopic, 'id'>) } : null);
        }
      } catch (err) {
        if (!cancelled) handleFirestoreError(err, OperationType.GET, `debates/${id}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, liveMatch]);

  const debateArgs = useMemo(() => {
    const base = approvedArguments.filter((a) => a.debateId === id);
    const filtered = posFilter === 'ALL' ? base : base.filter((a) => a.position === posFilter);
    if (sortBy === 'newest') {
      return [...filtered].sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
    }
    return [...filtered].sort((a, b) => (b.supportCount || 0) - (a.supportCount || 0));
  }, [approvedArguments, id, posFilter, sortBy]);

  const handleArgumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debate || debate.status !== 'active') return;
    setArgError(null);

    const cleanTitle = sanitizePlainText(argTitle);
    const cleanMain = sanitizeMultilineText(argMain);
    const cleanReason = sanitizeMultilineText(argReason);
    const cleanRefs = sanitizePlainText(argRefs);
    const cleanAuthor = sanitizePlainText(argAuthor) || 'Anonymous Contributor';

    if (cleanTitle.length < LIMITS.ARG_TITLE_MIN || cleanTitle.length > LIMITS.ARG_TITLE_MAX) {
      setArgError(`Argument title must be between ${LIMITS.ARG_TITLE_MIN} and ${LIMITS.ARG_TITLE_MAX} characters.`);
      return;
    }
    if (cleanMain.length < LIMITS.ARG_MAIN_MIN || cleanMain.length > LIMITS.ARG_MAIN_MAX) {
      setArgError(`Main argument must be between ${LIMITS.ARG_MAIN_MIN} and ${LIMITS.ARG_MAIN_MAX} characters.`);
      return;
    }
    if (cleanReason.length < LIMITS.ARG_REASON_MIN || cleanReason.length > LIMITS.ARG_REASON_MAX) {
      setArgError(`Supporting reasoning must be between ${LIMITS.ARG_REASON_MIN} and ${LIMITS.ARG_REASON_MAX} characters.`);
      return;
    }
    if (Number(challengeInput.trim()) !== challengeA + challengeB) {
      setArgError('Please solve the verification sum correctly.');
      return;
    }
    const spamCheck = containsSuspiciousSpam(`${cleanTitle} ${cleanMain} ${cleanReason} ${cleanRefs}`);
    if (spamCheck) {
      setArgError(spamCheck);
      return;
    }

    const guard = checkSubmissionGuard('argument', `${debate.id}:${cleanTitle}:${cleanMain}`);
    if (!guard.ok) {
      setArgError(guard.reason);
      return;
    }

    setArgSubmitting(true);
    const newId = makeUniqueId('arg');
    try {
      await setDoc(doc(db, 'arguments', newId), {
        debateId: debate.id,
        title: cleanTitle,
        position: argPosition,
        mainArgument: cleanMain,
        supportingReasoning: cleanReason,
        references: cleanRefs.slice(0, LIMITS.REF_MAX),
        authorName: cleanAuthor.slice(0, LIMITS.AUTHOR_MAX),
        status: 'pending',
        supportCount: 0,
        repliesCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      recordSubmissionGuard('argument', `${debate.id}:${cleanTitle}:${cleanMain}`);
      setArgSubmitted(true);
      setArgTitle('');
      setArgMain('');
      setArgReason('');
      setArgRefs('');
      setChallengeInput('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `arguments/${newId}`);
    } finally {
      setArgSubmitting(false);
    }
  };

  const handleReplySubmit = async (argumentId: string) => {
    if (!debate) return;
    setReplyMessage(null);
    const cleanBody = sanitizeMultilineText(replyBody);
    const cleanAuthor = sanitizePlainText(replyAuthor) || 'Anonymous Reader';
    if (cleanBody.length < LIMITS.REPLY_MIN || cleanBody.length > LIMITS.REPLY_MAX) {
      setReplyMessage(`Reply must be between ${LIMITS.REPLY_MIN} and ${LIMITS.REPLY_MAX} characters.`);
      return;
    }
    const spamCheck = containsSuspiciousSpam(cleanBody);
    if (spamCheck) {
      setReplyMessage(spamCheck);
      return;
    }
    const guard = checkSubmissionGuard('reply', `${argumentId}:${cleanBody}`, 15000);
    if (!guard.ok) {
      setReplyMessage(guard.reason);
      return;
    }

    setReplySubmitting(true);
    const newId = makeUniqueId('rep');
    try {
      await setDoc(doc(db, 'replies', newId), {
        debateId: debate.id,
        argumentId,
        body: cleanBody,
        authorName: cleanAuthor.slice(0, LIMITS.AUTHOR_MAX),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      recordSubmissionGuard('reply', `${argumentId}:${cleanBody}`);
      setReplyBody('');
      setReplyAuthor('');
      setReplyMessage('Reply submitted to moderation queue. It will appear once approved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `replies/${newId}`);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleShareDebate = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center text-sm text-[#5C626F] dark:text-slate-400">
        Loading debate arena...
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
          Debate topic not found
        </h1>
        <Link to="/debators" className="text-sm font-medium text-[#8C6D32] dark:text-[#C9A458] hover:underline">
          ← Back to Debators Arena
        </Link>
      </div>
    );
  }

  const isOpenForSubmissions = debate.status === 'active';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div>
        <Link
          to="/debators"
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#5C626F] dark:text-slate-400 hover:text-[#0B1528] dark:hover:text-[#C9A458]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Debators
        </Link>
      </div>

      {/* Debate Motion Brief */}
      <header className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE8DF] dark:border-slate-800 pb-4 text-xs">
          <div className="font-mono-tabular text-[#5C626F] dark:text-slate-400">
            <span className="font-semibold uppercase text-[#8C6D32] dark:text-[#C9A458]">
              {debate.status}
            </span>
            <span className="mx-2">·</span>
            <span>Opens {formatEditorialDate(debate.openDate)}</span>
            <span className="mx-2">·</span>
            <span>Closes {formatEditorialDate(debate.closeDate)}</span>
          </div>
          <button
            type="button"
            onClick={handleShareDebate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Link Copied' : 'Share Debate'}
          </button>
        </div>

        <div>
          <p className="text-xs uppercase tracking-widest text-[#5C626F] dark:text-slate-400 mb-2">
            {debate.title}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#0B1528] dark:text-[#F1EFEA] leading-tight mb-4">
            {debate.question}
          </h1>
          <p className="text-base text-[#3A3F4B] dark:text-slate-300 leading-relaxed">
            {debate.description}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[#ECE8DF] dark:border-slate-800 text-sm">
          {debate.context && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-2">
                Background & Context
              </h2>
              <p className="text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {debate.context}
              </p>
            </div>
          )}
          {debate.rules && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-2">
                Rules of Participation
              </h2>
              <p className="text-[#4A4F5A] dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {debate.rules}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#ECE8DF] dark:border-slate-800">
          <div className="font-mono-tabular text-xs flex items-center gap-5">
            <span>Total Approved: <strong>{debate.approvedArgumentsCount}</strong></span>
            <span className="text-[#14532D] dark:text-emerald-400">FOR: <strong>{debate.forCount}</strong></span>
            <span className="text-[#9A3412] dark:text-rose-400">AGAINST: <strong>{debate.againstCount}</strong></span>
            <span className="text-[#1E3A8A] dark:text-sky-400">NEUTRAL: <strong>{debate.neutralCount}</strong></span>
          </div>

          {isOpenForSubmissions ? (
            <button
              type="button"
              onClick={() => {
                setShowArgForm((prev) => !prev);
                setArgSubmitted(false);
              }}
              className="px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 cursor-pointer"
            >
              {showArgForm ? 'Hide Submission Form' : 'Submit Your Argument'}
            </button>
          ) : (
            <span className="text-xs text-[#5C626F] dark:text-slate-400">
              Submissions are closed for {debate.status} motions.
            </span>
          )}
        </div>
      </header>

      {/* Anonymous Argument Submission Form */}
      {isOpenForSubmissions && showArgForm && (
        <section className="border border-[#B68D40] bg-[#FAF8F4] dark:bg-[#0F1729] p-6 sm:p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
            Submit an Argument
          </h2>
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-6">
            No student login required. Every argument enters the moderation queue and becomes public only after editorial approval.
          </p>

          {argSubmitted ? (
            <div className="p-6 border border-emerald-700/30 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-3">
              <div className="flex items-center gap-2 text-[#14532D] dark:text-emerald-400 font-medium text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Argument Submitted for Moderation
              </div>
              <p className="text-sm text-[#242833] dark:text-slate-300">
                Your argument is safely stored as <strong>PENDING</strong>. Moderators will review it for clarity, evidence, and adherence to debate rules before publishing.
              </p>
              <button
                type="button"
                onClick={() => setArgSubmitted(false)}
                className="text-xs font-medium text-[#0B1528] dark:text-[#C9A458] underline cursor-pointer"
              >
                Submit another perspective
              </button>
            </div>
          ) : (
            <form onSubmit={handleArgumentSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                    Display Name or Pseudonym (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.AUTHOR_MAX}
                    value={argAuthor}
                    onChange={(e) => setArgAuthor(e.target.value)}
                    placeholder="Leave blank for Anonymous Contributor"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                    Position *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['FOR', 'AGAINST', 'NEUTRAL'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setArgPosition(pos)}
                        className={`py-2.5 text-xs font-semibold border transition-colors cursor-pointer ${
                          argPosition === pos
                            ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                            : 'bg-white dark:bg-[#0B111E] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
                        }`}
                      >
                        {pos === 'NEUTRAL' ? 'NEUTRAL / ANALYSIS' : pos}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                    Argument Headline *
                  </label>
                  <span className="font-mono-tabular text-[#7A808C]">
                    {argTitle.length}/{LIMITS.ARG_TITLE_MAX}
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={LIMITS.ARG_TITLE_MAX}
                  value={argTitle}
                  onChange={(e) => setArgTitle(e.target.value)}
                  placeholder="Summarize your core thesis in one clear sentence"
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                    Main Argument * (min {LIMITS.ARG_MAIN_MIN} chars)
                  </label>
                  <span className="font-mono-tabular text-[#7A808C]">
                    {argMain.length}/{LIMITS.ARG_MAIN_MAX}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={LIMITS.ARG_MAIN_MAX}
                  value={argMain}
                  onChange={(e) => setArgMain(e.target.value)}
                  placeholder="State your primary claim clearly and logically..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label className="font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300">
                    Supporting Reasoning & Evidence * (min {LIMITS.ARG_REASON_MIN} chars)
                  </label>
                  <span className="font-mono-tabular text-[#7A808C]">
                    {argReason.length}/{LIMITS.ARG_REASON_MAX}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={LIMITS.ARG_REASON_MAX}
                  value={argReason}
                  onChange={(e) => setArgReason(e.target.value)}
                  placeholder="Provide examples, historical context, or anticipated counter-rebuttals..."
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                    References or Sources (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={LIMITS.REF_MAX}
                    value={argRefs}
                    onChange={(e) => setArgRefs(e.target.value)}
                    placeholder="Books, reports, or verifiable references"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                    Human Check: What is {challengeA} + {challengeB}? *
                  </label>
                  <input
                    type="number"
                    required
                    value={challengeInput}
                    onChange={(e) => setChallengeInput(e.target.value)}
                    placeholder="Enter sum"
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
                  />
                </div>
              </div>

              {argError && <p className="text-xs text-[#9A3412] dark:text-amber-400">{argError}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={argSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {argSubmitting ? 'Submitting...' : 'Submit for Moderation'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Arguments Filter & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8D3C8] dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {(['ALL', 'FOR', 'AGAINST', 'NEUTRAL'] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              onClick={() => setPosFilter(pos)}
              className={`px-3.5 py-1.5 text-xs font-medium border whitespace-nowrap shrink-0 cursor-pointer ${
                posFilter === pos
                  ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                  : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
              }`}
            >
              {pos === 'ALL' ? 'All Positions' : pos === 'NEUTRAL' ? 'Neutral / Analysis' : pos}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'supported' | 'newest')}
          aria-label="Sort debate arguments"
          className="px-3 py-1.5 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
        >
          <option value="supported">Most Supported</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {/* Approved Arguments List */}
      {debateArgs.length === 0 ? (
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center">
          <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA] mb-2">
            No approved arguments in this view yet.
          </p>
          <p className="text-sm text-[#5C626F] dark:text-slate-400">
            {isOpenForSubmissions
              ? 'Be the first to contribute a structured perspective above.'
              : 'No arguments matched this position filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {debateArgs.map((arg) => {
            const hasSupported = votedKeys.has(`argument_${arg.id}`);
            const replies = approvedReplies.filter((r) => r.argumentId === arg.id);
            const posColor =
              arg.position === 'FOR'
                ? 'text-[#14532D] dark:text-emerald-400'
                : arg.position === 'AGAINST'
                  ? 'text-[#9A3412] dark:text-rose-400'
                  : 'text-[#1E3A8A] dark:text-sky-400';

            return (
              <article
                key={arg.id}
                className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE8DF] dark:border-slate-800 pb-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold uppercase tracking-widest ${posColor}`}>
                      {arg.position === 'NEUTRAL' ? 'NEUTRAL / ANALYSIS' : arg.position}
                    </span>
                    <span className="text-[#7A808C]">·</span>
                    <span className="font-medium text-[#1A1D24] dark:text-slate-200">{arg.authorName}</span>
                    <span className="text-[#7A808C]">·</span>
                    <span className="text-[#5C626F] dark:text-slate-400">{formatEditorialDate(arg.createdAt)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReportTarget({ type: 'argument', id: arg.id, title: arg.title })}
                    className="inline-flex items-center gap-1 text-[#5C626F] dark:text-slate-400 hover:text-[#9A3412] dark:hover:text-amber-400 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" /> Report
                  </button>
                </div>

                <h3 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
                  {arg.title}
                </h3>

                <div className="space-y-4 text-sm sm:text-base text-[#242833] dark:text-slate-200 leading-relaxed">
                  <p>{arg.mainArgument}</p>
                  <div className="pt-3 border-t border-[#ECE8DF] dark:border-slate-800">
                    <p className="text-xs uppercase tracking-widest text-[#5C626F] dark:text-slate-400 mb-1.5">
                      Supporting Reasoning
                    </p>
                    <p className="text-sm text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
                      {arg.supportingReasoning}
                    </p>
                  </div>
                  {arg.references && (
                    <p className="text-xs text-[#5C626F] dark:text-slate-400">
                      <span className="font-medium">Sources:</span> {arg.references}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#ECE8DF] dark:border-slate-800 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    disabled={hasSupported}
                    onClick={() => castVote('argument', arg.id)}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border transition-colors cursor-pointer ${
                      hasSupported
                        ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                        : 'border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528]'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span className="font-mono-tabular">{arg.supportCount || 0}</span>
                    <span>{hasSupported ? 'Supported' : 'Support Argument'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReplyOpenFor(replyOpenFor === arg.id ? null : arg.id);
                      setReplyMessage(null);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 hover:border-[#0B1528] cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="font-mono-tabular">{replies.length}</span>
                    <span>Replies & Rebuttals</span>
                  </button>
                </div>

                {/* Approved Replies & Reply Composer */}
                {(replies.length > 0 || replyOpenFor === arg.id) && (
                  <div className="pt-4 border-t border-[#ECE8DF] dark:border-slate-800 space-y-4">
                    {replies.length > 0 && (
                      <div className="space-y-3 pl-4 sm:pl-6 border-l border-[#D8D3C8] dark:border-slate-700">
                        {replies.map((rep) => (
                          <div key={rep.id} className="py-2">
                            <div className="flex items-center justify-between text-xs text-[#5C626F] dark:text-slate-400 mb-1">
                              <span>
                                <strong className="text-[#1A1D24] dark:text-slate-200">{rep.authorName}</strong> · {formatEditorialDate(rep.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setReportTarget({
                                    type: 'reply',
                                    id: rep.id,
                                    title: `Reply by ${rep.authorName}`,
                                  })
                                }
                                className="hover:text-[#9A3412] cursor-pointer"
                              >
                                Report
                              </button>
                            </div>
                            <p className="text-sm text-[#242833] dark:text-slate-300 leading-relaxed">
                              {rep.body}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {replyOpenFor === arg.id && (
                      <div className="bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#E5E0D5] dark:border-slate-800 p-4 space-y-3">
                        <p className="text-xs font-medium text-[#4A4F5A] dark:text-slate-300">
                          Submit a respectful reply (held for moderation before appearing):
                        </p>
                        <input
                          type="text"
                          maxLength={LIMITS.AUTHOR_MAX}
                          value={replyAuthor}
                          onChange={(e) => setReplyAuthor(e.target.value)}
                          placeholder="Your name or pseudonym (optional)"
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                        />
                        <textarea
                          rows={2}
                          maxLength={LIMITS.REPLY_MAX}
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Write your constructive response (min 10 chars)..."
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                        />
                        {replyMessage && (
                          <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{replyMessage}</p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            disabled={replySubmitting}
                            onClick={() => handleReplySubmit(arg.id)}
                            className="px-4 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer"
                          >
                            {replySubmitting ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {reportTarget && (
        <ReportModal
          isOpen={true}
          onClose={() => setReportTarget(null)}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetTitle={reportTarget.title}
        />
      )}
    </div>
  );
}
