import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, MessageSquare, Scale } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { GENERATED_IMAGES } from '../lib/defaults';
import { formatEditorialDate } from '../lib/sanitize';
import { DebateStatus } from '../types/wds';
import { EditorialImage } from '../components/common/EditorialImage';

export function DebatorsPage() {
  const { debates, approvedArguments, platformConfig, loadingPublic } = useWds();
  const [statusFilter, setStatusFilter] = useState<'all' | DebateStatus>('all');

  const activeDebate = useMemo(
    () => debates.find((d) => d.status === 'active') || null,
    [debates]
  );

  const upcomingDebates = useMemo(
    () => debates.filter((d) => d.status === 'upcoming'),
    [debates]
  );

  const filteredDebates = useMemo(() => {
    if (statusFilter === 'all') return debates;
    return debates.filter((d) => d.status === statusFilter);
  }, [debates, statusFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* Masthead */}
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
            Pillar 02 · WDS Debators Arena
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
            Structured Intellectual Debate
          </h1>
          <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 mt-3 max-w-2xl">
            Principled campus discourse across {platformConfig.debateCycleDays}-day moderated cycles. Read competing perspectives, support persuasive reasoning, and submit your argument without an account.
          </p>
        </div>
        <div className="text-xs text-[#5C626F] dark:text-slate-400 flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
          <span>Standard cycle: {platformConfig.debateCycleDays} days · Moderator reviewed</span>
        </div>
      </div>

      {/* Current Active Debate Spotlight */}
      {activeDebate ? (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch border border-[#D8D3C8] dark:border-slate-800 bg-[#0B1528] text-white">
          <div className="lg:col-span-5">
            <EditorialImage
              src={GENERATED_IMAGES.debatePodium}
              alt="Debate auditorium podiums"
              aspectClass="aspect-[4/3] lg:h-full"
            />
          </div>
          <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#E5C67E] mb-4">
                <span className="uppercase tracking-widest font-semibold">Current Active Motion</span>
                <span className="font-mono-tabular">
                  {formatEditorialDate(activeDebate.openDate)} — {formatEditorialDate(activeDebate.closeDate)}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white leading-tight mb-4">
                {activeDebate.question}
              </h2>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6">
                {activeDebate.description}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y border-white/15 py-4 mb-6 font-mono-tabular">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Approved</span>
                  <span className="text-xl font-semibold text-white">{activeDebate.approvedArgumentsCount}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-emerald-300 block">For</span>
                  <span className="text-xl font-semibold text-emerald-300">{activeDebate.forCount}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-rose-300 block">Against</span>
                  <span className="text-xl font-semibold text-rose-300">{activeDebate.againstCount}</span>
                </div>
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-sky-300 block">Neutral</span>
                  <span className="text-xl font-semibold text-sky-300">{activeDebate.neutralCount}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-xs text-slate-300">
                Submissions are open and reviewed before appearing publicly.
              </span>
              <Link
                to={`/debators/${activeDebate.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium bg-[#C9A458] text-[#0B111E] hover:opacity-90 whitespace-nowrap shrink-0"
              >
                Enter Debate & Submit Argument
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-8 sm:p-10">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-2">
            <Scale className="w-4 h-4" />
            <span>Debate Floor</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
            No active debate motion at this moment
          </h2>
          <p className="text-sm text-[#4A4F5A] dark:text-slate-300 max-w-2xl">
            Motions open only upon administrator review and publication approval. Browse closed discussions below or check upcoming scheduled topics.
          </p>
        </section>
      )}

      {/* Upcoming Debate Announcements */}
      {upcomingDebates.length > 0 && (
        <section>
          <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-3 mb-6">
            <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
              Upcoming Motions
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {upcomingDebates.map((deb) => (
              <Link
                key={deb.id}
                to={`/debators/${deb.id}`}
                className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6 hover:border-[#0B1528] dark:hover:border-[#C9A458] transition-colors block"
              >
                <div className="text-xs text-[#8C6D32] dark:text-[#C9A458] mb-2 font-mono-tabular">
                  UPCOMING · Opens {formatEditorialDate(deb.openDate)}
                </div>
                <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                  {deb.question}
                </h3>
                <p className="text-sm text-[#4A4F5A] dark:text-slate-300 line-clamp-2">
                  {deb.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Debate History & Archive */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8D3C8] dark:border-slate-800 pb-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            Debate Index & Archive
          </h2>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['all', 'active', 'upcoming', 'closed', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`px-3.5 py-1.5 text-xs font-medium capitalize border whitespace-nowrap shrink-0 cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                    : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {loadingPublic ? (
          <p className="text-sm text-[#5C626F] dark:text-slate-400 py-8">Loading debates...</p>
        ) : filteredDebates.length === 0 ? (
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-10 text-center">
            <p className="text-sm text-[#4A4F5A] dark:text-slate-300">
              No debates found in this category.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#D8D3C8] dark:divide-slate-800 border-y border-[#D8D3C8] dark:border-slate-800">
            {filteredDebates.map((debate) => {
              const topArg = approvedArguments
                .filter((a) => a.debateId === debate.id)
                .sort((a, b) => b.supportCount - a.supportCount)[0];
              return (
                <article key={debate.id} className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-3xl">
                    <div className="text-xs text-[#5C626F] dark:text-slate-400 font-mono-tabular">
                      <span className="font-semibold uppercase text-[#8C6D32] dark:text-[#C9A458]">
                        {debate.status}
                      </span>
                      <span className="mx-2">·</span>
                      <span>
                        {formatEditorialDate(debate.openDate)} – {formatEditorialDate(debate.closeDate)}
                      </span>
                      <span className="mx-2">·</span>
                      <span>{debate.approvedArgumentsCount} arguments</span>
                    </div>
                    <Link to={`/debators/${debate.id}`} className="group block">
                      <h3 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] group-hover:underline">
                        {debate.question}
                      </h3>
                    </Link>
                    <p className="text-sm text-[#4A4F5A] dark:text-slate-300">
                      {debate.description}
                    </p>
                    {topArg && (
                      <p className="text-xs text-[#5C626F] dark:text-slate-400 pt-1">
                        Outstanding argument: <span className="font-medium text-[#1A1D24] dark:text-slate-200">"{topArg.title}"</span> by {topArg.authorName} ({topArg.supportCount} supports)
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <Link
                      to={`/debators/${debate.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458] hover:bg-[#0B1528] hover:text-white dark:hover:bg-[#C9A458] dark:hover:text-[#0B111E] transition-colors whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4" />
                      View Discussion
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
