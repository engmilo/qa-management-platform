'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

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
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">AI QA Assistant</h1>
            <p className="text-muted-foreground mt-1">Accelerate testing with AI-powered generation, analysis, and insights</p>
          </div>

          <div className="flex gap-2 mb-6 border-b border-border pb-4">
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
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Input Prompt / Requirements</h3>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-48 px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                    placeholder="Enter requirement description or user story for AI test generation..."
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? 'AI is generating...' : 'Generate with AI'}
                </button>
              </form>
            </div>

            <div className="bg-secondary border border-border rounded-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-foreground mb-4">AI Output & Review</h3>
              <div className="flex-1 bg-background border border-border rounded-md p-4 font-mono text-xs text-foreground overflow-y-auto h-48 whitespace-pre-wrap">
                {output || 'AI output will appear here after generation. All generated artifacts require human review and approval.'}
              </div>
              {output && (
                <div className="mt-4 flex gap-4">
                  <button className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium">
                    Approve & Save to Repository
                  </button>
                  <button 
                    onClick={() => setOutput('')}
                    className="px-4 py-2 bg-secondary border border-border rounded-md hover:bg-muted text-sm"
                  >
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
