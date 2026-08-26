/*
# Create company_reviews table

1. New Tables
- `company_reviews`
  - `id` (uuid, primary key)
  - `company_id` (uuid, FK to companies.id, ON DELETE CASCADE)
  - `reviewer_id` (uuid, FK to profiles.id, ON DELETE CASCADE) — the user submitting the review
  - `rating` (integer, 1-5, NOT NULL) — star rating
  - `title` (text, nullable) — short summary of the review
  - `body` (text, nullable) — detailed review content
  - `status` (text, default 'pending') — pending / approved / rejected (admin moderates)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Purpose
- Allows any authenticated user (candidates, recruiters) to submit a review for a company.
- Reviews are stored in the database and appear in Admin > Reports > Company Reviews.
- Admin can approve or reject reviews; approved reviews become public on the company detail page.

3. Security — RLS enabled
- SELECT: anyone authenticated can read (so admin and the reviewer can see them)
- INSERT: any authenticated user can submit a review for a company (reviewer_id must match auth.uid())
- UPDATE: admin only (to approve/reject reviews)
- DELETE: admin only, or the reviewer can delete their own review

4. Notes
- One review per user per company is enforced via a unique constraint.
- This is separate from the existing `reports` table (which handles content flags) — this table is for company reviews/ratings.
*/

CREATE TABLE IF NOT EXISTS company_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  body text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, reviewer_id)
);

ALTER TABLE company_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "review_select_all" ON company_reviews;
CREATE POLICY "review_select_all"
  ON company_reviews FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "review_insert_own" ON company_reviews;
CREATE POLICY "review_insert_own"
  ON company_reviews FOR INSERT
  TO authenticated WITH CHECK (reviewer_id = auth.uid());

DROP POLICY IF EXISTS "review_update_admin" ON company_reviews;
CREATE POLICY "review_update_admin"
  ON company_reviews FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "review_delete_own_or_admin" ON company_reviews;
CREATE POLICY "review_delete_own_or_admin"
  ON company_reviews FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_company_reviews_company_id ON company_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_company_reviews_status ON company_reviews(status);
