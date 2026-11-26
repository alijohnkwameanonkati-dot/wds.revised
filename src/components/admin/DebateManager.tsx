import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { formatEditorialDate, makeUniqueId, sanitizeMultilineText, sanitizePlainText } from '../../lib/sanitize';
import { DebateStatus, DebateTopic } from '../../types/wds';

export function DebateManager() {
  const { debates, platformConfig, logAudit } = useWds();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');
  const [rules, setRules] = useState(
    '1. Choose FOR, AGAINST, or NEUTRAL / ANALYSIS.\n2. Support claims with sound reasoning.\n3. Address ideas respectfully without personal remarks.'
  );
  const [status, setStatus] = useState<DebateStatus>('upcoming');
  const [cycleDays, setCycleDays] = useState(platformConfig.debateCycleDays || 3);
  const [openDate, setOpenDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [closeDate, setCloseDate] = useState(() =>
    new Date(Date.now() + (platformConfig.debateCycleDays || 3) * 86400000).toISOString().slice(0, 10)
  );
  const [featured, setFeatured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setQuestion('');
    setDescription('');
    setContext('');
    setStatus('upcoming');
    setCycleDays(platformConfig.debateCycleDays || 3);
    setFeatured(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const cleanTitle = sanitizePlainText(title);
    const cleanQ = sanitizePlainText(question);
    const cleanDesc = sanitizePlainText(description);
    if (cleanTitle.length < 4 || cleanQ.length < 10 || cleanDesc.length < 10) {
      setMsg('Please complete title, motion question, and description.');
      return;
    }

    const id = editingId || makeUniqueId('deb');
    const openTs = Timestamp.fromDate(new Date(`${openDate}T00:00:00`));
    const closeTs = Timestamp.fromDate(new Date(`${closeDate}T23:59:59`));

    setSaving(true);
    try {
      const payload = {
        title: cleanTitle.slice(0, 180),
        question: cleanQ.slice(0, 320),
        description: cleanDesc.slice(0, 800),
        context: sanitizeMultilineText(context).slice(0, 6000),
        rules: sanitizeMultilineText(rules).slice(0, 3000),
        status,
        openDate: openTs,
        closeDate: closeTs,
        cycleDays: Number(cycleDays) || 3,
        featured,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'debates', id), payload);
        await logAudit('DEBATE_UPDATE', 'debates', id, `Updated debate "${cleanTitle}" (${status}).`);
      } else {
        await setDoc(doc(db, 'debates', id), {
          ...payload,
          approvedArgumentsCount: 0,
          forCount: 0,
          againstCount: 0,
          neutralCount: 0,
          createdAt: serverTimestamp(),
        });
        await logAudit('DEBATE_CREATE', 'debates', id, `Created debate "${cleanTitle}" (${status}).`);
      }
      setMsg(`Debate saved with status "${status}".`);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, `debates/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const loadDebate = (d: DebateTopic) => {
    setEditingId(d.id);
    setTitle(d.title);
    setQuestion(d.question);
    setDescription(d.description);
    setContext(d.context || '');
    setRules(d.rules || '');
    setStatus(d.status);
    setCycleDays(d.cycleDays);
    setFeatured(d.featured);
  };

  const updateStatus = async (d: DebateTopic, nextStatus: DebateStatus) => {
    try {
      await updateDoc(doc(db, 'debates', d.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      await logAudit('DEBATE_STATUS', 'debates', d.id, `Set debate "${d.title}" to ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `debates/${d.id}`);
    }
  };

  const deleteDebate = async (id: string, dTitle: string) => {
    try {
      await deleteDoc(doc(db, 'debates', id));
      await logAudit('DEBATE_DELETE', 'debates', id, `Deleted debate "${dTitle}".`);
      setConfirmDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `debates/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      <form onSubmit={handleSave} className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            {editingId ? 'Edit Debate Motion' : 'Create / Schedule Debate'}
          </h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs underline cursor-pointer">
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short Motion Title *"
            className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DebateStatus)}
            className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          >
            <option value="upcoming">Upcoming (Requires Admin Approval to Activate)</option>
            <option value="active">Active (Open for Submissions)</option>
            <option value="closed">Closed (Read-Only)</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <input
          type="text"
          required
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Debate Question / Resolution *"
          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
        />

        <textarea
          rows={2}
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief Overview *"
          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea
            rows={4}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Background & Context"
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
          <textarea
            rows={4}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Participation Rules"
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block mb-1 text-[#5C626F]">Open Date</label>
            <input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Close Date</label>
            <input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
          <div>
            <label className="block mb-1 text-[#5C626F]">Cycle Length (Days)</label>
            <input type="number" min={1} max={90} value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} className="w-full px-3 py-2 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]" />
          </div>
        </div>

        {msg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{msg}</p>}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer"
        >
          {saving ? 'Saving...' : editingId ? 'Update Debate' : 'Save Debate'}
        </button>
      </form>

      {/* Debates List */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] divide-y divide-[#ECE8DF] dark:divide-slate-800">
        {debates.map((d) => (
          <div key={d.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono-tabular text-[#8C6D32] dark:text-[#C9A458] mb-1">
                {d.status.toUpperCase()} · {formatEditorialDate(d.openDate)} – {formatEditorialDate(d.closeDate)} · {d.approvedArgumentsCount} arguments
              </div>
              <p className="font-serif text-lg font-semibold text-[#0B1528] dark:text-[#F1EFEA]">{d.question}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              <button type="button" onClick={() => loadDebate(d)} className="px-3 py-1.5 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                Edit
              </button>
              {d.status !== 'active' && (
                <button type="button" onClick={() => updateStatus(d, 'active')} className="px-3 py-1.5 bg-[#14532D] text-white cursor-pointer">
                  Activate
                </button>
              )}
              {d.status === 'active' && (
                <button type="button" onClick={() => updateStatus(d, 'closed')} className="px-3 py-1.5 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                  Close
                </button>
              )}
              {d.status === 'closed' && (
                <button type="button" onClick={() => updateStatus(d, 'archived')} className="px-3 py-1.5 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                  Archive
                </button>
              )}
              {confirmDelete === d.id ? (
                <button type="button" onClick={() => deleteDebate(d.id, d.title)} className="px-3 py-1.5 bg-[#9A3412] text-white cursor-pointer">
                  Confirm Delete
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(d.id)} className="p-1.5 text-[#9A3412] cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
