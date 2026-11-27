'use client';

import React from 'react';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import {
  Webhook,
  PlayCircle,
  Check,
  AlertTriangle,
  Search,
  ChevronRight,
  ShieldCheck,
  Code2
} from 'lucide-react';

export default function APITestingPage() {
  const endpoints = [
    { method: 'GET', path: '/api/v1/users', status: 200, latency: '45ms' },
    { method: 'POST', path: '/api/v1/auth/login', status: 200, latency: '120ms' },
    { method: 'PUT', path: '/api/v1/profile/update', status: 401, latency: '32ms' },
    { method: 'GET', path: '/api/v1/catalog/products', status: 200, latency: '65ms' },
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
                <Webhook className="w-6 h-6 text-cyan-500" />
                API Testing
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Contract, functional, and performance testing for your backend services.
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/20 transition-all">
              <PlayCircle className="w-4 h-4 fill-current" /> Run Collection
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold uppercase tracking-wider text-xs text-slate-500">Service Endpoints</h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Filter..." className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#111720] border border-slate-200 dark:border-slate-700 rounded-lg outline-none w-48" />
                </div>
              </div>
              <table className="w-full text-sm text-left">
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {endpoints.map((e, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          e.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                        }`}>{e.method}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{e.path}</td>
                      <td className="px-6 py-4">
                        <span className={`flex items-center gap-1 font-bold text-xs ${e.status === 200 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {e.status === 200 ? <Check className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />} {e.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{e.latency}</td>
                      <td className="px-6 py-4">
                        <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"><ChevronRight className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-[#182232] border border-[#d8dee4] dark:border-[#28374d] rounded-xl p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Integrations</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111720] rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-indigo-500" />
                    <span className="text-sm font-medium">Postman Collections</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-[#111720] rounded-lg">
                    <Code2 className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm font-medium">Swagger/OpenAPI</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
