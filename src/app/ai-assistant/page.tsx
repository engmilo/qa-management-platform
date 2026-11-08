'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { Sparkles, Check, Trash2, Wand2 } from 'lucide-react';

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState<'generator' | 'analyzer' | 'coverage' | 'defects' | 'synthetic'>('generator');
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setOutput('');

    setTimeout(() => {
      setLoading(false);
      setOutput(`--- AI Generated Test Artifacts ---
Target: ${prompt}

1. [TC-AI-01] Verify user authentication with valid credentials
   - Preconditions: User account exists in database
   - Step 1: Navigate to login page
   - Step 2: Enter valid email and password
   - Step 3: Click 'Sign In' button
   - Expected Result: User is successfully authenticated and redirected to dashboard

2. [TC-AI-02] Verify error handling with invalid password
   - Preconditions: User account exists
   - Step 1: Navigate to login page
   - Step 2: Enter valid email and incorrect password
   - Step 3: Click 'Sign In' button
   - Expected Result: Error message 'Invalid credentials' is displayed, user remains on login page

3. [TC-AI-03] Boundary test for password length
   - Preconditions: Registration page open
   - Step 1: Enter password with 7 characters
   - Expected Result: Validation error prompting for minimum 8 characters`);
    }, 1500);
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100 transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Breadcrumb / Top Bar */}
          <div className="mb-5">
            <div className="flex items-center gap-2 text-xs text-[#6e7d8c] dark:text-slate-400 mb-1">
              <span>Overview</span>
              <span>/</span>
              <span className="text-[#1d2d3e] dark:text-white font-medium">AI Assistant</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#1d2d3e] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#48a43f]" />
                  AI QA Assistant
                </h1>
                <p className="text-xs text-[#6e7d8c] dark:text-slate-400 mt-0.5">
                  Accelerate QA workflows with automated test generation, requirements analysis, and synthetic data
                </p>
              </div>
            </div>
          </div>

          {/* Subtabs */}
          <div className="flex gap-1.5 mb-5 border-b border-[#d8dee4] dark:border-[#28374d] pb-2 overflow-x-auto">
            {[
              { id: 'generator', label: 'Test Case Generator' },
              { id: 'analyzer', label: 'Requirements Analyzer' },
              { id: 'coverage', label: 'Coverage Analyzer' },
              { id: 'defects', label: 'Defect Assistant' },
              { id: 'synthetic', label: 'Test Data Generator' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-[#1d2d3e] dark:bg-[#48a43f] text-white shadow-sm'
                    : 'bg-white dark:bg-[#182232] text-[#4f6174] dark:text-slate-300 border border-[#d8dee4] dark:border-[#28374d] hover:bg-[#f5f7f9] dark:hover:bg-[#202c3e]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Input Card */}
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-lg shadow-sm p-5 flex flex-col">
              <div className="pb-3 mb-4 border-b border-[#e5e9ec] dark:border-[#28374d]">
                <h3 className="text-sm font-semibold text-[#1d2d3e] dark:text-white">Input Prompt / Specifications</h3>
                <p className="text-xs text-[#6e7d8c] dark:text-slate-400">Paste user stories, acceptance criteria, or testing instructions</p>
              </div>

              <form onSubmit={handleGenerate} className="flex-1 flex flex-col space-y-4">
                <div className="flex-1">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-64 p-3 bg-white dark:bg-[#141d28] border border-[#d8dee4] dark:border-[#28374d] rounded text-xs font-mono text-[#1d2d3e] dark:text-white focus:outline-none focus:border-[#48a43f] focus:ring-1 focus:ring-[#48a43f] placeholder-[#95a5a6] dark:placeholder-slate-500 resize-none"
                    placeholder="e.g. As a registered user, I want to securely log into the portal using my email and password with error feedback on invalid attempts..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-[#48a43f] hover:bg-[#3c8b34] text-white text-xs font-semibold rounded shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  {loading ? 'AI is generating test cases...' : 'Generate with AI'}
                </button>
              </form>
            </div>

            {/* Output Card */}
            <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-lg shadow-sm p-5 flex flex-col">
              <div className="pb-3 mb-4 border-b border-[#e5e9ec] dark:border-[#28374d] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[#1d2d3e] dark:text-white">AI Output & Review</h3>
                  <p className="text-xs text-[#6e7d8c] dark:text-slate-400">Review and approve generated artifacts before committing</p>
                </div>
                {output && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 dark:bg-[#132c1c] text-[#3d8c36] dark:text-[#52c41a] border border-green-200 dark:border-[#1d4c2b]">
                    Generated
                  </span>
                )}
              </div>

              <div className="flex-1 bg-[#f9fafb] dark:bg-[#141d28] border border-[#d8dee4] dark:border-[#28374d] rounded p-3 font-mono text-xs text-[#1d2d3e] dark:text-slate-200 overflow-y-auto h-64 whitespace-pre-wrap">
                {output || (
                  <span className="text-[#95a5a6] dark:text-slate-500 italic">
                    AI output will appear here after generation. All generated artifacts require human review and approval.
                  </span>
                )}
              </div>

              {output && (
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    className="flex-1 py-2 bg-[#48a43f] hover:bg-[#3c8b34] text-white rounded text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve & Save to Repository
                  </button>
                  <button 
                    type="button"
                    onClick={() => setOutput('')}
                    className="px-3 py-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] text-[#4f6174] dark:text-slate-300 hover:bg-[#f5f7f9] dark:hover:bg-[#202c3e] rounded text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Discard
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
