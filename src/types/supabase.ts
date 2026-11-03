// TypeScript Database Types for Supabase
// Generated from supabase_schema.sql

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          plan?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          plan?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string;
          avatar_url?: string | null;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'super_admin' | 'org_admin' | 'qa_manager' | 'qa_engineer' | 'developer' | 'viewer';
          created_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role: 'super_admin' | 'org_admin' | 'qa_manager' | 'qa_engineer' | 'developer' | 'viewer';
        };
        Update: {
          role?: 'super_admin' | 'org_admin' | 'qa_manager' | 'qa_engineer' | 'developer' | 'viewer';
        };
      };
      projects: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          name: string;
          description: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          key: string;
          name: string;
          description?: string | null;
          status?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          status?: string;
        };
      };
      requirements: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          req_key: string;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'draft' | 'under_review' | 'approved' | 'implemented' | 'verified' | 'rejected';
          type: 'functional' | 'non_functional' | 'business' | 'performance' | 'security';
          version: number;
          owner_id: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          req_key: string;
          title: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'draft' | 'under_review' | 'approved' | 'implemented' | 'verified' | 'rejected';
          type?: 'functional' | 'non_functional' | 'business' | 'performance' | 'security';
          version?: number;
          owner_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'draft' | 'under_review' | 'approved' | 'implemented' | 'verified' | 'rejected';
          type?: 'functional' | 'non_functional' | 'business' | 'performance' | 'security';
          version?: number;
          owner_id?: string | null;
        };
      };
      test_cases: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          case_key: string;
          title: string;
          description: string | null;
          preconditions: string | null;
          priority: 'low' | 'medium' | 'high' | 'critical';
          test_type: 'functional' | 'regression' | 'integration' | 'system' | 'api' | 'ui' | 'performance' | 'security' | 'exploratory' | 'uat';
          category: string;
          automation_status: 'manual' | 'automated' | 'to_automate' | 'not_automatable';
          tags: string[] | null;
          author_id: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          case_key: string;
          title: string;
          description?: string | null;
          preconditions?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          test_type?: 'functional' | 'regression' | 'integration' | 'system' | 'api' | 'ui' | 'performance' | 'security' | 'exploratory' | 'uat';
          category?: string;
          automation_status?: 'manual' | 'automated' | 'to_automate' | 'not_automatable';
          tags?: string[] | null;
          author_id?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          preconditions?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          test_type?: 'functional' | 'regression' | 'integration' | 'system' | 'api' | 'ui' | 'performance' | 'security' | 'exploratory' | 'uat';
          category?: string;
          automation_status?: 'manual' | 'automated' | 'to_automate' | 'not_automatable';
          tags?: string[] | null;
          author_id?: string | null;
        };
      };
      test_case_steps: {
        Row: {
          id: string;
          test_case_id: string;
          step_number: number;
          action: string;
          expected_result: string;
        };
        Insert: {
          test_case_id: string;
          step_number: number;
          action: string;
          expected_result: string;
        };
        Update: {
          step_number?: number;
          action?: string;
          expected_result?: string;
        };
      };
      test_plans: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          title: string;
          scope: string | null;
          release_id: string | null;
          start_date: string | null;
          end_date: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          title: string;
          scope?: string | null;
          release_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
        };
        Update: {
          title?: string;
          scope?: string | null;
          release_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          status?: string;
        };
      };
      test_runs: {
        Row: {
          id: string;
          project_id: string;
          test_plan_id: string | null;
          organization_id: string;
          name: string;
          assigned_to: string | null;
          status: string;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          project_id: string;
          test_plan_id?: string | null;
          organization_id: string;
          name: string;
          assigned_to?: string | null;
          status?: string;
        };
        Update: {
          name?: string;
          assigned_to?: string | null;
          status?: string;
          completed_at?: string | null;
        };
      };
      test_executions: {
        Row: {
          id: string;
          test_run_id: string;
          test_case_id: string;
          organization_id: string;
          tester_id: string | null;
          status: 'not_run' | 'passed' | 'failed' | 'blocked' | 'not_applicable';
          actual_result: string | null;
          comments: string | null;
          executed_at: string | null;
        };
        Insert: {
          test_run_id: string;
          test_case_id: string;
          organization_id: string;
          tester_id?: string | null;
          status?: 'not_run' | 'passed' | 'failed' | 'blocked' | 'not_applicable';
          actual_result?: string | null;
          comments?: string | null;
          executed_at?: string | null;
        };
        Update: {
          tester_id?: string | null;
          status?: 'not_run' | 'passed' | 'failed' | 'blocked' | 'not_applicable';
          actual_result?: string | null;
          comments?: string | null;
          executed_at?: string | null;
        };
      };
      defects: {
        Row: {
          id: string;
          project_id: string;
          organization_id: string;
          defect_key: string;
          summary: string;
          description: string | null;
          severity: 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'new' | 'open' | 'in_progress' | 'fixed' | 'ready_for_retest' | 'reopened' | 'closed' | 'rejected';
          environment: string | null;
          steps_to_reproduce: string | null;
          expected_result: string | null;
          actual_result: string | null;
          assigned_to: string | null;
          reporter_id: string | null;
          test_case_id: string | null;
          test_execution_id: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          organization_id: string;
          defect_key: string;
          summary: string;
          description?: string | null;
          severity?: 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'open' | 'in_progress' | 'fixed' | 'ready_for_retest' | 'reopened' | 'closed' | 'rejected';
          environment?: string | null;
          steps_to_reproduce?: string | null;
          expected_result?: string | null;
          actual_result?: string | null;
          assigned_to?: string | null;
          reporter_id?: string | null;
          test_case_id?: string | null;
          test_execution_id?: string | null;
        };
        Update: {
          summary?: string;
          description?: string | null;
          severity?: 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'new' | 'open' | 'in_progress' | 'fixed' | 'ready_for_retest' | 'reopened' | 'closed' | 'rejected';
          environment?: string | null;
          steps_to_reproduce?: string | null;
          expected_result?: string | null;
          actual_result?: string | null;
          assigned_to?: string | null;
        };
      };
    };
  };
}

export type UserRole = 'super_admin' | 'org_admin' | 'qa_manager' | 'qa_engineer' | 'developer' | 'viewer';
export type TestStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'not_applicable';
export type DefectStatus = 'new' | 'open' | 'in_progress' | 'fixed' | 'ready_for_retest' | 'reopened' | 'closed' | 'rejected';
export type RequirementStatus = 'draft' | 'under_review' | 'approved' | 'implemented' | 'verified' | 'rejected';
