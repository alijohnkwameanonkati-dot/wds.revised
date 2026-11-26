import { useMemo, useState } from 'react';
import { AlertTriangle, Bell, CheckCircle2, Database, FileText, MessageSquare, Sparkles } from 'lucide-react';
import { useWds } from '../../contexts/WdsContext';
import { seedInauguralWdsEdition } from '../../lib/defaults';
import { formatEditorialDate, toMillis } from '../../lib/sanitize';

interface AdminOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export function AdminOverview({ onNavigateTab }: AdminOverviewProps) {
  const {
    adminUser,
    allNews,
    allWritings,
    allArguments,
    allReplies,
    debates,
    reports,
    moderationRecords,
    auditLogs,
  } = useWds();

  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const stats = useMemo(() => {
    const pubNews = allNews.filter((n) => n.status === 'published');
    const pendNews = allNews.filter((n) => n.status === 'pending' || n.status === 'changes_requested');
    const pubWritings = allWritings.filter((w) => w.status === 'published');
    const pendWritings = allWritings.filter((w) => w.status === 'pending' || w.status === 'changes_requested');
    const appArgs = allArguments.filter((a) => a.status === 'approved');
    const pendArgs = allArguments.filter((a) => a.status === 'pending' || a.status === 'changes_requested');
    const pendReplies = allReplies.filter((r) => r.status === 'pending');
    const openReports = reports.filter((r) => r.status === 'open');
    const scheduledNews = allNews.filter((n) => n.status === 'scheduled');

    const contributors = new Set<string>();
    pubWritings.forEach((w) => contributors.add(w.authorName.toLowerCase()));
    appArgs.forEach((a) => contributors.add(a.authorName.toLowerCase()));

    const activeDebate = debates.find((d) => d.status === 'active') || null;

    return {
      pubNews: pubNews.length,
      pendNews: pendNews.length,
      pubWritings: pubWritings.length,
      pendWritings: pendWritings.length,
      appArgs: appArgs.length,
      pendArgs: pendArgs.length,
      pendReplies: pendReplies.length,
      openReports: openReports.length,
      scheduledNews: scheduledNews.length,
      contributors: contributors.size,
      activeDebate,
    };
  }, [allNews, allWritings, allArguments, allReplies, debates, reports]);

  // Real engagement chart data over last 7 days vs last 30 days
  const chartData = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Array.from({ length: 7 }, (_, i) => {
      const start = now - (6 - i) * dayMs;
      const d = new Date(start);
      return {
        label: d.toLocaleDateString('en-GH', { weekday: 'short' }),
        start: start - dayMs / 2,
        end: start + dayMs / 2,
        items: 0,
        likes: 0,
      };
    });

    allNews
      .filter((n) => n.status === 'published')
      .forEach((n) => {
        const ms = toMillis(n.publishedAt || n.createdAt);
        const bucket = days.find((b) => ms >= b.start && ms <= b.end);
        if (bucket) {
          bucket.items += 1;
          bucket.likes += n.likesCount || 0;
        }
      });

    allWritings
      .filter((w) => w.status === 'published')
      .forEach((w) => {
        const ms = toMillis(w.publishedAt || w.createdAt);
        const bucket = days.find((b) => ms >= b.start && ms <= b.end);
        if (bucket) {
          bucket.items += 1;
          bucket.likes += w.likesCount || 0;
        }
      });

    allArguments
      .filter((a) => a.status === 'approved')
      .forEach((a) => {
        const ms = toMillis(a.createdAt);
        const bucket = days.find((b) => ms >= b.start && ms <= b.end);
        if (bucket) {
          bucket.items += 1;
          bucket.likes += a.supportCount || 0;
        }
      });

    const maxVal = Math.max(1, ...days.map((d) => d.items + d.likes));
    return { days, maxVal };
  }, [allNews, allWritings, allArguments]);

  const notifications = useMemo(() => {
    const list: Array<{ label: string; count: number; tab: string; urgent?: boolean }> = [];
    if (stats.pendNews > 0) list.push({ label: 'Pending news submissions awaiting review', count: stats.pendNews, tab: 'moderation' });
    if (stats.pendWritings > 0) list.push({ label: 'Pending creative writing submissions', count: stats.pendWritings, tab: 'moderation' });
    if (stats.pendArgs > 0) list.push({ label: 'Pending debate arguments', count: stats.pendArgs, tab: 'moderation' });
    if (stats.pendReplies > 0) list.push({ label: 'Pending debate replies', count: stats.pendReplies, tab: 'moderation' });
    if (stats.openReports > 0) list.push({ label: 'Open content reports requiring attention', count: stats.openReports, tab: 'moderation', urgent: true });
    if (stats.scheduledNews > 0) list.push({ label: 'Scheduled news publications', count: stats.scheduledNews, tab: 'news' });
    return list;
  }, [stats]);

  const handleSeed = async () => {
    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') return;
    setSeeding(true);
    try {
      await seedInauguralWdsEdition(adminUser.uid, adminUser.email);
      setSeedDone(true);
    } finally {
      setSeeding(false);
    }
  };

  const canSeed =
    adminUser?.role === 'SUPER_ADMIN' &&
    allNews.length === 0 &&
    allWritings.length === 0 &&
    debates.length === 0;

  return (
    <div className="space-y-8">
      {/* Inaugural Seeder Banner (Only when DB is completely empty & user is SUPER_ADMIN) */}
      {canSeed && !seedDone && (
        <div className="border border-[#B68D40] bg-[#FAF6EC] dark:bg-[#161D2F] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              <Sparkles className="w-4 h-4" />
              <span>Initial Platform Setup</span>
            </div>
            <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
              Publish the Inaugural WDS Edition
            </h2>
            <p className="text-xs text-[#4A4F5A] dark:text-slate-300 max-w-2xl">
              Initialize News and Writers categories, media assets, starter OLAG dispatches, the inaugural active debate motion, poetry, and platform defaults in Firestore.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeed}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            {seeding ? 'Initializing...' : 'Initialize Inaugural Edition'}
          </button>
        </div>
      )}

      {seedDone && (
        <div className="border border-emerald-700/30 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 flex items-center gap-2 text-sm text-[#14532D] dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Inaugural WDS edition initialized in Firestore.
        </div>
      )}

      {/* Real Database Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-5">
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">Published News</p>
          <p className="font-mono-tabular text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">{stats.pubNews}</p>
          <p className="font-mono-tabular text-xs text-[#8C6D32] dark:text-[#C9A458] mt-1">{stats.pendNews} pending</p>
        </div>
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-5">
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">Approved Arguments</p>
          <p className="font-mono-tabular text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">{stats.appArgs}</p>
          <p className="font-mono-tabular text-xs text-[#8C6D32] dark:text-[#C9A458] mt-1">{stats.pendArgs} pending</p>
        </div>
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-5">
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">Published Writing</p>
          <p className="font-mono-tabular text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">{stats.pubWritings}</p>
          <p className="font-mono-tabular text-xs text-[#8C6D32] dark:text-[#C9A458] mt-1">{stats.pendWritings} pending</p>
        </div>
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-5">
          <p className="text-xs text-[#5C626F] dark:text-slate-400 mb-1">Approved Contributors</p>
          <p className="font-mono-tabular text-3xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">{stats.contributors}</p>
          <p className="font-mono-tabular text-xs text-[#5C626F] dark:text-slate-400 mt-1">{stats.openReports} open reports</p>
        </div>
      </div>

      {/* Admin Notifications + Active Debate */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Admin Notifications
            </h3>
            <Bell className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-[#5C626F] dark:text-slate-400 py-3">
              All moderation queues and reports are currently clear.
            </p>
          ) : (
            <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
              {notifications.map((n) => (
                <button
                  key={n.label}
                  type="button"
                  onClick={() => onNavigateTab(n.tab)}
                  className="w-full py-3 flex items-center justify-between gap-4 text-left hover:bg-[#FAF8F4] dark:hover:bg-[#152036] px-2 cursor-pointer"
                >
                  <span className="text-sm text-[#1A1D24] dark:text-slate-200 flex items-center gap-2">
                    {n.urgent && <AlertTriangle className="w-4 h-4 text-[#9A3412] dark:text-amber-400 shrink-0" />}
                    {n.label}
                  </span>
                  <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E]">
                    {n.count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Current Active Debate
            </h3>
            <MessageSquare className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
          </div>
          {stats.activeDebate ? (
            <div className="space-y-3">
              <p className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
                {stats.activeDebate.question}
              </p>
              <p className="text-xs text-[#5C626F] dark:text-slate-400 font-mono-tabular">
                Closes {formatEditorialDate(stats.activeDebate.closeDate)} · {stats.activeDebate.approvedArgumentsCount} approved arguments
              </p>
              <button
                type="button"
                onClick={() => onNavigateTab('debates')}
                className="text-xs font-medium text-[#0B1528] dark:text-[#C9A458] underline cursor-pointer"
              >
                Manage Debate Schedule →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-[#5C626F] dark:text-slate-400">No active debate right now.</p>
              <button
                type="button"
                onClick={() => onNavigateTab('debates')}
                className="text-xs font-medium text-[#0B1528] dark:text-[#C9A458] underline cursor-pointer"
              >
                Open or schedule a debate →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Weekly Engagement Chart (Real DB Data) + Recent Moderation Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              7-Day Publication & Engagement Activity
            </h3>
            <span className="text-xs text-[#5C626F] dark:text-slate-400">Live Firestore totals</span>
          </div>
          <div className="h-44 flex items-end justify-between gap-3 pt-4">
            {chartData.days.map((d) => {
              const total = d.items + d.likes;
              const pct = Math.max(4, Math.round((total / chartData.maxVal) * 100));
              return (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono-tabular text-[11px] text-[#5C626F] dark:text-slate-400">
                    {total}
                  </span>
                  <div className="w-full max-w-[36px] bg-[#ECE8DF] dark:bg-slate-800 h-28 flex items-end">
                    <div
                      style={{ height: `${pct}%` }}
                      className="w-full bg-[#0B1528] dark:bg-[#C9A458] transition-all"
                      title={`${d.label}: ${d.items} publications, ${d.likes} likes/supports`}
                    />
                  </div>
                  <span className="text-xs text-[#4A4F5A] dark:text-slate-300">{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-6 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
              Recent Moderation & Audit Activity
            </h3>
            <FileText className="w-4 h-4 text-[#8C6D32] dark:text-[#C9A458]" />
          </div>
          {moderationRecords.length === 0 && auditLogs.length === 0 ? (
            <p className="text-sm text-[#5C626F] dark:text-slate-400 py-4">
              No moderation actions recorded yet.
            </p>
          ) : (
            <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800 max-h-48 overflow-y-auto">
              {auditLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="py-2.5 text-xs">
                  <div className="flex justify-between text-[#5C626F] dark:text-slate-400 mb-0.5">
                    <span className="font-semibold text-[#0B1528] dark:text-[#C9A458]">{log.action}</span>
                    <span>{formatEditorialDate(log.createdAt)}</span>
                  </div>
                  <p className="text-[#242833] dark:text-slate-300">{log.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
