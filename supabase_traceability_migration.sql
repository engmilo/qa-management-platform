-- Run this in the Supabase SQL Editor to enable secure, same-project traceability links.
ALTER TABLE public.test_case_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS test_case_requirements_isolation ON public.test_case_requirements;
CREATE POLICY test_case_requirements_isolation ON public.test_case_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.requirements r
      JOIN public.test_cases tc ON tc.project_id = r.project_id
      WHERE r.id = public.test_case_requirements.requirement_id
        AND tc.id = public.test_case_requirements.test_case_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requirements r
      JOIN public.test_cases tc ON tc.project_id = r.project_id
      WHERE r.id = public.test_case_requirements.requirement_id
        AND tc.id = public.test_case_requirements.test_case_id
    )
  );
