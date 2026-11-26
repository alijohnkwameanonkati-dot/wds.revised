import { useMemo, useState } from 'react';
import { Award, Trophy } from 'lucide-react';
import { useWds } from '../contexts/WdsContext';
import { computeLeaderboard } from '../lib/leaderboard';

export function LeaderboardPage() {
  const { publishedWritings, approvedArguments, publishedNews, recognitions, platformConfig } = useWds();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'all'>('weekly');
  const [pillarFilter, setPillarFilter] = useState<'overall' | 'writers' | 'debators' | 'news'>('overall');

  const weights = platformConfig.scoringWeights;

  const rankings = useMemo(
    () => computeLeaderboard(publishedWritings, approvedArguments, publishedNews, weights, period, pillarFilter),
    [publishedWritings, approvedArguments, publishedNews, weights, period, pillarFilter]
  );

  const currentWinner = useMemo(
    () => recognitions.find((r) => r.isCurrent) || recognitions[0] || null,
    [recognitions]
  );

  const previousWinners = useMemo(
    () => recognitions.filter((r) => r.id !== currentWinner?.id),
    [recognitions, currentWinner]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14">
      {/* Masthead */}
      <div className="border-b border-[#D8D3C8] dark:border-slate-800 pb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D32] dark:text-[#C9A458] mb-2">
          Recognition & Merit
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#0B1528] dark:text-[#F1EFEA] mb-3">
          Contributors Leaderboard
        </h1>
        <p className="text-sm sm:text-base text-[#4A4F5A] dark:text-slate-300 max-w-2xl">
          Celebrating thoughtful writers, principled debators, and campus correspondents based on verified, moderated engagement.
        </p>
      </div>

      {/* Monthly Recognition Spotlight */}
      {currentWinner && (
        <section className="border border-[#B68D40] bg-[#0B1528] text-white p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-3">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#E5C67E]">
              <Award className="w-4 h-4" />
              <span>Contributor of the Month · {currentWinner.periodLabel}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
              {currentWinner.contributorName}
            </h2>
            <p className="text-sm text-[#E5C67E]">
              Featured Work: {currentWinner.featuredWorkTitle}
            </p>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              {currentWinner.reason}
            </p>
          </div>
          <div className="lg:col-span-4 lg:text-right border-t lg:border-t-0 lg:border-l border-white/15 pt-5 lg:pt-0 lg:pl-8">
            <span className="text-xs uppercase tracking-widest text-slate-400 block mb-1">
              Verified Score
            </span>
            <span className="font-mono-tabular text-4xl font-bold text-[#E5C67E]">
              {currentWinner.points} pts
            </span>
            <p className="text-xs text-slate-400 mt-2">
              Approved by WDS Editorial Board
            </p>
          </div>
        </section>
      )}

      {/* Controls & Transparent Scoring Formula */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8D3C8] dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              {(['weekly', 'monthly', 'all'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 text-xs font-medium border capitalize cursor-pointer ${
                    period === p
                      ? 'bg-[#0B1528] text-white border-[#0B1528] dark:bg-[#C9A458] dark:text-[#0B111E] dark:border-[#C9A458]'
                      : 'bg-white dark:bg-[#101829] text-[#4A4F5A] dark:text-slate-300 border-[#D8D3C8] dark:border-slate-700'
                  }`}
                >
                  {p === 'all' ? 'All Time' : p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {(['overall', 'writers', 'debators', 'news'] as const).map((pf) => (
                <button
                  key={pf}
                  type="button"
                  onClick={() => setPillarFilter(pf)}
                  className={`px-3 py-1.5 text-xs font-medium border capitalize cursor-pointer ${
                    pillarFilter === pf
                      ? 'bg-[#F2EFE8] text-[#0B1528] border-[#0B1528] dark:bg-[#1A253B] dark:text-[#C9A458] dark:border-[#C9A458]'
                      : 'bg-white dark:bg-[#101829] text-[#5C626F] dark:text-slate-400 border-[#D8D3C8] dark:border-slate-700'
                  }`}
                >
                  {pf}
                </button>
              ))}
            </div>
          </div>

          {rankings.length === 0 ? (
            <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center">
              <p className="font-serif text-xl text-[#0B1528] dark:text-[#F1EFEA] mb-2">
                No rankings recorded for this period yet.
              </p>
              <p className="text-sm text-[#5C626F] dark:text-slate-400">
                Contributions enter rankings once approved by moderators and engaged with by readers.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top 3 Podium Distinction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {rankings.slice(0, 3).map((entry, index) => (
                  <div
                    key={entry.name}
                    className={`border p-5 ${
                      index === 0
                        ? 'border-[#B68D40] bg-[#FAF6EC] dark:bg-[#161D2F]'
                        : 'border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono-tabular text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                        Rank 0{index + 1}
                      </span>
                      <Trophy className={`w-4 h-4 ${index === 0 ? 'text-[#B68D40]' : 'text-[#7A808C]'}`} />
                    </div>
                    <h3 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] mb-1">
                      {entry.name}
                    </h3>
                    <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-4">
                      {entry.achievementLabel}
                    </p>
                    <div className="pt-3 border-t border-[#E5E0D5] dark:border-slate-800 flex items-baseline justify-between font-mono-tabular text-xs">
                      <span className="text-[#5C626F] dark:text-slate-400">
                        {entry.writingsCount}W · {entry.argumentsCount}A · {entry.totalLikes} likes
                      </span>
                      <span className="text-sm font-bold text-[#0B1528] dark:text-[#C9A458]">
                        {entry.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full Ranking Table */}
              <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#D8D3C8] dark:border-slate-800 text-xs uppercase tracking-wider text-[#5C626F] dark:text-slate-400">
                      <th className="py-3.5 px-4">Pos</th>
                      <th className="py-3.5 px-4">Contributor</th>
                      <th className="py-3.5 px-4">Recognition</th>
                      <th className="py-3.5 px-4 text-right">Works</th>
                      <th className="py-3.5 px-4 text-right">Support</th>
                      <th className="py-3.5 px-4 text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
                    {rankings.map((row, idx) => (
                      <tr key={row.name}>
                        <td className="py-3.5 px-4 font-mono-tabular text-xs font-semibold text-[#8C6D32] dark:text-[#C9A458]">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#0B1528] dark:text-[#F1EFEA]">
                          {row.name}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#5C626F] dark:text-slate-400">
                          {row.achievementLabel}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[#4A4F5A] dark:text-slate-300">
                          {row.writingsCount + row.argumentsCount + row.newsCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular text-xs text-[#4A4F5A] dark:text-slate-300">
                          {row.totalLikes}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[#0B1528] dark:text-[#C9A458]">
                          {row.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Transparent Scoring Formula + Previous Winners */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="border border-[#D8D3C8] dark:border-slate-800 bg-[#F2EFE8] dark:bg-[#0F1729] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Transparent Scoring System
            </h2>
            <p className="text-xs text-[#4A4F5A] dark:text-slate-300 leading-relaxed">
              Points are awarded strictly for moderator-approved works and single-vote-per-visitor community support.
            </p>
            <dl className="space-y-2 text-xs font-mono-tabular border-t border-[#D8D3C8] dark:border-slate-700 pt-3">
              <div className="flex justify-between">
                <dt className="text-[#4A4F5A] dark:text-slate-300">Published Writing</dt>
                <dd className="font-semibold text-[#0B1528] dark:text-white">+{weights.writingPublished} pts</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4A4F5A] dark:text-slate-300">Approved Debate Argument</dt>
                <dd className="font-semibold text-[#0B1528] dark:text-white">+{weights.argumentApproved} pts</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4A4F5A] dark:text-slate-300">Argument Support Vote</dt>
                <dd className="font-semibold text-[#0B1528] dark:text-white">+{weights.argumentSupport} pts</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4A4F5A] dark:text-slate-300">Writing Appreciation</dt>
                <dd className="font-semibold text-[#0B1528] dark:text-white">+{weights.writingLike} pts</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#4A4F5A] dark:text-slate-300">News Dispatch Like</dt>
                <dd className="font-semibold text-[#0B1528] dark:text-white">+{weights.newsLike} pts</dd>
              </div>
            </dl>
          </div>

          {previousWinners.length > 0 && (
            <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                Previous Monthly Winners
              </h2>
              <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
                {previousWinners.map((win) => (
                  <div key={win.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="text-xs text-[#5C626F] dark:text-slate-400">{win.periodLabel}</p>
                    <p className="font-serif text-base font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
                      {win.contributorName}
                    </p>
                    <p className="text-xs text-[#4A4F5A] dark:text-slate-300">{win.featuredWorkTitle}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
