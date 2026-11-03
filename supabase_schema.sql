-- ============================================================================
-- QA MANAGEMENT PLATFORM - SUPABASE POSTGRESQL MULTI-TENANT SCHEMA & RLS
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations Table (Tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) DEFAULT 'enterprise',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Profiles Table (User Metadata extending auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Organization Members (Tenant Membership & RBAC Roles)
CREATE TYPE user_role AS ENUM (
    'super_admin',
    'org_admin',
    'qa_manager',
    'qa_engineer',
    'developer',
    'viewer'
);

CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'qa_engineer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Helper function to get current user's organization IDs
CREATE OR REPLACE FUNCTION get_user_organization_ids(user_uuid UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id FROM organization_members WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, key)
);

-- 6. Releases & Versions
CREATE TABLE releases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    version_name VARCHAR(100) NOT NULL,
    start_date DATE,
    release_date DATE,
    status VARCHAR(50) DEFAULT 'planning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Requirements Management
CREATE TYPE req_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE req_status AS ENUM ('draft', 'under_review', 'approved', 'implemented', 'verified', 'rejected');
CREATE TYPE req_type AS ENUM ('functional', 'non_functional', 'business', 'performance', 'security');

CREATE TABLE requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    req_key VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority req_priority DEFAULT 'medium',
    status req_status DEFAULT 'draft',
    type req_type DEFAULT 'functional',
    version INT DEFAULT 1,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, req_key)
);

-- 8. Test Cases Management
CREATE TYPE test_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE test_type AS ENUM ('functional', 'regression', 'integration', 'system', 'api', 'ui', 'performance', 'security', 'exploratory', 'uat');
CREATE TYPE automation_status AS ENUM ('manual', 'automated', 'to_automate', 'not_automatable');

CREATE TABLE test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    case_key VARCHAR(30) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    preconditions TEXT,
    priority test_priority DEFAULT 'medium',
    test_type test_type DEFAULT 'functional',
    category VARCHAR(100) DEFAULT 'General',
    automation_status automation_status DEFAULT 'manual',
    tags TEXT[],
    author_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, case_key)
);

CREATE TABLE test_case_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    action TEXT NOT NULL,
    expected_result TEXT NOT NULL
);

CREATE TABLE test_case_requirements (
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    PRIMARY KEY (test_case_id, requirement_id)
);

-- 9. Test Plans & Suites
CREATE TABLE test_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scope TEXT,
    release_id UUID REFERENCES releases(id),
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE test_suites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_plan_id UUID NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE test_suite_cases (
    test_suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    PRIMARY KEY (test_suite_id, test_case_id)
);

-- 10. Test Execution Engine
CREATE TABLE test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    test_plan_id UUID REFERENCES test_plans(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    status VARCHAR(50) DEFAULT 'in_progress',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TYPE execution_status AS ENUM ('not_run', 'passed', 'failed', 'blocked', 'not_applicable');

CREATE TABLE test_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_run_id UUID NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tester_id UUID REFERENCES profiles(id),
    status execution_status DEFAULT 'not_run',
    actual_result TEXT,
    comments TEXT,
    executed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE execution_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_execution_id UUID NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    status execution_status DEFAULT 'not_run',
    actual_result TEXT
);

-- 11. Defect Management
CREATE TYPE defect_severity AS ENUM ('trivial', 'minor', 'major', 'critical', 'blocker');
CREATE TYPE defect_status AS ENUM ('new', 'open', 'in_progress', 'fixed', 'ready_for_retest', 'reopened', 'closed', 'rejected');

CREATE TABLE defects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    defect_key VARCHAR(30) NOT NULL,
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    severity defect_severity DEFAULT 'major',
    priority test_priority DEFAULT 'medium',
    status defect_status DEFAULT 'new',
    environment VARCHAR(100),
    steps_to_reproduce TEXT,
    expected_result TEXT,
    actual_result TEXT,
    assigned_to UUID REFERENCES profiles(id),
    reporter_id UUID REFERENCES profiles(id),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,
    test_execution_id UUID REFERENCES test_executions(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, defect_key)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

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

-- Organizations Policy
CREATE POLICY org_isolation_policy ON organizations
    FOR ALL USING (id IN (SELECT get_user_organization_ids(auth.uid())));

-- Organization Members Policy
CREATE POLICY org_members_isolation ON organization_members
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Projects Policy
CREATE POLICY projects_isolation ON projects
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Requirements Policy
CREATE POLICY requirements_isolation ON requirements
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Cases Policy
CREATE POLICY test_cases_isolation ON test_cases
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Plans Policy
CREATE POLICY test_plans_isolation ON test_plans
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Runs Policy
CREATE POLICY test_runs_isolation ON test_runs
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Test Executions Policy
CREATE POLICY test_executions_isolation ON test_executions
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Defects Policy
CREATE POLICY defects_isolation ON defects
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));
