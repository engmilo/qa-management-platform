'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';

// EXACT same classes as your working forms — copied, not changed
export const inputCls =
  'w-full border border-[#d8dee4] dark:border-[#28374d] bg-white dark:bg-[#101622] rounded px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#276fbf]';

export const labelCls =
  'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';

type Option = { value: string; label: string };

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
}) {
  return (
    <FormField label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={`${o.value}-${o.label}`} value={o.value}>{o.label}</option>
        ))}
      </select>
    </FormField>
  );
}

// Same calendar fix as Milestones: our own icon, native icon hidden in globals.css
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormField label={label}>
      <div className="relative">
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-10 relative`} />
        <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </FormField>
  );
}

// Same buttons as your working forms: green Add + grey Cancel
export function FormActions({
  submitLabel,
  saving,
  savingLabel,
  cancelHref,
}: {
  submitLabel: string;
  saving: boolean;
  savingLabel: string;
  cancelHref: string;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-[#e2e8f0] dark:border-[#28374d]">
      <button
        type="submit"
        disabled={saving}
        className="bg-[#48a43f] hover:bg-[#3c8b34] text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
      >
        {saving ? savingLabel : submitLabel}
      </button>
      <Link
        href={cancelHref}
        className="bg-white dark:bg-[#1e2a3a] border border-[#d8dee4] dark:border-[#28374d] hover:bg-slate-50 dark:hover:bg-[#28374d] text-slate-700 dark:text-slate-200 text-sm font-medium px-4 py-2 rounded"
      >
        Cancel
      </Link>
    </div>
  );
}