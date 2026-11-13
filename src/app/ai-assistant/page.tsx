'use client';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Send, Sparkles, Trash2 } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; text: string };

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi! I can help you write test cases, summarize a test run, or draft defect descriptions. What do you want to do?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const autoGrow = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  useEffect(() => { autoGrow(); }, [input]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || sending) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setSending(true);
    try {
      const res = await fetch('/api/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: q }) });
      const text = await res.text();
      let data: any = {};
      try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
      if (!res.ok) throw new Error(data.error || 'Could not get a reply.');
      const reply = data.reply || data.message || data.answer || 'No reply.';
      setMessages((m) => [...m, { role: 'assistant', text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not get a reply.';
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry, I could not reply: ${msg}` }]);
    } finally {
      setSending(false);
    }
  };

  const clear = () => {
    setMessages([{ role: 'assistant', text: 'Cleared. What do you want to do next?' }]);
  };

  const prompts = [
    'Write test cases for login with 2FA',
    'Summarize open defects for this week',
    'Draft a test plan for checkout',
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0"><Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="w-full max-w-none flex flex-col h-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#276fbf]" /> AI Assistant</h1>
                <p className="text-xs text-slate-500 mt-0.5">Generate test cases, summaries, and defect drafts.</p>
              </div>
              <button onClick={clear} className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear Chat</button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {prompts.map((p) => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] text-xs font-semibold px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-[#1a2636]">{p}</button>
              ))}
            </div>

            <div className="flex-1 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 space-y-3 min-h-">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded font-normal text-xs leading-relaxed break-words whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#276fbf] text-white' : 'bg-slate-100 dark:bg-[#1f2c3f] text-slate-800 dark:text-slate-100 border border-[#e2e8f0] dark:border-[#28374d]'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {sending && <div className="text-xs text-slate-500">Thinking...</div>}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="mt-4 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-3 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoGrow(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                placeholder="Ask AI to write test cases, summarize runs, draft defects..."
                rows={1}
                className="flex-1 border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded font-normal px-3 py-2 text-sm overflow-hidden resize-none"
                style={{ scrollbarWidth: 'none' }}
              />
              <button disabled={sending || !input.trim()} className="bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-semibold px-3 py-2 rounded inline-flex items-center gap-1 shrink-0"><Send className="w-3.5 h-3.5" /> Send</button>
            </form>
            <p className="text- text-slate-400 mt-2">Enter to send · Shift + Enter for new line</p>
          </div>
        </main>
      </div>
    </div>
  );
}