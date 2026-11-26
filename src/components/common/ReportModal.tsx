import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Flag, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { checkSubmissionGuard, makeUniqueId, recordSubmissionGuard, sanitizePlainText } from '../../lib/sanitize';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'news' | 'writing' | 'argument' | 'reply';
  targetId: string;
  targetTitle: string;
}

const REPORT_REASONS = [
  'Inaccurate or unverified claim',
  'Disrespectful language or personal attack',
  'Plagiarism or unattributed work',
  'Spam or off-topic links',
  'Privacy concern',
  'Other editorial issue',
];

export function ReportModal({ isOpen, onClose, targetType, targetId, targetTitle }: ReportModalProps) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanDetails = sanitizePlainText(details).slice(0, 1000);
    const guard = checkSubmissionGuard('report', `${targetType}:${targetId}:${reason}`, 15000);
    if (!guard.ok) {
      setError(guard.reason);
      return;
    }

    setSubmitting(true);
    const id = makeUniqueId('rep');
    try {
      await setDoc(doc(db, 'reports', id), {
        targetType,
        targetId,
        targetTitle: sanitizePlainText(targetTitle).slice(0, 200),
        reason,
        details: cleanDetails,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      recordSubmissionGuard('report', `${targetType}:${targetId}:${reason}`);
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md bg-[#FAF8F4] dark:bg-[#101829] border border-[#D8D3C8] dark:border-slate-800 p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8C6D32] dark:text-[#C9A458] mb-1">
              Moderation Desk
            </p>
            <h2 id="report-modal-title" className="text-xl font-serif font-semibold text-[#1A1D24] dark:text-[#F1EFEA]">
              Report Content
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="p-2 text-[#5C626F] hover:text-[#1A1D24] dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-sm text-[#242833] dark:text-slate-200 leading-relaxed">
              Thank you. Your report regarding <span className="font-medium">"{targetTitle}"</span> has been logged privately for the WDS moderation team.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setDetails('');
                onClose();
              }}
              className="w-full py-2.5 px-4 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-[#5C626F] dark:text-slate-400">
              Reporting: <span className="font-medium text-[#1A1D24] dark:text-slate-200">{targetTitle}</span>
            </p>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-[#4A4F5A] dark:text-slate-300 mb-1.5">
                Additional Context (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={1000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Briefly describe the issue for our moderators..."
                className="w-full px-3 py-2.5 text-sm bg-white dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 text-[#1A1D24] dark:text-slate-100 focus:outline-none focus:border-[#0B1528] dark:focus:border-[#C9A458]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#9A3412] dark:text-amber-400">{error}</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#5C626F] dark:text-slate-400 hover:text-[#1A1D24] dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Flag className="w-4 h-4" />
                {submitting ? 'Sending...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
