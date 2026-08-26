/*
# CareerConnect AI — Applications, Interviews, Notifications, AI, Reports

1. Purpose
   Completes the core data model: job-skill link table, applications, saved jobs, interviews,
   notifications, messages, AI analysis records, and admin reports.

2. New Tables
   - `job_skills` — join jobs <-> skills (required/preferred flag).
   - `saved_jobs` — candidate bookmarks.
   - `applications` — a candidate applies to a job with a resume + cover letter. Status lifecycle:
     applied | under_review | shortlisted | interview | selected | rejected | withdrawn.
   - `interviews` — scheduled against an application with date/link/type/status.
   - `notifications` — per-user in-app notifications (title, message, type, is_read).
   - `messages` — sender <-> receiver direct messages.
   - `ai_analyses` — persisted results of AI features (match_score, ats_score, analysis JSON).
   - `reports` — admin moderation reports (reporter, target_type, target_id, reason, status).

3. Security (RLS)
   - `job_skills`: SELECT all authenticated; INSERT/UPDATE/DELETE by job owner or admin.
   - `saved_jobs`: owner CRUD only.
   - `applications`: candidate owner can INSERT/SELECT/UPDATE-status/withdraw; recruiter of the job
     and admin can SELECT and UPDATE status. Resolved via EXISTS checks against jobs/companies/profiles.
   - `interviews`: resolved through applications — both candidate and recruiter can SELECT/UPDATE.
   - `notifications`: owner only CRUD.
   - `messages`: sender or receiver only.
   - `ai_analyses`: owner candidate, recruiter of related job, or admin can SELECT; owner can INSERT.
   - `reports`: SELECT admin only; INSERT any authenticated; UPDATE/DELETE admin only.
*/

-- job_skills
CREATE TABLE IF NOT EXISTS job_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  UNIQUE (job_id, skill_id)
);

CREATE INDEX IF NOT EXISTS js_job_idx ON job_skills(job_id);
CREATE INDEX IF NOT EXISTS js_skill_idx ON job_skills(skill_id);

ALTER TABLE job_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "js_select_all" ON job_skills;
CREATE POLICY "js_select_all"
  ON job_skills FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "js_insert_owner_or_admin" ON job_skills;
CREATE POLICY "js_insert_owner_or_admin"
  ON job_skills FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_skills.job_id AND (j.posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

DROP POLICY IF EXISTS "js_update_owner_or_admin" ON job_skills;
CREATE POLICY "js_update_owner_or_admin"
  ON job_skills FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_skills.job_id AND (j.posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_skills.job_id AND (j.posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

DROP POLICY IF EXISTS "js_delete_owner_or_admin" ON job_skills;
CREATE POLICY "js_delete_owner_or_admin"
  ON job_skills FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM jobs j WHERE j.id = job_skills.job_id AND (j.posted_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))));

-- saved_jobs
CREATE TABLE IF NOT EXISTS saved_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS saved_candidate_idx ON saved_jobs(candidate_id);

ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_select_own" ON saved_jobs;
CREATE POLICY "saved_select_own"
  ON saved_jobs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = saved_jobs.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "saved_insert_own" ON saved_jobs;
CREATE POLICY "saved_insert_own"
  ON saved_jobs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = saved_jobs.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "saved_delete_own" ON saved_jobs;
CREATE POLICY "saved_delete_own"
  ON saved_jobs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = saved_jobs.candidate_id AND cp.user_id = auth.uid()));

-- applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter text,
  recruiter_notes text,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','under_review','shortlisted','interview','selected','rejected','withdrawn')),
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS app_job_idx ON applications(job_id);
CREATE INDEX IF NOT EXISTS app_candidate_idx ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS app_status_idx ON applications(status);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_select_parties" ON applications;
CREATE POLICY "app_select_parties"
  ON applications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = applications.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = applications.job_id AND c.recruiter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "app_insert_own" ON applications;
CREATE POLICY "app_insert_own"
  ON applications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = applications.candidate_id AND cp.user_id = auth.uid()));

DROP POLICY IF EXISTS "app_update_parties" ON applications;
CREATE POLICY "app_update_parties"
  ON applications FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = applications.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = applications.job_id AND c.recruiter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = applications.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = applications.job_id AND c.recruiter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "app_delete_own_or_admin" ON applications;
CREATE POLICY "app_delete_own_or_admin"
  ON applications FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = applications.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS app_updated_at ON applications;
CREATE TRIGGER app_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- interviews
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  meeting_link text,
  interview_type text NOT NULL DEFAULT 'video' CHECK (interview_type IN ('video','phone','onsite')),
  notes text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','rescheduled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS interview_app_idx ON interviews(application_id);
CREATE INDEX IF NOT EXISTS interview_schedule_idx ON interviews(scheduled_at);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interview_select_parties" ON interviews;
CREATE POLICY "interview_select_parties"
  ON interviews FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.id = interviews.application_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN companies c ON c.id = j.company_id
      WHERE a.id = interviews.application_id AND c.recruiter_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "interview_insert_recruiter_or_admin" ON interviews;
CREATE POLICY "interview_insert_recruiter_or_admin"
  ON interviews FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN companies c ON c.id = j.company_id
      WHERE a.id = interviews.application_id AND c.recruiter_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "interview_update_parties" ON interviews;
CREATE POLICY "interview_update_parties"
  ON interviews FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.id = interviews.application_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN companies c ON c.id = j.company_id
      WHERE a.id = interviews.application_id AND c.recruiter_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN candidate_profiles cp ON cp.id = a.candidate_id
      WHERE a.id = interviews.application_id AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN companies c ON c.id = j.company_id
      WHERE a.id = interviews.application_id AND c.recruiter_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "interview_delete_recruiter_or_admin" ON interviews;
CREATE POLICY "interview_delete_recruiter_or_admin"
  ON interviews FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM applications a
      JOIN jobs j ON j.id = a.job_id
      JOIN companies c ON c.id = j.company_id
      WHERE a.id = interviews.application_id AND c.recruiter_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP TRIGGER IF EXISTS interview_updated_at ON interviews;
CREATE TRIGGER interview_updated_at BEFORE UPDATE ON interviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','application','interview','status','system','report')),
  is_read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_unread_idx ON notifications(user_id, is_read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select_own" ON notifications;
CREATE POLICY "notif_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert_own_or_system" ON notifications;
CREATE POLICY "notif_insert_own_or_system"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','recruiter')));

DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_delete_own" ON notifications;
CREATE POLICY "notif_delete_own"
  ON notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS msg_sender_idx ON messages(sender_id);
CREATE INDEX IF NOT EXISTS msg_receiver_idx ON messages(receiver_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "msg_select_parties" ON messages;
CREATE POLICY "msg_select_parties"
  ON messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "msg_insert_sender" ON messages;
CREATE POLICY "msg_insert_sender"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS "msg_update_receiver" ON messages;
CREATE POLICY "msg_update_receiver"
  ON messages FOR UPDATE TO authenticated
  USING (receiver_id = auth.uid()) WITH CHECK (receiver_id = auth.uid());

DROP POLICY IF EXISTS "msg_delete_parties" ON messages;
CREATE POLICY "msg_delete_parties"
  ON messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

-- ai_analyses
CREATE TABLE IF NOT EXISTS ai_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  analysis_type text NOT NULL CHECK (analysis_type IN ('resume','job_match','cover_letter','skill_gap','screening','summary','job_description','interview_questions')),
  match_score int,
  ats_score int,
  analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_candidate_idx ON ai_analyses(candidate_id);
CREATE INDEX IF NOT EXISTS ai_job_idx ON ai_analyses(job_id);
CREATE INDEX IF NOT EXISTS ai_type_idx ON ai_analyses(analysis_type);

ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_select_parties" ON ai_analyses;
CREATE POLICY "ai_select_parties"
  ON ai_analyses FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = ai_analyses.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ai_analyses.job_id AND c.recruiter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "ai_insert_parties" ON ai_analyses;
CREATE POLICY "ai_insert_parties"
  ON ai_analyses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = ai_analyses.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.id = ai_analyses.job_id AND c.recruiter_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "ai_delete_owner" ON ai_analyses;
CREATE POLICY "ai_delete_owner"
  ON ai_analyses FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM candidate_profiles cp WHERE cp.id = ai_analyses.candidate_id AND cp.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('job','company','user','application')),
  target_id uuid NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','resolved','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_status_idx ON reports(status);
CREATE INDEX IF NOT EXISTS report_target_idx ON reports(target_type, target_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_select_admin" ON reports;
CREATE POLICY "report_select_admin"
  ON reports FOR SELECT TO authenticated
  USING (reported_by = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "report_insert_any" ON reports;
CREATE POLICY "report_insert_any"
  ON reports FOR INSERT TO authenticated
  WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "report_update_admin" ON reports;
CREATE POLICY "report_update_admin"
  ON reports FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "report_delete_admin" ON reports;
CREATE POLICY "report_delete_admin"
  ON reports FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP TRIGGER IF EXISTS report_updated_at ON reports;
CREATE TRIGGER report_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
