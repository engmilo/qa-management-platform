-- ============================================================================
-- QA MANAGEMENT PLATFORM - ADDITIONAL TESTING MODULES
-- Performance Testing, API Testing, Visual Testing
-- ============================================================================

-- Performance Testing Module
CREATE TYPE performance_test_type AS ENUM ('load', 'stress', 'spike', 'soak', 'smoke');
CREATE TYPE performance_test_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

CREATE TABLE performance_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type performance_test_type DEFAULT 'load',
    status performance_test_status DEFAULT 'pending',
    configuration JSONB DEFAULT '{}',
    -- k6/Grafana configuration
    script TEXT,
    virtual_users INTEGER DEFAULT 100,
    duration_seconds INTEGER DEFAULT 300,
    ramp_up_seconds INTEGER DEFAULT 60,
    thresholds JSONB DEFAULT '{}',
    -- Results
    metrics JSONB DEFAULT '{}',
    summary JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE performance_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_test_id UUID NOT NULL REFERENCES performance_tests(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Time series metrics
    vus INTEGER,
    rps DECIMAL(10,2),
    latency_p50 DECIMAL(10,2),
    latency_p90 DECIMAL(10,2),
    latency_p95 DECIMAL(10,2),
    latency_p99 DECIMAL(10,2),
    error_rate DECIMAL(5,4),
    checks_passed INTEGER DEFAULT 0,
    checks_failed INTEGER DEFAULT 0,
    data_received BIGINT DEFAULT 0,
    data_sent BIGINT DEFAULT 0
);

-- API Testing Module
CREATE TYPE api_test_status AS ENUM ('pending', 'running', 'passed', 'failed', 'skipped');
CREATE TYPE api_test_type AS ENUM ('contract', 'functional', 'performance', 'security');

CREATE TABLE api_test_collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Postman/OpenAPI spec
    spec_type VARCHAR(50), -- 'postman', 'openapi', 'swagger'
    spec_content JSONB DEFAULT '{}',
    base_url VARCHAR(500),
    headers JSONB DEFAULT '{}',
    auth_config JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES api_test_collections(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    headers JSONB DEFAULT '{}',
    query_params JSONB DEFAULT '{}',
    body JSONB,
    assertions JSONB DEFAULT '[]',
    test_type api_test_type DEFAULT 'functional',
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id UUID NOT NULL REFERENCES api_test_collections(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    status api_test_status DEFAULT 'pending',
    environment VARCHAR(100),
    variables JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    summary JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE api_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES api_test_runs(id) ON DELETE CASCADE,
    test_case_id UUID NOT NULL REFERENCES api_test_cases(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status api_test_status DEFAULT 'pending',
    request JSONB DEFAULT '{}',
    response JSONB DEFAULT '{}',
    response_time_ms INTEGER,
    status_code INTEGER,
    assertions_passed INTEGER DEFAULT 0,
    assertions_failed INTEGER DEFAULT 0,
    assertion_details JSONB DEFAULT '[]',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Visual Testing Module
CREATE TYPE visual_test_status AS ENUM ('pending', 'running', 'completed', 'changes_detected', 'approved', 'failed');
CREATE TYPE visual_baseline_status AS ENUM ('active', 'archived');

CREATE TABLE visual_test_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    -- Browser configuration
    browsers JSONB DEFAULT '["chromium"]',
    viewports JSONB DEFAULT '[{"width": 1280, "height": 720}]',
    threshold DECIMAL(5,4) DEFAULT 0.01, -- 1% pixel diff threshold
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visual_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visual_project_id UUID NOT NULL REFERENCES visual_test_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    selector VARCHAR(500), -- CSS selector for element-specific testing
    browser VARCHAR(50) NOT NULL,
    viewport_width INTEGER NOT NULL,
    viewport_height INTEGER NOT NULL,
    -- Screenshot data (stored as base64 or reference to object storage)
    screenshot_url TEXT,
    screenshot_hash VARCHAR(64), -- SHA256 for quick comparison
    status visual_baseline_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visual_test_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visual_project_id UUID NOT NULL REFERENCES visual_test_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255),
    status visual_test_status DEFAULT 'pending',
    branch VARCHAR(100), -- git branch for comparison
    commit_sha VARCHAR(64),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    summary JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visual_test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES visual_test_runs(id) ON DELETE CASCADE,
    baseline_id UUID NOT NULL REFERENCES visual_baselines(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status visual_test_status DEFAULT 'pending',
    -- Comparison results
    diff_percentage DECIMAL(5,4),
    diff_pixels INTEGER,
    total_pixels INTEGER,
    -- Screenshots
    actual_screenshot_url TEXT,
    diff_screenshot_url TEXT,
    -- Metadata
    browser VARCHAR(50),
    viewport_width INTEGER,
    viewport_height INTEGER,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_performance_tests_project ON performance_tests(project_id);
CREATE INDEX idx_performance_tests_org ON performance_tests(organization_id);
CREATE INDEX idx_performance_test_results_test ON performance_test_results(performance_test_id);
CREATE INDEX idx_performance_test_results_timestamp ON performance_test_results(timestamp);

CREATE INDEX idx_api_test_collections_project ON api_test_collections(project_id);
CREATE INDEX idx_api_test_cases_collection ON api_test_cases(collection_id);
CREATE INDEX idx_api_test_runs_collection ON api_test_runs(collection_id);
CREATE INDEX idx_api_test_results_run ON api_test_results(run_id);

CREATE INDEX idx_visual_test_projects_project ON visual_test_projects(project_id);
CREATE INDEX idx_visual_baselines_project ON visual_baselines(visual_project_id);
CREATE INDEX idx_visual_test_runs_project ON visual_test_runs(visual_project_id);
CREATE INDEX idx_visual_test_results_run ON visual_test_results(run_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE performance_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_test_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visual_test_results ENABLE ROW LEVEL SECURITY;

-- Performance Tests
CREATE POLICY performance_tests_isolation ON performance_tests
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY performance_test_results_isolation ON performance_test_results
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- API Tests
CREATE POLICY api_test_collections_isolation ON api_test_collections
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY api_test_cases_isolation ON api_test_cases
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY api_test_runs_isolation ON api_test_runs
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY api_test_results_isolation ON api_test_results
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- Visual Tests
CREATE POLICY visual_test_projects_isolation ON visual_test_projects
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY visual_baselines_isolation ON visual_baselines
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY visual_test_runs_isolation ON visual_test_runs
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

CREATE POLICY visual_test_results_isolation ON visual_test_results
    FOR ALL USING (organization_id IN (SELECT get_user_organization_ids(auth.uid())));

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_performance_tests_updated_at BEFORE UPDATE ON performance_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_test_collections_updated_at BEFORE UPDATE ON api_test_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_test_cases_updated_at BEFORE UPDATE ON api_test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_test_projects_updated_at BEFORE UPDATE ON visual_test_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visual_baselines_updated_at BEFORE UPDATE ON visual_baselines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();