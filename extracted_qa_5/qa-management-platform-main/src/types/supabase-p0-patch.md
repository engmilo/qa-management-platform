# Types patch — apply to src/types/supabase.ts
Add to TestStatus: 'retest'
  export type TestStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'retest' | 'not_applicable';

Add updated_at?: string to every Row type that got the migration (projects, requirements,
test_cases, test_plans, test_runs, test_executions, defects, releases, test_suites).

Add to test_runs Row: description: string | null; configuration: string | null;
Add to test_cases Row: estimate_minutes: number | null;
Add to test_suites Row: project_id: string | null; sort_order: number;
Add to releases Row: description: string | null;

