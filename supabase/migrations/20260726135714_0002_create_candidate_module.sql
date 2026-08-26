/*
# CareerConnect AI — Candidate Module Schema

1. Purpose
   Stores everything that describes a candidate: extended profile, education history, skills,
   experience, projects, certifications, and resumes (with versioning + primary flag).

2. New Tables
   - `candidate_profiles` — extended candidate data keyed to `profiles.id`.
     headline, bio, college, degree, department, graduation_year, location, github_url,
     linkedin_url, portfolio_url, profile_completion (0-100).
   - `skills` — master list of skills (name unique).
   - `candidate_skills` — join table linking candidate ↔ skill with proficiency level.
   - `education` — institution, degree, field, start/end dates.
   - `experiences` — work/internship history.
   - `projects` — portfolio projects with tech stack.
   - `certifications` — earned certifications.
   - `resumes` — uploaded resumes with version + is_primary flag.

3. Relationships
   - All candidate-owned tables FK to `candidate_profiles(id)` which FKs to `profiles(id)`.
   - `candidate_skills` FKs to `skills(id)` and `candidate_profiles(id)`.

4. Security (RLS)
   - `candidate_profiles`: owner can CRUD; recruiters & admins can SELECT.
   - `skills`: everyone (authenticated) can SELECT; only admins can INSERT/UPDATE/DELETE.
   - All other candidate-owned tables: owner can CRUD; recruiters & admins can SELECT.
   - Owner is resolved through: candidate_profiles.user_id = auth.uid().
*/

-- candidate_profiles
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  headline text,
  bio text,
  college text,
  degree text,
  department text,
  graduation_year int,
  location text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  profile_completion int NOT NULL DEFAULT 0 CHECK (profile_completion BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS candidate_profiles_user_idx ON candidate_profiles(user_id);

ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cp_select_owner_recruiter_admin" ON candidate_profiles;
CREATE POLICY "cp_select_owner_recruiter_admin"
  ON candidate_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')));

DROP POLICY IF EXISTS "cp_insert_own" ON candidate_profiles;
CREATE POLICY "cp_insert_own"
  ON candidate_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cp_update_own" ON candidate_profiles;
CREATE POLICY "cp_update_own"
  ON candidate_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cp_delete_own" ON candidate_profiles;
CREATE POLICY "cp_delete_own"
  ON candidate_profiles FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS cp_updated_at ON candidate_profiles;
CREATE TRIGGER cp_updated_at BEFORE UPDATE ON candidate_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- skills (master list)
CREATE TABLE IF NOT EXISTS skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skills_name_idx ON skills(name);

ALTER TABLE skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skills_select_all" ON skills;
CREATE POLICY "skills_select_all"
  ON skills FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "skills_insert_admin" ON skills;
CREATE POLICY "skills_insert_admin"
  ON skills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "skills_update_admin" ON skills;
CREATE POLICY "skills_update_admin"
  ON skills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "skills_delete_admin" ON skills;
CREATE POLICY "skills_delete_admin"
  ON skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- candidate_skills (join)
CREATE TABLE IF NOT EXISTS candidate_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level text NOT NULL DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner','intermediate','advanced','expert')),
  UNIQUE (candidate_id, skill_id)
);

CREATE INDEX IF NOT EXISTS cs_candidate_idx ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS cs_skill_idx ON candidate_skills(skill_id);

ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cs_select_owner_recruiter_admin" ON candidate_skills;
CREATE POLICY "cs_select_owner_recruiter_admin"
  ON candidate_skills FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_skills.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "cs_insert_own" ON candidate_skills;
CREATE POLICY "cs_insert_own"
  ON candidate_skills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_skills.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "cs_update_own" ON candidate_skills;
CREATE POLICY "cs_update_own"
  ON candidate_skills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_skills.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_skills.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "cs_delete_own" ON candidate_skills;
CREATE POLICY "cs_delete_own"
  ON candidate_skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = candidate_skills.candidate_id AND cp.user_id = auth.uid()));

-- education
CREATE TABLE IF NOT EXISTS education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  institution text NOT NULL,
  degree text NOT NULL,
  field text,
  start_date date,
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS edu_candidate_idx ON education(candidate_id);

ALTER TABLE education ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "edu_select_owner_recruiter_admin" ON education;
CREATE POLICY "edu_select_owner_recruiter_admin"
  ON education FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = education.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "edu_insert_own" ON education;
CREATE POLICY "edu_insert_own"
  ON education FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = education.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "edu_update_own" ON education;
CREATE POLICY "edu_update_own"
  ON education FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = education.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = education.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "edu_delete_own" ON education;
CREATE POLICY "edu_delete_own"
  ON education FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = education.candidate_id AND cp.user_id = auth.uid()));

-- experiences
CREATE TABLE IF NOT EXISTS experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  company text NOT NULL,
  role text NOT NULL,
  description text,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exp_candidate_idx ON experiences(candidate_id);

ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exp_select_owner_recruiter_admin" ON experiences;
CREATE POLICY "exp_select_owner_recruiter_admin"
  ON experiences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = experiences.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "exp_insert_own" ON experiences;
CREATE POLICY "exp_insert_own"
  ON experiences FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = experiences.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "exp_update_own" ON experiences;
CREATE POLICY "exp_update_own"
  ON experiences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = experiences.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = experiences.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "exp_delete_own" ON experiences;
CREATE POLICY "exp_delete_own"
  ON experiences FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = experiences.candidate_id AND cp.user_id = auth.uid()));

-- projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  technologies text,
  github_url text,
  live_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proj_candidate_idx ON projects(candidate_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proj_select_owner_recruiter_admin" ON projects;
CREATE POLICY "proj_select_owner_recruiter_admin"
  ON projects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = projects.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "proj_insert_own" ON projects;
CREATE POLICY "proj_insert_own"
  ON projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = projects.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "proj_update_own" ON projects;
CREATE POLICY "proj_update_own"
  ON projects FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = projects.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = projects.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "proj_delete_own" ON projects;
CREATE POLICY "proj_delete_own"
  ON projects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = projects.candidate_id AND cp.user_id = auth.uid()));

-- certifications
CREATE TABLE IF NOT EXISTS certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text,
  issue_date date,
  credential_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cert_candidate_idx ON certifications(candidate_id);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cert_select_owner_recruiter_admin" ON certifications;
CREATE POLICY "cert_select_owner_recruiter_admin"
  ON certifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = certifications.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "cert_insert_own" ON certifications;
CREATE POLICY "cert_insert_own"
  ON certifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = certifications.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "cert_update_own" ON certifications;
CREATE POLICY "cert_update_own"
  ON certifications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = certifications.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = certifications.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "cert_delete_own" ON certifications;
CREATE POLICY "cert_delete_own"
  ON certifications FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = certifications.candidate_id AND cp.user_id = auth.uid()));

-- resumes
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  version int NOT NULL DEFAULT 1,
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resume_candidate_idx ON resumes(candidate_id);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resume_select_owner_recruiter_admin" ON resumes;
CREATE POLICY "resume_select_owner_recruiter_admin"
  ON resumes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = resumes.candidate_id AND (cp.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('recruiter','admin')))));

DROP POLICY IF EXISTS "resume_insert_own" ON resumes;
CREATE POLICY "resume_insert_own"
  ON resumes FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = resumes.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "resume_update_own" ON resumes;
CREATE POLICY "resume_update_own"
  ON resumes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = resumes.candidate_id AND cp.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = resumes.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "resume_delete_own" ON resumes;
CREATE POLICY "resume_delete_own"
  ON resumes FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = resumes.candidate_id AND cp.user_id = auth.uid()));
