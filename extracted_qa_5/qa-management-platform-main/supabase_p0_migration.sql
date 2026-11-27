-- P0 MIGRATION — QA Management Platform
-- Run in Supabase SQL Editor. Run the ALTER TYPE line alone first if you get "cannot run inside transaction block".
-- ALTER TYPE execution_status ADD VALUE IF NOT EXISTS 'retest';

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['organizations','profiles','projects','releases','requirements','test_cases','test_case_steps','test_plans','test_suites','test_runs','test_executions','defects']) LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at_trigger ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at_trigger BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
UPDATE test_suites s SET project_id = p.project_id FROM test_plans p WHERE s.test_plan_id = p.id AND s.project_id IS NULL;
ALTER TABLE test_suites ALTER COLUMN test_plan_id DROP NOT NULL;

ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE test_runs ADD COLUMN IF NOT EXISTS configuration TEXT;
ALTER TABLE test_cases ADD COLUMN IF NOT EXISTS estimate_minutes INT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_test_executions_run_status ON test_executions(test_run_id, status);
CREATE INDEX IF NOT EXISTS idx_test_executions_case ON test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_project ON test_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_defects_project_status ON defects(project_id, status);
CREATE INDEX IF NOT EXISTS idx_test_suites_project ON test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_test_suite_cases_suite ON test_suite_cases(test_suite_id);
CREATE INDEX IF NOT EXISTS idx_test_suite_cases_case ON test_suite_cases(test_case_id);

ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suite_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS releases_isolation ON releases;
CREATE POLICY releases_isolation ON releases FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));
DROP POLICY IF EXISTS test_suite_cases_isolation ON test_suite_cases;
CREATE POLICY test_suite_cases_isolation ON test_suite_cases FOR ALL USING (
  EXISTS (SELECT 1 FROM test_suites s WHERE s.id = test_suite_cases.test_suite_id AND s.organization_id IN (SELECT get_user_organization_ids(auth.uid())))
);

