import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Trash2, Upload } from 'lucide-react';
import { db, handleFirestoreError, OperationType, storage } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import { isSafeUrl, makeSlug, makeUniqueId, sanitizePlainText } from '../../lib/sanitize';

export function CategoriesMediaManager() {
  const { categories, mediaLibrary, adminUser, logAudit } = useWds();

  // Category state
  const [catName, setCatName] = useState('');
  const [catPillar, setCatPillar] = useState<'news' | 'writers'>('news');
  const [catOrder, setCatOrder] = useState(10);
  const [catMsg, setCatMsg] = useState<string | null>(null);

  // Media state
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaCaption, setMediaCaption] = useState('');
  const [mediaCategory, setMediaCategory] = useState('Editorial');
  const [mediaMsg, setMediaMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatMsg(null);
    const clean = sanitizePlainText(catName);
    if (clean.length < 2) {
      setCatMsg('Category name must be at least 2 characters.');
      return;
    }
    const slug = makeSlug(clean);
    const id = `${catPillar}-${slug}`.slice(0, 60);
    try {
      await setDoc(doc(db, 'categories', id), {
        name: clean.slice(0, 60),
        slug,
        pillar: catPillar,
        description: `${clean} entries`,
        order: Number(catOrder) || 10,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await logAudit('CATEGORY_SAVE', 'categories', id, `Saved category "${clean}" (${catPillar}).`);
      setCatName('');
      setCatMsg('Category saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `categories/${id}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
      await logAudit('CATEGORY_DELETE', 'categories', id, `Removed category "${name}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const handleStorageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaMsg(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMediaMsg('Only JPEG, PNG, or WebP images are permitted.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMediaMsg('Image file must be smaller than 2 MB.');
      return;
    }
    setUploading(true);
    try {
      const storageRef = ref(storage, `wds-media/${Date.now()}-${makeSlug(file.name)}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setMediaUrl(url);
      if (!mediaTitle) setMediaTitle(file.name.replace(/\.[^.]+$/, ''));
      setMediaMsg('Image uploaded to Firebase Storage.');
    } catch {
      setMediaMsg('Storage upload unavailable; you may still register verified HTTPS image URLs.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser) return;
    setMediaMsg(null);
    const cleanUrl = mediaUrl.trim();
    if (!cleanUrl || !isSafeUrl(cleanUrl)) {
      setMediaMsg('Enter a valid https://, http://, or /src/assets/images/ URL.');
      return;
    }
    const id = makeUniqueId('med');
    try {
      await setDoc(doc(db, 'media_library', id), {
        title: sanitizePlainText(mediaTitle || 'Editorial Asset').slice(0, 140),
        url: cleanUrl.slice(0, 1000),
        altText: sanitizePlainText(mediaAlt || mediaTitle || 'WDS media').slice(0, 240),
        caption: sanitizePlainText(mediaCaption).slice(0, 300),
        category: sanitizePlainText(mediaCategory || 'Editorial').slice(0, 60),
        createdAt: serverTimestamp(),
        createdBy: adminUser.uid,
      });
      await logAudit('MEDIA_ADD', 'media_library', id, `Added media asset "${mediaTitle}".`);
      setMediaTitle('');
      setMediaUrl('');
      setMediaAlt('');
      setMediaCaption('');
      setMediaMsg('Media asset added to library.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `media_library/${id}`);
    }
  };

  const handleDeleteMedia = async (id: string, title: string) => {
    try {
      await deleteDoc(doc(db, 'media_library', id));
      await logAudit('MEDIA_DELETE', 'media_library', id, `Removed media asset "${title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `media_library/${id}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Categories Management */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-6">
        <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
          Editorial Categories
        </h2>

        <form onSubmit={handleAddCategory} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              placeholder="Category name"
              className="sm:col-span-2 px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <select
              value={catPillar}
              onChange={(e) => setCatPillar(e.target.value as 'news' | 'writers')}
              className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            >
              <option value="news">News</option>
              <option value="writers">Writers</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              value={catOrder}
              onChange={(e) => setCatOrder(Number(e.target.value))}
              className="w-24 px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              placeholder="Order"
            />
            <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
              Add Category
            </button>
          </div>
          {catMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{catMsg}</p>}
        </form>

        <div className="divide-y divide-[#ECE8DF] dark:divide-slate-800 max-h-80 overflow-y-auto text-xs">
          {categories.map((c) => (
            <div key={c.id} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-medium text-[#0B1528] dark:text-[#F1EFEA]">{c.name}</span>
                <span className="ml-2 text-[#5C626F] dark:text-slate-400 uppercase">{c.pillar}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteCategory(c.id, c.name)}
                className="text-[#9A3412] p-1 cursor-pointer"
                title="Remove category"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Media Library */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 space-y-6">
        <h2 className="font-serif text-xl font-semibold text-[#0B1528] dark:text-[#F1EFEA] border-b border-[#ECE8DF] dark:border-slate-800 pb-3">
          Media Library
        </h2>

        <form onSubmit={handleAddMedia} className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 px-3 py-2 text-xs border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading...' : 'Upload Image (JPEG/PNG/WebP <2MB)'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleStorageUpload} className="hidden" />
            </label>
          </div>
          <input
            type="text"
            required
            value={mediaTitle}
            onChange={(e) => setMediaTitle(e.target.value)}
            placeholder="Asset Title *"
            className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
          <input
            type="text"
            required
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="Image URL (https://... or uploaded URL) *"
            className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={mediaAlt}
              onChange={(e) => setMediaAlt(e.target.value)}
              placeholder="Alt text *"
              className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
            <input
              type="text"
              value={mediaCategory}
              onChange={(e) => setMediaCategory(e.target.value)}
              placeholder="Category"
              className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />
          </div>
          <input
            type="text"
            value={mediaCaption}
            onChange={(e) => setMediaCaption(e.target.value)}
            placeholder="Caption (optional)"
            className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
          />
          {mediaMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{mediaMsg}</p>}
          <button type="submit" className="px-4 py-2 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer">
            Register Media Asset
          </button>
        </form>

        <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto">
          {mediaLibrary.map((m) => (
            <div key={m.id} className="border border-[#E5E0D5] dark:border-slate-800 p-2 space-y-1.5">
              <img src={m.url} alt={m.altText} referrerPolicy="no-referrer" className="w-full h-24 object-cover" />
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate font-medium">{m.title}</span>
                <button type="button" onClick={() => handleDeleteMedia(m.id, m.title)} className="text-[#9A3412] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
