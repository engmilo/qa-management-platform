"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";

type TestRun = {
  id: string;
  name: string;
  status?: string;
  assignee?: string;
  description?: string;
};

type TestCase = {
  id: string;
  caseKey?: string;
  key?: string;
  title: string;
};

type Execution = {
  id: string;
  testCaseId?: string;
  test_case_id?: string;
  result?: string;
  status?: string;
};

export default function TestRunDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [run, setRun] = useState<TestRun | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const [runRes, casesRes] = await Promise.all([
          fetch(`/api/test-runs/${id}`),
          fetch(`/api/test-cases`),
        ]);
        if (runRes.ok) {
          const data = await runRes.json();
          setRun(data.run ?? data);
        }
        if (casesRes.ok) {
          const data = await casesRes.json();
          setTestCases(data.testCases ?? data.cases ?? data ?? []);
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const resultFor = (tc: TestCase) => {
    const ex = executions.find(
      (e) => e.testCaseId === tc.id || e.test_case_id === tc.id
    );
    const raw = (ex?.result ?? ex?.status ?? "not_run").toLowerCase();
    return raw;
  };

  const counts = testCases.reduce(
    (acc, tc) => {
      const r = resultFor(tc);
      if (r === "passed" || r === "pass") acc.passed += 1;
      else if (r === "failed" || r === "fail") acc.failed += 1;
      else if (r === "blocked") acc.blocked += 1;
      else acc.notRun += 1;
      return acc;
    },
    { passed: 0, failed: 0, blocked: 0, notRun: 0 }
  );

  const total = testCases.length || 1;
  const done = counts.passed + counts.failed + counts.blocked;
  const pct = Math.round((done / total) * 100);
  const isCompleted = (run?.status ?? "").toLowerCase() === "completed";

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/test-runs/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/test-runs");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleComplete = async () => {
    try {
      await fetch(`/api/test-runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setRun((prev) => (prev ? { ...prev, status: "completed" } : prev));
    } finally {
      setShowComplete(false);
    }
  };

  const labelFor = (raw: string) => {
    if (raw === "not_run" || raw === "notrun") return "Not Run";
    if (raw === "passed" || raw === "pass") return "Passed";
    if (raw === "failed" || raw === "fail") return "Failed";
    if (raw === "blocked") return "Blocked";
    return "Not Run";
  };

  return (
    <div className="flex h-screen bg-[#f5f7f9] dark:bg-[#101622] text-slate-800 dark:text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="w-full max-w-none">
              <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#28374d] rounded-lg p-6 text-sm text-slate-500">
                Loading...
              </div>
            </div>
          ) : (
            <div className="w-full max-w-none">
              <Link
                href="/test-runs"
                className="text-sm text-blue-500 hover:underline font-normal"
              >
                ← Test Runs &amp; Results
              </Link>

              {/* Header - Delete is FAR RIGHT, not on title */}
              <div className="flex justify-between items-start mt-3 mb-4 gap-4">
                <h1 className="text-base font-bold text-white tracking-tight text-left m-0">
                  {run?.name ?? "Test Run"}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center bg-[#1e2a3d] text-blue-300 text-xs px-2.5 py-1 rounded font-normal">
                    {isCompleted ? "Completed" : "In Progress"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ fontWeight: 400 }}
                    className="inline-flex items-center gap-1 shrink-0 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-normal text-xs px-3 py-1.5 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => setShowComplete(true)}
                      style={{ fontWeight: 400 }}
                      className="inline-flex items-center shrink-0 bg-[#16a34a] hover:bg-[#15803d] text-white font-normal text-xs px-3 py-1.5 rounded"
                    >
                      Complete Run
                    </button>
                  )}
                  <Link
                    href="/test-runs/new"
                    className="inline-flex items-center shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-normal text-xs px-3 py-1.5 rounded"
                  >
                    + New Run
                  </Link>
                </div>
              </div>

              {/* Progress */}
              <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#28374d] rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-normal">Progress</span>
                  <span className="text-sm font-normal">
                    {done} / {testCases.length} · {pct}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-sm font-normal m-0">
                  Assignee: {run?.assignee ?? "Milo Haireche"}
                </p>
                <p className="text-sm font-normal m-0 mt-1">
                  <span className="text-green-500">Passed: {counts.passed}</span>
                  <span className="mx-1">·</span>
                  <span className="text-red-500">Failed: {counts.failed}</span>
                  <span className="mx-1">·</span>
                  <span className="text-amber-500">Blocked: {counts.blocked}</span>
                  <span className="mx-1">·</span>
                  <span className="text-slate-400">Not Run: {counts.notRun}</span>
                </p>
              </div>

              {/* Execution History */}
              <div className="bg-white dark:bg-[#182232] border border-slate-200 dark:border-[#28374d] rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-[#28374d]">
                  <h2 className="text-sm font-normal m-0">
                    Execution History — Test Cases
                  </h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200 dark:border-[#28374d]">
                      <th className="px-4 py-2 font-normal">Test Case</th>
                      <th className="px-4 py-2 font-normal">Result</th>
                      <th className="px-4 py-2 font-normal">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testCases.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-slate-500 font-normal">
                          No test cases in this run yet.
                        </td>
                      </tr>
                    ) : (
                      testCases.map((tc) => {
                        const raw = resultFor(tc);
                        const label = labelFor(raw);
                        const pill =
                          label === "Passed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                            : label === "Failed"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : label === "Blocked"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
                        const key = tc.caseKey ?? tc.key ?? tc.id;
                        return (
                          <tr
                            key={tc.id}
                            className="border-b border-slate-100 dark:border-[#232f45] last:border-0"
                          >
                            <td className="px-4 py-3 font-normal">
                              <span className="text-blue-500">
                                {key} — {tc.title}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-xs font-normal ${pill}`}
                              >
                                {label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpanded(expanded === tc.id ? null : tc.id)
                                }
                                className="text-blue-500 hover:underline font-normal text-sm"
                              >
                                View steps {expanded === tc.id ? "▲" : "▼"}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Delete Confirm */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-[#182232] rounded-lg p-6 w- max-w-">
                <h3 className="text-base font-normal m-0 mb-2">Delete Test Run?</h3>
                <p className="text-sm font-normal text-slate-500 m-0 mb-4">
                  This will permanently delete {run?.name ?? "this run"}. This action cannot be undone.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    style={{ fontWeight: 400 }}
                    className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-sm font-normal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ fontWeight: 400 }}
                    className="px-4 py-2 rounded bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-normal disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Complete Confirm */}
          {showComplete && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-[#182232] rounded-lg p-6 w- max-w-">
                <h3 className="text-base font-normal m-0 mb-2">Complete Run?</h3>
                <p className="text-sm font-normal text-slate-500 m-0 mb-4">
                  Mark {run?.name ?? "this run"} as completed?
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowComplete(false)}
                    style={{ fontWeight: 400 }}
                    className="px-4 py-2 rounded bg-slate-200 dark:bg-slate-700 text-sm font-normal"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleComplete}
                    style={{ fontWeight: 400 }}
                    className="px-4 py-2 rounded bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-normal"
                  >
                    Complete Run
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}