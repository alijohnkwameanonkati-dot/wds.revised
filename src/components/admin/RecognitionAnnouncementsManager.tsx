import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { makeUniqueId, sanitizePlainText } from '../../lib/sanitize';

export function RecognitionAnnouncementsManager() {
  const { adminUser, recognitions, announcements, platformConfig, subscribers, logAudit } = useWds();

  // Monthly recognition form
  const [periodLabel, setPeriodLabel] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [featuredWorkTitle, setFeaturedWorkTitle] = useState('');
  const [reason, setReason] = useState('');
  const [points, setPoints] = useState(50);
  const [recMsg, setRecMsg] = useState<string | null>(null);

  // Announcement form
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annPriority, setAnnPriority] = useState<'normal' | 'important'>('important');
  const [annMsg, setAnnMsg] = useState<string | null>(null);

  // Scoring weights (SUPER_ADMIN)
  const [weights, setWeights] = useState(platformConfig.scoringWeights);
  const [newsletterEnabled, setNewsletterEnabled] = useState(platformConfig.newsletterEnabled);
  const [configMsg, setConfigMsg] = useState<string | null>(null);

  const handleSaveRecognition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setRecMsg(null);
    const id = makeUniqueId('rec');
    try {
      const batch = writeBatch(db);
      recognitions.forEach((r) => {
        if (r.isCurrent) {
          batch.update(doc(db, 'recognitions', r.id), { isCurrent: false, updatedAt: serverTimestamp() });
        }
      });
      batch.set(doc(db, 'recognitions', id), {
        periodLabel: sanitizePlainText(periodLabel).slice(0, 60),
        contributorName: sanitizePlainText(contributorName).slice(0, 100),
        featuredWorkTitle: sanitizePlainText(featuredWorkTitle).slice(0, 180),
        reason: sanitizePlainText(reason).slice(0, 600),
        points: Math.max(0, Number(points) || 0),
        isCurrent: true,
        approvedBy: adminUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      await logAudit('RECOGNITION_SET', 'recognitions', id, `Approved Contributor of the Month: ${contributorName} (${periodLabel}).`);
      setPeriodLabel('');
      setContributorName('');
      setFeaturedWorkTitle('');
      setReason('');
      setRecMsg('Monthly recognition published.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `recognitions/${id}`);
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnMsg(null);
    const id = makeUniqueId('ann');
    try {
      await setDoc(doc(db, 'announcements', id), {
        title: sanitizePlainText(annTitle).slice(0, 160),
        body: sanitizePlainText(annBody).slice(0, 1000),
        priority: annPriority,
        active: true,
        linkUrl: '',
        linkLabel: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAudit('ANNOUNCEMENT_CREATE', 'announcements', id, `Created announcement "${annTitle}".`);
      setAnnTitle('');
      setAnnBody('');
      setAnnMsg('Announcement posted.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `announcements/${id}`);
    }
  };

  const toggleAnnouncement = async (id: string, active: boolean) => {
    try {
      await updateDoc(doc(db, 'announcements', id), { active: !active, updatedAt: serverTimestamp() });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
    }
  };

  const handleSaveScoringAndNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser || adminUser.role !== 'SUPER_ADMIN') return;
    setConfigMsg(null);
    try {
      await setDoc(doc(db, 'platform_config', 'main'), {
        ...platformConfig,
        scoringWeights: weights,
        newsletterEnabled,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser.uid,
      });
      await logAudit('CONFIG_SCORING', 'platform_config', 'main', 'Updated leaderboard scoring weights and newsletter settings.');
      setConfigMsg('Scoring & newsletter preferences saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'platform_config/main');
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Recognition */}
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-5">
          <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            Approve Contributor of the Month
          </h2>
          <form onSubmit={handleSaveRecognition} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Period (e.g., November 2026)"
                className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
              <input
                type="number"
                required
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                placeholder="Verified Points"
                className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
            </div>
            <input
              type="text"
              required
              value={contributorName}
              onChange={(e) => setContributorName(e.target.value)}
              placeholder="Approved Contributor Name / Pseudonym *"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <input
              type="text"
              required
              value={featuredWorkTitle}
              onChange={(e) => setFeaturedWorkTitle(e.target.value)}
              placeholder="Featured Work Title *"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <textarea
              rows={3}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Citation / Reason for Recognition *"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            {recMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{recMsg}</p>}
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
              Approve & Publish Winner
            </button>
          </form>
        </div>

        {/* School Announcements */}
        <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-5">
          <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            Important School Announcements
          </h2>
          <form onSubmit={handleAddAnnouncement} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder="Announcement Title *"
                className="col-span-2 px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
              <select
                value={annPriority}
                onChange={(e) => setAnnPriority(e.target.value as 'normal' | 'important')}
                className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              >
                <option value="important">Important</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <textarea
              rows={2}
              required
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              placeholder="Notice text *"
              className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            {annMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{annMsg}</p>}
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
              Post Announcement
            </button>
          </form>

          <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800 max-h-56 overflow-y-auto text-xs">
            {announcements.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{a.title}</p>
                  <p className="text-[#5C626F] dark:text-slate-400 truncate">{a.body}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => toggleAnnouncement(a.id, a.active)} className="px-2 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                    {a.active ? 'Hide' : 'Show'}
                  </button>
                  <button type="button" onClick={() => deleteAnnouncement(a.id)} className="text-[#9A3412] p-1 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Super Admin Leaderboard Scoring & Newsletter Controls */}
      {adminUser?.role === 'SUPER_ADMIN' && (
        <form onSubmit={handleSaveScoringAndNewsletter} className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-5">
          <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
            Leaderboard Scoring Weights & Edition Newsletter
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs">
            <div>
              <label className="block mb-1 text-[#5C626F]">Published Writing</label>
              <input type="number" min={0} value={weights.writingPublished} onChange={(e) => setWeights({ ...weights, writingPublished: Number(e.target.value) })} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            </div>
            <div>
              <label className="block mb-1 text-[#5C626F]">Writing Like</label>
              <input type="number" min={0} value={weights.writingLike} onChange={(e) => setWeights({ ...weights, writingLike: Number(e.target.value) })} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            </div>
            <div>
              <label className="block mb-1 text-[#5C626F]">Approved Argument</label>
              <input type="number" min={0} value={weights.argumentApproved} onChange={(e) => setWeights({ ...weights, argumentApproved: Number(e.target.value) })} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            </div>
            <div>
              <label className="block mb-1 text-[#5C626F]">Argument Support</label>
              <input type="number" min={0} value={weights.argumentSupport} onChange={(e) => setWeights({ ...weights, argumentSupport: Number(e.target.value) })} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            </div>
            <div>
              <label className="block mb-1 text-[#5C626F]">News Like</label>
              <input type="number" min={0} value={weights.newsLike} onChange={(e) => setWeights({ ...weights, newsLike: Number(e.target.value) })} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={newsletterEnabled} onChange={(e) => setNewsletterEnabled(e.target.checked)} />
              <span>Enable public Edition Dispatch newsletter subscription ({subscribers.filter((s) => s.active).length} active subscribers)</span>
            </label>
            <button type="submit" className="px-5 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
              Save Scoring & Newsletter Settings
            </button>
          </div>
          {configMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{configMsg}</p>}
        </form>
      )}
    </div>
  );
}
