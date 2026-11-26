import React, { useState } from 'react';
import { deleteDoc, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { Eye, Plus, Star, Trash2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useWds } from '../../contexts/WdsContext';
import {
  estimateReadingTime,
  formatEditorialDate,
  isSafeUrl,
  makeSlug,
  makeUniqueId,
  sanitizeMultilineText,
  sanitizePlainText,
} from '../../lib/sanitize';
import { ContentStatus, LIMITS, NewsArticle } from '../../types/wds';
import { RichContent } from '../common/RichContent';

export function NewsManager() {
  const { allNews, newsCategories, mediaLibrary, logAudit } = useWds();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [title, setTitle] = useState('');
  const [subheading, setSubheading] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [categoryId, setCategoryId] = useState(newsCategories[0]?.id || 'news-school-news');
  const [tagsText, setTagsText] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverCaption, setCoverCaption] = useState('');
  const [authorName, setAuthorName] = useState('WDS Editorial Board');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [featured, setFeatured] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setSubheading('');
    setExcerpt('');
    setBody('');
    setCategoryId(newsCategories[0]?.id || 'news-school-news');
    setTagsText('');
    setCoverImage('');
    setCoverCaption('');
    setAuthorName('WDS Editorial Board');
    setSeoTitle('');
    setSeoDescription('');
    setFeatured(false);
    setScheduledDate('');
    setPreviewMode(false);
  };

  const loadForEdit = (item: NewsArticle) => {
    setEditingId(item.id);
    setTitle(item.title);
    setSubheading(item.subheading || '');
    setExcerpt(item.excerpt);
    setBody(item.body);
    setCategoryId(item.categoryId);
    setTagsText((item.tags || []).join(', '));
    setCoverImage(item.coverImage || '');
    setCoverCaption(item.coverCaption || '');
    setAuthorName(item.authorName);
    setSeoTitle(item.seoTitle || '');
    setSeoDescription(item.seoDescription || '');
    setFeatured(item.featured);
    setPreviewMode(false);
    setStatusMsg(null);
  };

  const insertSnippet = (snippet: string) => {
    setBody((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
  };

  const saveArticle = async (targetStatus: ContentStatus) => {
    setStatusMsg(null);
    const cleanTitle = sanitizePlainText(title);
    const cleanExcerpt = sanitizePlainText(excerpt);
    const cleanBody = sanitizeMultilineText(body);

    if (cleanTitle.length < LIMITS.TITLE_MIN || cleanExcerpt.length < LIMITS.EXCERPT_MIN || cleanBody.length < 20) {
      setStatusMsg('Please provide a valid headline (4+ chars), excerpt (10+ chars), and body (20+ chars).');
      return;
    }
    if (coverImage.trim() && !isSafeUrl(coverImage.trim())) {
      setStatusMsg('Cover image URL must begin with https://, http://, or /src/assets/images/.');
      return;
    }
    if (targetStatus === 'scheduled' && !scheduledDate) {
      setStatusMsg('Please select a scheduled publication date and time.');
      return;
    }

    const cat = newsCategories.find((c) => c.id === categoryId) || newsCategories[0];
    const tags = tagsText
      .split(',')
      .map((t) => sanitizePlainText(t))
      .filter(Boolean)
      .slice(0, 8);

    const id = editingId || makeUniqueId('news');
    const payload = {
      title: cleanTitle.slice(0, LIMITS.TITLE_MAX),
      slug: `${makeSlug(cleanTitle)}-${id.slice(-5)}`,
      subheading: sanitizePlainText(subheading).slice(0, 300),
      excerpt: cleanExcerpt.slice(0, LIMITS.EXCERPT_MAX),
      body: cleanBody.slice(0, LIMITS.NEWS_BODY_MAX),
      categoryId: cat?.id || 'news-general',
      categoryName: cat?.name || 'General News',
      tags,
      coverImage: coverImage.trim().slice(0, LIMITS.URL_MAX),
      coverCaption: sanitizePlainText(coverCaption).slice(0, 300),
      authorName: (sanitizePlainText(authorName) || 'WDS Editorial Board').slice(0, LIMITS.AUTHOR_MAX),
      status: targetStatus,
      featured,
      readingTime: estimateReadingTime(cleanBody),
      seoTitle: sanitizePlainText(seoTitle).slice(0, 180),
      seoDescription: sanitizePlainText(seoDescription).slice(0, 320),
      sourceType: 'editorial' as const,
      publishedAt: targetStatus === 'published' ? serverTimestamp() : null,
      scheduledFor: targetStatus === 'scheduled' && scheduledDate ? Timestamp.fromDate(new Date(scheduledDate)) : null,
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'news', id), payload);
        await logAudit('NEWS_UPDATE', 'news', id, `Updated news article "${cleanTitle}" (${targetStatus}).`);
      } else {
        await setDoc(doc(db, 'news', id), {
          ...payload,
          likesCount: 0,
          createdAt: serverTimestamp(),
        });
        await logAudit('NEWS_CREATE', 'news', id, `Created news article "${cleanTitle}" (${targetStatus}).`);
      }
      setStatusMsg(`Article saved as ${targetStatus}.`);
      resetForm();
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, `news/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const quickUpdateStatus = async (item: NewsArticle, nextStatus: ContentStatus) => {
    try {
      await updateDoc(doc(db, 'news', item.id), {
        status: nextStatus,
        publishedAt: nextStatus === 'published' ? serverTimestamp() : item.publishedAt || null,
        updatedAt: serverTimestamp(),
      });
      await logAudit('NEWS_STATUS', 'news', item.id, `Changed "${item.title}" to ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `news/${item.id}`);
    }
  };

  const toggleFeatured = async (item: NewsArticle) => {
    try {
      await updateDoc(doc(db, 'news', item.id), {
        featured: !item.featured,
        updatedAt: serverTimestamp(),
      });
      await logAudit('NEWS_FEATURE', 'news', item.id, `${!item.featured ? 'Featured' : 'Unfeatured'} "${item.title}".`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `news/${item.id}`);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    try {
      await deleteDoc(doc(db, 'news', id));
      await logAudit('NEWS_DELETE', 'news', id, `Deleted news article "${itemTitle}".`);
      setConfirmDeleteId(null);
      if (editingId === id) resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `news/${id}`);
    }
  };

  return (
    <div className="space-y-10">
      {/* Editorial Composer */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECE8DF] dark:border-slate-800 pb-4">
          <h2 className="font-serif text-2xl font-semibold text-[#0B1528] dark:text-[#F1EFEA]">
            {editingId ? 'Edit News Article' : 'Compose News Dispatch'}
          </h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewMode((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> {previewMode ? 'Edit' : 'Preview'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-[#5C626F] hover:text-[#0B1528] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Article
              </button>
            )}
          </div>
        </div>

        {previewMode ? (
          <div className="max-w-2xl mx-auto py-4 space-y-5">
            <h3 className="font-serif text-3xl font-bold text-[#0B1528] dark:text-[#F1EFEA]">{title || 'Untitled'}</h3>
            {subheading && <p className="text-base text-[#4A4F5A] dark:text-slate-300">{subheading}</p>}
            {coverImage && <img src={coverImage} alt="Preview" referrerPolicy="no-referrer" className="w-full max-h-72 object-cover" />}
            <RichContent content={body || 'Article body preview...'} variant="article" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline *"
                className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
              <input
                type="text"
                value={subheading}
                onChange={(e) => setSubheading(e.target.value)}
                placeholder="Subheading (optional)"
                className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              >
                {newsCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Author / Editorial Team"
                className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
              <input
                type="text"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
            </div>

            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Concise article excerpt *"
              className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
            />

            {/* Rich Formatting Toolbar */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[#5C626F] dark:text-slate-400 mr-1">Insert:</span>
                <button type="button" onClick={() => insertSnippet('## Section Heading')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">H2 Heading</button>
                <button type="button" onClick={() => insertSnippet('> Editorial pull quote here.')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">Pull Quote</button>
                <button type="button" onClick={() => insertSnippet('- First key point\n- Second key point')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">Bullet List</button>
                <button type="button" onClick={() => insertSnippet('[Link Title](https://example.com)')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">Link</button>
                <button type="button" onClick={() => insertSnippet('![Figure caption](/src/assets/images/news_campus_assembly_1795723075406.jpg)')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">Inline Image</button>
              </div>
              <textarea
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write rich article body using paragraphs, ## headings, > quotes, - lists, and links..."
                className="w-full px-3.5 py-3 text-sm bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#5C626F] dark:text-slate-400 mb-1">Cover Image (Select or URL)</label>
                <select
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  className="w-full mb-2 px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
                >
                  <option value="">-- Choose from Media Library or enter URL below --</option>
                  {mediaLibrary.map((m) => (
                    <option key={m.id} value={m.url}>
                      {m.title}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://... or /src/assets/images/..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5C626F] dark:text-slate-400 mb-1">Image Caption</label>
                <input
                  type="text"
                  value={coverCaption}
                  onChange={(e) => setCoverCaption(e.target.value)}
                  placeholder="Editorial figure caption"
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700 mb-2"
                />
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="SEO Title (optional)"
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <input
                type="text"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="SEO Meta Description (optional)"
                className="px-3 py-2 text-xs bg-[#FAF8F4] dark:bg-[#0B111E] border border-[#D8D3C8] dark:border-slate-700"
              />
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
                  Feature on News & Homepage
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="px-2.5 py-1.5 border border-[#D8D3C8] dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#0B111E]"
                />
              </div>
            </div>

            {statusMsg && <p className="text-xs text-[#8C6D32] dark:text-[#C9A458]">{statusMsg}</p>}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => saveArticle('published')}
                className="px-5 py-2.5 text-xs font-medium bg-[#0B1528] text-white dark:bg-[#C9A458] dark:text-[#0B111E] cursor-pointer"
              >
                Publish Immediately
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveArticle('draft')}
                className="px-4 py-2.5 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 cursor-pointer"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => saveArticle('scheduled')}
                className="px-4 py-2.5 text-xs font-medium border border-[#D8D3C8] dark:border-slate-700 cursor-pointer"
              >
                Schedule Publication
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing News Table */}
      <div className="border border-[#D8D3C8] dark:border-slate-800 bg-white dark:bg-[#101829] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#D8D3C8] dark:border-slate-800 uppercase tracking-wider text-[#5C626F] dark:text-slate-400">
              <th className="py-3 px-4">Article</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE8DF] dark:divide-slate-800">
            {allNews.map((item) => (
              <tr key={item.id}>
                <td className="py-3 px-4 font-medium text-[#0B1528] dark:text-[#F1EFEA] max-w-xs truncate">
                  {item.title}
                </td>
                <td className="py-3 px-4 text-[#5C626F] dark:text-slate-400">{item.categoryName}</td>
                <td className="py-3 px-4 font-mono-tabular uppercase">{item.status}</td>
                <td className="py-3 px-4 font-mono-tabular text-[#5C626F] dark:text-slate-400">
                  {formatEditorialDate(item.publishedAt || item.createdAt)}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap space-x-2">
                  <button
                    type="button"
                    onClick={() => toggleFeatured(item)}
                    title="Toggle Featured"
                    className={`p-1.5 border cursor-pointer ${item.featured ? 'border-[#B68D40] text-[#B68D40]' : 'border-[#D8D3C8] dark:border-slate-700 text-[#7A808C]'}`}
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => loadForEdit(item)} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                    Edit
                  </button>
                  {item.status === 'published' ? (
                    <button type="button" onClick={() => quickUpdateStatus(item, 'archived')} className="px-2.5 py-1 border border-[#D8D3C8] dark:border-slate-700 cursor-pointer">
                      Archive
                    </button>
                  ) : (
                    <button type="button" onClick={() => quickUpdateStatus(item, 'published')} className="px-2.5 py-1 bg-[#14532D] text-white cursor-pointer">
                      Publish
                    </button>
                  )}
                  {confirmDeleteId === item.id ? (
                    <button type="button" onClick={() => handleDelete(item.id, item.title)} className="px-2.5 py-1 bg-[#9A3412] text-white cursor-pointer">
                      Confirm Delete
                    </button>
                  ) : (
                    <button type="button" onClick={() => setConfirmDeleteId(item.id)} className="p-1.5 text-[#9A3412] cursor-pointer" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
