'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  ListChecks,
  ChevronRight,
  Filter,
  PlayCircle
} from 'lucide-react';

export default function FunctionalTestingPage() {
  const tests = [
    { id: 'FT-001', name: 'User Login Authentication', status: 'Passed', time: '1.2s', suite: 'Auth' },
    { id: 'FT-002', name: 'Add to Cart Persistence', status: 'Passed', time: '0.8s', suite: 'Shopping' },
    { id: 'FT-003', name: 'Payment Gateway Validation', status: 'Failed', time: '5.4s', suite: 'Checkout' },
    { id: 'FT-004', name: 'Password Reset Flow', status: 'Passed', time: '2.1s', suite: 'Auth' },
    { id: 'FT-005', name: 'Profile Image Upload', status: 'Passed', time: '3.0s', suite: 'Settings' },
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
                <Zap className="w-6 h-6 text-amber-500" />
                Functional Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Verify business logic, user flows, and application integrity.
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
              <PlayCircle className="w-4 h-4 fill-current" /> Run Selected
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filter Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Filter className="w-4 h-4" /> Filters
                  </h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Suite</label>
                    <select className="w-full bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none">
                      <option>All Suites</option>
                      <option>Auth</option>
                      <option>Shopping</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">Status</label>
                    <div className="flex flex-col gap-2">
                      {['Passed', 'Failed', 'Pending'].map(s => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" className="rounded border-slate-300 text-indigo-600" /> {s}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Test List */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] uppercase font-bold text-slate-500 bg-slate-50/50 dark:bg-[#111720]">
                    <tr>
                      <th className="px-6 py-4">Test ID</th>
                      <th className="px-6 py-4">Test Name</th>
                      <th className="px-6 py-4">Suite</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tests.map(test => (
                      <tr key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-slate-500">{test.id}</td>
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{test.name}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{test.suite}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            test.status === 'Passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {test.status === 'Passed' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {test.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {test.time}
                        </td>
                        <td className="px-6 py-4">
                          <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
