'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Eye,
  Layout,
  Maximize2,
  ChevronRight,
  Camera
} from 'lucide-react';

export default function VisualTestingPage() {
  const screenshots = [
    { name: 'Dashboard Home', status: 'Approved', diff: '0.0%' },
    { name: 'Login Page', status: 'Changes Detected', diff: '2.4%' },
    { name: 'Checkout Process', status: 'Pending', diff: '-' },
  ];

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Eye className="w-6 h-6 text-pink-500" />
                Visual Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Detect layout regressions, rendering bugs, and style inconsistencies.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {screenshots.map((s, i) => (
              <div key={i} className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-shadow">
                <div className="h-40 bg-slate-100 dark:bg-[#111720] relative flex items-center justify-center">
                  <Camera className="w-10 h-10 text-slate-300 dark:text-slate-700" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="p-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold">{s.name}</h3>
                    <p className={`text-[10px] font-bold ${s.status === 'Approved' ? 'text-emerald-500' : 'text-amber-500'}`}>{s.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-slate-500">{s.diff}</p>
                    <button className="text-indigo-500 text-xs font-bold hover:underline">Review</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
