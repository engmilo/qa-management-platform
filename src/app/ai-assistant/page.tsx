'use client';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Send, Sparkles, Trash2 } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; text: string };
type Project = { id: string; name: string };
type Requirement = { id: string; label: string; project_id: string };
type GenCase = { title: string; description: string; preconditions: string; steps: { action: string; expected_result: string }[]; priority: string; test_type: string; suggestedCaseKey: string };

function normProjects(data: any): Project[] {
  const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.projects) ? data.projects : Array.isArray(data?.data) ? data.data : [];
  return raw.map((r: any) => ({ id: String(r?.id ?? ''), name: String(r?.name ?? r?.title ?? '') })).filter((x) => x.id && x.name);
}
function normReqs(data: any): Requirement[] {
  const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.requirements) ? data.requirements : Array.isArray(data?.data) ? data.data : [];
  return raw.map((r: any) => ({
    id: String(r?.id ?? ''),
    project_id: String(r?.project_id ?? r?.projectId ?? ''),
    label: String(r?.req_key ? `${r.req_key} — ${r.title || r.name || ''}` : (r?.title ?? r?.name ?? '')),
  })).filter((x) => x.id && x.label);
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', text: 'Hi! I can help you write test cases, summarize a test run, or draft defect descriptions. What do you want to do?' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Phase B — Generate + Save
  const [projects, setProjects] = useState<Project[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [genProjectId, setGenProjectId] = useState('');
  const [genReqId, setGenReqId] = useState('');
  const [genCases, setGenCases] = useState<GenCase[]>([]);
  const [genSelected, setGenSelected] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genCreating, setGenCreating] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [genError, setGenError] = useState('');

  useEffect(() => {
    fetch('/api/projects', { cache: 'no-store' }).then((r) => r.json()).then((d) => { const list = normProjects(d); setProjects(list); if (list.length) setGenProjectId(list[0].id); }).catch(() => {});
    fetch('/api/requirements', { cache: 'no-store' }).then((r) => r.json()).then((d) => setRequirements(normReqs(d))).catch(() => {});
  }, []);

  const filteredReqs = genProjectId ? requirements.filter((r) => !r.project_id || r.project_id === genProjectId) : requirements;
  useEffect(() => {
    if (filteredReqs.length && !filteredReqs.some((r) => r.id === genReqId)) setGenReqId(filteredReqs[0].id);
    if (!filteredReqs.length) setGenReqId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genProjectId, requirements]);

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

  const generate = async () => {
    setGenError(''); setGenMsg(''); setGenCases([]); setGenSelected([]);
    if (!genProjectId) { setGenError('Select a project.'); return; }
    if (!genReqId) { setGenError('Select a requirement.'); return; }
    setGenLoading(true);
    try {
      const res = await fetch('/api/ai-assistant/generate-test-cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: genProjectId, requirementId: genReqId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not generate test cases.');
      const cases = (data.cases || []) as GenCase[];
      setGenCases(cases);
      setGenSelected(cases.map((c) => c.suggestedCaseKey));
      setGenMsg(`${cases.length} cases generated. Tick the ones you want, then Create Selected.`);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Could not generate test cases.');
    } finally { setGenLoading(false); }
  };

  const toggleGen = (key: string) => {
    setGenSelected((prev) => prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]);
  };

  const createSelected = async () => {
    setGenError(''); setGenMsg('');
    const toCreate = genCases.filter((c) => genSelected.includes(c.suggestedCaseKey));
    if (!toCreate.length) { setGenError('Tick at least one case.'); return; }
    setGenCreating(true);
    try {
      let created = 0;
      for (const c of toCreate) {
        const res = await fetch('/api/test-cases', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: genProjectId, project_id: genProjectId,
            caseKey: c.suggestedCaseKey, case_key: c.suggestedCaseKey,
            title: c.title, description: c.description, preconditions: c.preconditions,
            steps: c.steps, priority: c.priority, testType: ['functional','regression','integration','system','api','ui','performance','security','exploratory','uat'].includes(c.test_type) ? c.test_type : 'functional', type: ['functional','regression','integration','system','api','ui','performance','security','exploratory','uat'].includes(c.test_type) ? c.test_type : 'functional',
            status: 'draft', category: 'General',
            requirementIds: [genReqId], requirement_ids: [genReqId],
          }),
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || `Could not create ${c.suggestedCaseKey}`);
        created++;
      }
      setGenMsg(`${created} test case(s) created — open Test Cases to see them, already linked to the requirement.`);
      setGenCases([]); setGenSelected([]);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Could not create test cases.');
    } finally { setGenCreating(false); }
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
                <h1 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white tracking-tight text-left m-0"><Sparkles className="shrink-0 w-4 h-4 text-[#276fbf]" /> AI Assistant</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Generate test cases, summaries, and defect drafts.</p>
              </div>
              <button onClick={clear} className="bg-white dark:bg-[#1f2c3f] text-slate-700 dark:text-slate-200 border border-[#d8dee4] dark:border-[#28374d] text-xs font-normal px-3 py-1.5 rounded inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Clear Chat</button>
            </div>

            {/* Phase B — Generate + Save */}
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-md shadow-sm p-4 mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white m-0">Generate Test Cases from a Requirement</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">Pick Project + Requirement, Generate full coverage, tick the ones you want, Create Selected — they appear in Test Cases, already linked.</p>
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="block text-xs font-normal mb-1">Project</label>
                  <select value={genProjectId} onChange={(e) => setGenProjectId(e.target.value)} className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-2 py-2 text-xs min-w-[180px]">
                    {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-normal mb-1">Requirement</label>
                  <select value={genReqId} onChange={(e) => setGenReqId(e.target.value)} className="border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#1f2c3f] text-slate-900 dark:text-white rounded px-2 py-2 text-xs min-w-[260px]">
                    {filteredReqs.length === 0 && (<option value="">No requirements for this project</option>)}
                    {filteredReqs.map((r) => (<option key={r.id} value={r.id}>{r.label}</option>))}
                  </select>
                </div>
                <button onClick={generate} disabled={genLoading || !genProjectId || !genReqId} className="bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded inline-flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> {genLoading ? 'Generating...' : 'Generate'}</button>
              </div>
              {genError && (<p className="text-xs text-red-600 dark:text-red-400 mt-2">{genError}</p>)}
              {genMsg && (<p className="text-xs text-green-700 dark:text-green-400 mt-2">{genMsg}</p>)}
              {genCases.length > 0 && (
                <div className="mt-3 border border-[#d8dee4] dark:border-[#28374d] rounded p-3 space-y-2">
                  {genCases.map((c) => (
                    <label key={c.suggestedCaseKey} className="flex items-start gap-2 text-xs font-normal cursor-pointer">
                      <input type="checkbox" checked={genSelected.includes(c.suggestedCaseKey)} onChange={() => toggleGen(c.suggestedCaseKey)} className="accent-[#276fbf] mt-0.5" />
                      <span><b>{c.suggestedCaseKey}</b> — {c.title} <span className="text-slate-500">[{c.priority} / {c.test_type}] — {c.steps.length} steps</span><br /><span className="text-slate-500">{c.description}</span></span>
                    </label>
                  ))}
                  <button onClick={createSelected} disabled={genCreating || genSelected.length === 0} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded mt-2">{genCreating ? 'Creating...' : `Create Selected (${genSelected.length})`}</button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {prompts.map((p) => (
                <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] text-xs font-normal px-3 py-1.5 rounded hover:bg-slate-50 dark:hover:bg-[#1a2636]">{p}</button>
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
              {sending && <div className="text-xs text-slate-500 dark:text-slate-400">Thinking...</div>}
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
              <button disabled={sending || !input.trim()} className="bg-[#276fbf] hover:bg-[#1e5a9e] disabled:opacity-50 text-white text-xs font-normal px-3 py-2 rounded inline-flex items-center gap-1 shrink-0"><Send className="w-3.5 h-3.5" /> Send</button>
            </form>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Enter to send · Shift + Enter for new line</p>
          </div>
        </main>
      </div>
    </div>
  );
}
