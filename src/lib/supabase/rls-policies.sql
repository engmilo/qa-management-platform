-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Multi-Tenant Organization Isolation
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suite_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id FROM organization_members WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is org admin
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE user_id = user_uuid 
    AND organization_id = org_id 
    AND role IN ('super_admin', 'org_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations Policy
CREATE POLICY org_isolation_policy ON organizations
  FOR ALL USING (id IN (SELECT get_user_organization_ids(auth.uid())));

-- Organization Members Policy
CREATE POLICY org_members_isolation ON organization_members
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Projects Policy
CREATE POLICY projects_isolation ON projects
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Projects Policy - Admin Only for Delete
CREATE POLICY projects_admin_delete ON projects
  FOR DELETE USING (
    organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    AND is_org_admin(auth.uid(), organization_id)
  );

-- Requirements Policy
CREATE POLICY requirements_isolation ON requirements
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Cases Policy
CREATE POLICY test_cases_isolation ON test_cases
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Case Steps Policy - Cascade from test_cases
CREATE POLICY test_case_steps_isolation ON test_case_steps
  FOR ALL USING (
    test_case_id IN (
      SELECT id FROM test_cases 
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- Test Case Requirements Policy - Cascade from test_cases
CREATE POLICY test_case_requirements_isolation ON test_case_requirements
  FOR ALL USING (
    test_case_id IN (
      SELECT id FROM test_cases 
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- Test Plans Policy
CREATE POLICY test_plans_isolation ON test_plans
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Suites Policy - Cascade from test_plans
CREATE POLICY test_suites_isolation ON test_suites
  FOR ALL USING (
    test_plan_id IN (
      SELECT id FROM test_plans 
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- Test Runs Policy
CREATE POLICY test_runs_isolation ON test_runs
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Executions Policy
CREATE POLICY test_executions_isolation ON test_executions
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Execution Steps Policy - Cascade from test_executions
CREATE POLICY execution_steps_isolation ON execution_steps
  FOR ALL USING (
    test_execution_id IN (
      SELECT id FROM test_executions 
      WHERE organization_id IN (SELECT get_user_organization_ids(auth.uid()))
    )
  );

-- Defects Policy
CREATE POLICY defects_isolation ON defects
  FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));
