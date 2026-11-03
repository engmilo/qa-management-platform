// Shared Utility Functions

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`.toUpperCase();
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-gray-500',
    under_review: 'bg-yellow-500',
    approved: 'bg-green-500',
    implemented: 'bg-blue-500',
    verified: 'bg-emerald-500',
    rejected: 'bg-red-500',
    new: 'bg-blue-500',
    open: 'bg-orange-500',
    in_progress: 'bg-purple-500',
    fixed: 'bg-green-500',
    ready_for_retest: 'bg-yellow-500',
    closed: 'bg-gray-500',
    passed: 'bg-green-500',
    failed: 'bg-red-500',
    blocked: 'bg-orange-500',
    not_run: 'bg-gray-500',
    not_applicable: 'bg-gray-400',
  };
  return colors[status] || 'bg-gray-500';
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-green-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
  };
  return colors[priority] || 'bg-gray-500';
}
