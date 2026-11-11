'use client';

import { useEffect, useState } from 'react';

type CommentRow = {
  id: string;
  author_name: string;
  author_email?: string | null;
  content: string;
  created_at: string;
};

export default function CommentsSection({ entityType, entityId }: { entityType: 'test_case' | 'defect'; entityId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/comments?entity_type=${entityType}&entity_id=${entityId}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [entityType, entityId]);

  const addComment = async () => {
    if (!text.trim() || saving) return;
    setError('');
    setSaving(true);
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_type: entityType, entity_id: entityId, content: text.trim() }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error || 'Failed to add comment'); return; }
    setText('');
    load();
  };

  return (
    <div className="mt-6 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Comments ({comments.length})</h3>

      {loading ? (
        <p className="text-xs text-slate-500">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">No comments yet. Be the first to comment.</p>
      ) : (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div key={c.id} className="border-b border-[#eef2f7] dark:border-[#28374d] pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{c.author_name}</span>
                <span className="text- text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        rows={3}
        className="w-full border border-[#d8dee4] dark:border-[#28374d] rounded px-3 py-2 text-sm bg-white dark:bg-[#101622] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#276fbf]"
      />
      <button
        onClick={addComment}
        disabled={!text.trim() || saving}
        className="mt-2 bg-[#48a43f] hover:bg-[#3c8b34] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded"
      >
        {saving ? 'Posting...' : 'Add Comment'}
      </button>
    </div>
  );
}