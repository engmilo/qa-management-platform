# QA Management Platform - Production Deployment Guide

This guide outlines the steps to deploy the QA Management Platform to production on Vercel and Supabase.

## Architecture Overview
- **Frontend & Server Actions**: Next.js 14 App Router deployed on Vercel.
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS).
- **Styling**: Tailwind CSS with custom dark navy/neutral design system.

---

## Prerequisites
1. [Supabase Account](https://supabase.com)
2. [Vercel Account](https://vercel.com)
3. [GitHub Repository](https://github.com)

---

## Step 1: Database Setup on Supabase

1. Create a new project in Supabase.
2. Navigate to the **SQL Editor** in Supabase Studio.
3. Copy and execute the complete schema migration script from `supabase_schema.sql` (found in the root outputs directory).
4. For an existing database, or after applying the main schema, execute `supabase_onboarding_migration.sql` in the SQL Editor. It backfills Auth users into `profiles`, syncs future profile/email changes, and adds per-user profile policies.
5. Verify that RLS policies are active on all tables.

---

## Step 2: Environment Variables Configuration

Set up the following environment variables in Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SECRET_KEY=your-supabase-secret-key
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

---

## Step 3: Deploy to Vercel

1. Push your repository to GitHub.
2. Import the repository into Vercel.
3. Configure project settings:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (or your subfolder)
   - Build Command: `npm run build`
4. Add the environment variables from Step 2.
5. Click **Deploy**.

---

## Step 4: Verification & Smoke Testing

Once deployed, verify the following core user journeys:
1. **Authentication**: Register a new user account, log in, and verify password recovery flow.
2. **Account management**: Open the account menu to update a profile or sign out. Email changes may require confirmation.
3. **Organization Multi-Tenancy**: Create a new organization; the creating user is added as its admin. Then invite team members with specific roles (`org_admin`, `qa_manager`, `qa_engineer`, `developer`, `viewer`).
4. **Project & Requirements**: Create a new project and add requirements with priorities and statuses.
5. **Test Cases & Execution**: Create test cases with step-by-step actions, build test plans, and execute test runs.
6. **Defect Tracking**: Report defects, assign to developers, and link them to test executions.
7. **Traceability & Reports**: Review the requirements traceability matrix and export summary reports.
8. **AI Assistant**: Test the AI test case generator with human approval workflow.

---

## Security Best Practices
- Keep `SUPABASE_SECRET_KEY` server-only; never expose it to the frontend or commit it to source control.
- Regularly audit PostgreSQL RLS policies in Supabase.
- Enforce strict role-based access control (RBAC) across all server actions.
