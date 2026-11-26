import { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Sparkles, Star, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { formatEditorialDate } from '../../lib/sanitize';
import { WritingWork } from '../../types/wds';

export function WritersManager() {
  const { allWritings, logAudit } = useWds();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const toggleFlag = async (
    work: WritingWork,
    field: 'featured' | 'editorsPick' | 'poetrySpotlight' | 'bioApproved'
  ) => {
    try {
      await updateDoc(doc(db, 'writings', work.id), {
        [field]: !work[field],
        updatedAt: serverTimestamp(),
      });
      await logAudit('WRITING_CURATE', 'writings', work.id, `Toggled ${field} on "${work.title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `writings/${work.id}`);
    }
  };

  const setStatus = async (work: WritingWork, status: 'published' | 'archived') => {
    try {
      await updateDoc(doc(db, 'writings', work.id), {
        status,
        publishedAt: status === 'published' ? work.publishedAt || serverTimestamp() : work.publishedAt || null,
        updatedAt: serverTimestamp(),
      });
      await logAudit('WRITING_STATUS', 'writings', work.id, `Set "${work.title}" to ${status}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `writings/${work.id}`);
    }
  };

  const removeWork = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'writings', id));
      await logAudit('WRITING_DELETE', 'writings', id, `Deleted writing "${title}".`);
      setConfirmDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `writings/${id}`);
    }
  };

  return (
    <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#D8D3C8] dark:border-slate-800 uppercase tracking-wider text-[#5C626F] dark:text-slate-400">
            <th className="py-3 px-4">Title</th>
            <th className="py-3 px-4">Author</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Curation</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
          {allWritings.map((w) => (
            <tr key={w.id}>
              <td className="py-3 px-4 font-medium text-[#0B1528] dark:text-[#F1EFEA] max-w-xs truncate">
                {w.title}
                <span className="block text-[11px] text-[#7A808C] font-mono-tabular">
                  {formatEditorialDate(w.publishedAt || w.createdAt)} · {w.likesCount} likes
                </span>
              </td>
              <td className="py-3 px-4 text-[#4A4F5A] dark:text-slate-300">{w.authorName}</td>
              <td className="py-3 px-4 text-[#5C626F] dark:text-slate-400">{w.categoryName}</td>
              <td className="py-3 px-4 font-mono-tabular uppercase">{w.status}</td>
              <td className="py-3 px-4 space-x-1.5 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => toggleFlag(w, 'featured')}
                  className={`px-2 py-1 border cursor-pointer ${w.featured ? 'border-[#B68D40] text-[#B68D40]' : 'border-[#D8D3C8] dark:border-slate-700 text-[#7A808C]'}`}
                  title="Featured Work"
                >
                  <Star className="w-3 h-3 inline mr-1" />Featured
                </button>
                <button
                  type="button"
                  onClick={() => toggleFlag(w, 'editorsPick')}
                  className={`px-2 py-1 border cursor-pointer ${w.editorsPick ? 'border-[#0B1528] dark:border-[#C9A458] text-[#0B1528] dark:text-[#C9A458]' : 'border-[#D8D3C8] dark:border-slate-700 text-[#7A808C]'}`}
                >
                  Pick
                </button>
                <button
                  type="button"
                  onClick={() => toggleFlag(w, 'poetrySpotlight')}
                  className={`px-2 py-1 border cursor-pointer ${w.poetrySpotlight ? 'border-[#B68D40] text-[#B68D40]' : 'border-[#D8D3C8] dark:border-slate-700 text-[#7A808C]'}`}
                >
                  <Sparkles className="w-3 h-3 inline mr-1" />Spotlight
                </button>
              </td>
              <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                {w.status === 'published' ? (
                  <button type="button" onClick={() => setStatus(w, 'archived')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                    Archive
                  </button>
                ) : (
                  <button type="button" onClick={() => setStatus(w, 'published')} className="px-2.5 py-1 bg-[#14532D] text-white cursor-pointer">
                    Publish
                  </button>
                )}
                {confirmDelete === w.id ? (
                  <button type="button" onClick={() => removeWork(w.id, w.title)} className="px-2.5 py-1 bg-[#9A3412] text-white cursor-pointer">
                    Confirm
                  </button>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(w.id)} className="p-1.5 text-[#9A3412] cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
