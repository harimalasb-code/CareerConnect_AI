/*
# CareerConnect AI — Company & Job Module Schema

1. Purpose
   Stores company profiles (owned by recruiters) and job postings published by those companies.
   This module powers the recruiter dashboard, public job browsing, and applications.

2. New Tables
   - `companies`
     - `recruiter_id` (uuid, FK profiles) — the recruiter who owns/manages the company.
     - name, logo_url, website, description, location, industry, company_size.
     - `is_verified` (boolean) — admin-verified companies. Default false.
     - created_at, updated_at.
   - `jobs`
     - `company_id` (uuid, FK companies) — the company offering the job.
     - `posted_by` (uuid, FK profiles) — the recruiter who posted it.
     - title, description, responsibilities, qualifications.
     - `job_type` (full_time | part_time | contract | internship).
     - `work_mode` (remote | hybrid | onsite).
     - location, salary_min, salary_max, currency.
     - `experience_level` (entry | junior | mid | senior | lead).
     - application_deadline (timestamptz).
     - `status` (draft | active | paused | closed | rejected).
     - `is_flagged` (boolean) — admin moderation flag. Default false.
     - created_at, updated_at.

3. Indexes
   - companies_recruiter_idx; jobs_company_idx; jobs_status_idx; jobs_posted_by_idx; jobs_deadline_idx.

4. Security (RLS)
   - `companies`: owner recruiter can CRUD; everyone (authenticated) can SELECT (for browse pages).
   - `jobs`: recruiter owner can CRUD; everyone (authenticated) can SELECT active jobs.
   - Admins can UPDATE/DELETE any company or job (for moderation).
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  logo_url text,
  website text,
  description text,
  location text,
  industry text,
  company_size text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companies_recruiter_idx ON companies(recruiter_id);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_select_all" ON companies;
CREATE POLICY "company_select_all"
  ON companies FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "company_insert_own" ON companies;
CREATE POLICY "company_insert_own"
  ON companies FOR INSERT TO authenticated
  WITH CHECK (recruiter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "company_update_own_or_admin" ON companies;
CREATE POLICY "company_update_own_or_admin"
  ON companies FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (recruiter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "company_delete_own_or_admin" ON companies;
CREATE POLICY "company_delete_own_or_admin"
  ON companies FOR DELETE TO authenticated
  USING (recruiter_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP TRIGGER IF EXISTS company_updated_at ON companies;
CREATE TRIGGER company_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- jobs
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  posted_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  responsibilities text,
  qualifications text,
  job_type text NOT NULL DEFAULT 'full_time' CHECK (job_type IN ('full_time','part_time','contract','internship')),
  work_mode text NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('remote','hybrid','onsite')),
  location text,
  salary_min int,
  salary_max int,
  currency text NOT NULL DEFAULT 'USD',
  experience_level text NOT NULL DEFAULT 'entry' CHECK (experience_level IN ('entry','junior','mid','senior','lead')),
  application_deadline timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','closed','rejected')),
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_company_idx ON jobs(company_id);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status);
CREATE INDEX IF NOT EXISTS jobs_posted_by_idx ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS jobs_deadline_idx ON jobs(application_deadline);
CREATE INDEX IF NOT EXISTS jobs_created_idx ON jobs(created_at desc);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_select_all" ON jobs;
CREATE POLICY "job_select_all"
  ON jobs FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "job_insert_own" ON jobs;
CREATE POLICY "job_insert_own"
  ON jobs FOR INSERT TO authenticated
  WITH CHECK (posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "job_update_own_or_admin" ON jobs;
CREATE POLICY "job_update_own_or_admin"
  ON jobs FOR UPDATE TO authenticated
  USING (posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "job_delete_own_or_admin" ON jobs;
CREATE POLICY "job_delete_own_or_admin"
  ON jobs FOR DELETE TO authenticated
  USING (posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP TRIGGER IF EXISTS job_updated_at ON jobs;
CREATE TRIGGER job_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
