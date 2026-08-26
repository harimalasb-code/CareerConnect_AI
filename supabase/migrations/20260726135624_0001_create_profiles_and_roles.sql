/*
# CareerConnect AI — Core: Profiles, Roles, and Auth Foundation

1. Purpose
   Establishes the user identity table (`profiles`) that mirrors Supabase Auth users and carries the
   application role (`candidate` | `recruiter` | `admin`). This is the backbone of role-based access
   control for the entire portal.

2. New Tables
   - `profiles`
     - `id` (uuid, primary key) — references `auth.users.id`; one row per auth user.
     - `email` (text, unique, not null) — denormalized from auth for fast lookups.
     - `full_name` (text, not null) — display name.
     - `role` (text, not null) — one of `candidate`, `recruiter`, `admin`. Default `candidate`.
     - `phone` (text, nullable) — contact phone.
     - `avatar_url` (text, nullable) — profile photo URL.
     - `is_active` (boolean, not null) — admin can deactivate users without deleting. Default true.
     - `created_at`, `updated_at` (timestamptz).

3. Indexes
   - `profiles_role_idx` on `role` (admin dashboards filter by role).
   - `profiles_email_idx` on `email`.

4. Security (RLS)
   - Enable RLS on `profiles`.
   - SELECT: any authenticated user can read profiles (recruiters view candidates, admins view all).
   - INSERT: a user can insert their own profile row on signup.
   - UPDATE: a user can update their own profile; admins can update any profile.
   - DELETE: admins only.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'candidate' CHECK (role IN ('candidate', 'recruiter', 'admin')),
  phone text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all_authenticated" ON profiles;
CREATE POLICY "profiles_select_all_authenticated"
  ON profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON profiles;
CREATE POLICY "profiles_update_own_or_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "profiles_delete_admin_only" ON profiles;
CREATE POLICY "profiles_delete_admin_only"
  ON profiles FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
