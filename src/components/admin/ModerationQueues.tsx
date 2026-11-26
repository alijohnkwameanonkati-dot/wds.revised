import { useMemo, useState } from 'react';
import { collection, doc, increment, serverTimestamp, writeBatch } from 'firebase/firestore';
import { AlertTriangle, Check, Edit3, Flag, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { formatEditorialDate, sanitizePlainText } from '../../lib/sanitize';

type QueueTab = 'news' | 'writings' | 'arguments' | 'replies' | 'reports';

export function ModerationQueues() {
  const {
    adminUser,
    allNews,
    allWritings,
    allArguments,
    allReplies,
    reports,
    moderationRecords,
  } = useWds();

  const [queueTab, setQueueTab] = useState<QueueTab>('writings');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState('');
  const [flagSuspicious, setFlagSuspicious] = useState(false);
  const [approveBio, setApproveBio] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const queues = useMemo(() => {
    return {
      news: allNews.filter((n) => n.status === 'pending' || n.status === 'changes_requested'),
      writings: allWritings.filter((w) => w.status === 'pending' || w.status === 'changes_requested'),
      arguments: allArguments.filter((a) => a.status === 'pending' || a.status === 'changes_requested'),
      replies: allReplies.filter((r) => r.status === 'pending'),
      reports: reports.filter((r) => r.status === 'open'),
    };
  }, [allNews, allWritings, allArguments, allReplies, reports]);

  const currentItems = queues[queueTab];
  const selectedItem = useMemo(
    () => currentItems.find((i: any) => i.id === selectedId) || currentItems[0] || null,
    [currentItems, selectedId]
  );

  const itemHistory = useMemo(() => {
    if (!selectedItem) return [];
    return moderationRecords.filter((m) => m.targetId === selectedItem.id);
  }, [moderationRecords, selectedItem]);

  const handleDecision = async (
    action: 'approve' | 'reject' | 'request_edits' | 'resolve' | 'dismiss'
  ) => {
    if (!adminUser || !selectedItem) return;
    setBusy(true);
    setFeedback(null);
    const batch = writeBatch(db);
    const now = serverTimestamp();
    const noteText = sanitizePlainText(internalNote).slice(0, 2000);

    try {
      if (queueTab === 'news') {
        const nextStatus =
          action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'changes_requested';
        batch.update(doc(db, 'news', selectedItem.id), {
          status: nextStatus,
          publishedAt: action === 'approve' ? now : null,
          updatedAt: now,
        });
      } else if (queueTab === 'writings') {
        const nextStatus =
          action === 'approve' ? 'published' : action === 'reject' ? 'rejected' : 'changes_requested';
        batch.update(doc(db, 'writings', selectedItem.id), {
          status: nextStatus,
          publishedAt: action === 'approve' ? now : null,
          bioApproved: action === 'approve' ? approveBio : false,
          updatedAt: now,
        });
      } else if (queueTab === 'arguments') {
        const arg: any = selectedItem;
        const nextStatus =
          action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'changes_requested';
        batch.update(doc(db, 'arguments', arg.id), {
          status: nextStatus,
          updatedAt: now,
        });
        if (action === 'approve' && arg.status !== 'approved') {
          const posKey =
            arg.position === 'FOR'
              ? 'forCount'
              : arg.position === 'AGAINST'
                ? 'againstCount'
                : 'neutralCount';
          batch.update(doc(db, 'debates', arg.debateId), {
            approvedArgumentsCount: increment(1),
            [posKey]: increment(1),
            updatedAt: now,
          });
        }
      } else if (queueTab === 'replies') {
        const rep: any = selectedItem;
        const nextStatus = action === 'approve' ? 'approved' : 'rejected';
        batch.update(doc(db, 'replies', rep.id), {
          status: nextStatus,
          updatedAt: now,
        });
        if (action === 'approve') {
          batch.update(doc(db, 'arguments', rep.argumentId), {
            repliesCount: increment(1),
            updatedAt: now,
          });
        }
      } else if (queueTab === 'reports') {
        const nextStatus = action === 'dismiss' ? 'dismissed' : 'resolved';
        batch.update(doc(db, 'reports', selectedItem.id), {
          status: nextStatus,
          updatedAt: now,
        });
      }

      // Private internal moderation record (never publicly readable)
      const modAction =
        action === 'dismiss' || action === 'resolve'
          ? 'resolve'
          : action === 'request_edits'
            ? 'request_edits'
            : flagSuspicious
              ? 'flag'
              : action;

      batch.set(doc(collection(db, 'moderation_records')), {
        targetType:
          queueTab === 'news'
            ? 'news'
            : queueTab === 'writings'
              ? 'writing'
              : queueTab === 'arguments'
                ? 'argument'
                : queueTab === 'replies'
                  ? 'reply'
                  : 'report',
        targetId: selectedItem.id,
        action: modAction,
        internalNote: noteText,
        flaggedSuspicious: flagSuspicious,
        moderatorUid: adminUser.uid,
        moderatorEmail: adminUser.email,
        createdAt: now,
      });

      // Immutable Audit Log
      batch.set(doc(collection(db, 'audit_logs')), {
        action: `MOD_${action.toUpperCase()}`,
        targetType: queueTab,
        targetId: selectedItem.id,
        summary: `Moderator ${action} on ${queueTab} (${selectedItem.id})${flagSuspicious ? ' [Flagged Suspicious]' : ''}.`,
        actorUid: adminUser.uid,
        actorEmail: adminUser.email,
        actorRole: adminUser.role,
        createdAt: now,
      });

      await batch.commit();
      setInternalNote('');
      setFlagSuspicious(false);
      setSelectedId(null);
      setFeedback(`Action "${action}" saved and logged.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${queueTab}/${selectedItem.id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Separate Queue Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#D8D3C8] dark:border-slate-800">
        {(
          [
            { key: 'writings', label: 'Creative Writing', count: queues.writings.length },
            { key: 'news', label: 'News Submissions', count: queues.news.length },
            { key: 'arguments', label: 'Debate Arguments', count: queues.arguments.length },
            { key: 'replies', label: 'Debate Replies', count: queues.replies.length },
            { key: 'reports', label: 'Content Reports', count: queues.reports.length },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setQueueTab(t.key);
              setSelectedId(null);
              setFeedback(null);
            }}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
              queueTab === t.key
                ? 'border-[#B68D40] text-[#0B1528] dark:text-[#C9A458] font-semibold'
                : 'border-transparent text-[#5C626F] dark:text-slate-400 hover:text-[#0B1528]'
            }`}
          >
            {t.label} <span className="font-mono-tabular ml-1">({t.count})</span>
          </button>
        ))}
      </div>

      {feedback && (
        <p className="text-xs text-[#14532D] dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-700/30 px-4 py-2.5">
          {feedback}
        </p>
      )}

      {currentItems.length === 0 ? (
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-12 text-center text-sm text-[#5C626F] dark:text-slate-400">
          No items awaiting moderation in this queue.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-5 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] divide-y divide-[#ECE8DF] dark:divide-slate-800 max-h-[650px] overflow-y-auto">
            {currentItems.map((item: any) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 transition-colors cursor-pointer ${
                  selectedItem?.id === item.id
                    ? 'bg-[#F2EFE8] dark:bg-[#152036]'
                    : 'hover:bg-[#FAF8F4] dark:hover:bg-[#131B2E]'
                }`}
              >
                <div className="flex justify-between text-[11px] font-mono-tabular text-[#8C6D32] dark:text-[#C9A458] mb-1">
                  <span>{item.status?.toUpperCase()}</span>
                  <span>{formatEditorialDate(item.createdAt)}</span>
                </div>
                <p className="font-serif text-base font-semibold text-[#0B1528] dark:text-[#F1EFEA] line-clamp-1">
                  {item.title || item.targetTitle || item.body?.slice(0, 60)}
                </p>
                <p className="text-xs text-[#5C626F] dark:text-slate-400 mt-1">
                  {item.authorName || item.reason}
                </p>
              </button>
            ))}
          </div>

          {/* Full Preview & Moderation Action Panel */}
          {selectedItem && (
            <div className="lg:col-span-7 border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-6">
              <div className="border-b border-[#ECE8DF] dark:border-slate-800 pb-4">
                <p className="text-xs font-mono-tabular text-[#8C6D32] dark:text-[#C9A458] mb-1">
                  ID: {selectedItem.id} · Submitted {formatEditorialDate(selectedItem.createdAt)}
                </p>
                <h3 className="font-serif text-2xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">
                  {(selectedItem as any).title || (selectedItem as any).targetTitle || 'Reply Review'}
                </h3>
                <p className="text-xs text-[#5C626F] dark:text-slate-400 mt-1">
                  {(selectedItem as any).authorName
                    ? `Contributor: ${(selectedItem as any).authorName}`
                    : `Reported Reason: ${(selectedItem as any).reason}`}
                </p>
              </div>

              <div className="space-y-4 text-sm text-[#242833] dark:text-slate-200 max-h-72 overflow-y-auto pr-2">
                {(selectedItem as any).position && (
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458]">
                    Position: {(selectedItem as any).position}
                  </p>
                )}
                {(selectedItem as any).excerpt && (
                  <p className="italic text-[#4A4F5A] dark:text-slate-300">
                    {(selectedItem as any).excerpt}
                  </p>
                )}
                {(selectedItem as any).body && (
                  <div className="whitespace-pre-line leading-relaxed">{(selectedItem as any).body}</div>
                )}
                {(selectedItem as any).mainArgument && (
                  <div className="space-y-3">
                    <p className="font-medium">{(selectedItem as any).mainArgument}</p>
                    <p className="text-xs text-[#4A4F5A] dark:text-slate-300">
                      Reasoning: {(selectedItem as any).supportingReasoning}
                    </p>
                    {(selectedItem as any).references && (
                      <p className="text-xs text-[#5C626F]">Sources: {(selectedItem as any).references}</p>
                    )}
                  </div>
                )}
                {(selectedItem as any).details && (
                  <p className="text-sm">{(selectedItem as any).details}</p>
                )}
                {(selectedItem as any).authorBio && (
                  <div className="p-3 bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#E5E0D5] dark:border-slate-800 text-xs">
                    <strong>Submitted Bio:</strong> {(selectedItem as any).authorBio}
                  </div>
                )}
              </div>

              {/* Internal Moderation Notes (Private) */}
              <div className="border-t border-[#ECE8DF] dark:border-slate-800 pt-4 space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C626F] dark:text-slate-400">
                  Internal Moderation Notes (Strictly Private — Never Public)
                </label>
                <textarea
                  rows={2}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Optional editorial feedback or moderation rationale..."
                  className="w-full px-3 py-2 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100"
                />

                <div className="flex flex-wrap items-center gap-5 text-xs">
                  <label className="flex items-center gap-2 text-[#4A4F5A] dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagSuspicious}
                      onChange={(e) => setFlagSuspicious(e.target.checked)}
                    />
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Flag as suspicious / review closely
                  </label>

                  {queueTab === 'writings' && (selectedItem as any).authorBio && (
                    <label className="flex items-center gap-2 text-[#4A4F5A] dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={approveBio}
                        onChange={(e) => setApproveBio(e.target.checked)}
                      />
                      Approve author bio for public display
                    </label>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {queueTab === 'reports' ? (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision('resolve')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#14532D] text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Resolved
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision('dismiss')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Dismiss Report
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision('approve')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#14532D] text-white cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve & Publish
                    </button>
                    {queueTab !== 'replies' && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleDecision('request_edits')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border border-[#B68D40] text-[#8C6D32] dark:text-[#C9A458] cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Request Edits
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDecision('reject')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#9A3412] text-white cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" /> Reject (Keep Private)
                    </button>
                  </>
                )}
              </div>

              {/* Prior Moderation History */}
              {itemHistory.length > 0 && (
                <div className="border-t border-[#ECE8DF] dark:border-slate-800 pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[#5C626F] dark:text-slate-400">
                    Moderation History
                  </p>
                  {itemHistory.map((h) => (
                    <div key={h.id} className="text-xs text-[#4A4F5A] dark:text-slate-300 bg-[#FAF8F4] dark:bg-[#0B111E] p-2.5">
                      <span className="font-semibold uppercase">{h.action}</span> by {h.moderatorEmail} ·{' '}
                      {formatEditorialDate(h.createdAt)}
                      {h.internalNote && <p className="mt-1 italic">"{h.internalNote}"</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
