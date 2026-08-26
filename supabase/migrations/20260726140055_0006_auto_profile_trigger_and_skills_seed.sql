/*
# CareerConnect AI — Auto-create profile on signup + seed skills master list

1. Purpose
   - Adds a trigger so that every new Supabase auth user automatically gets a `profiles` row with
     role = candidate (default), using the metadata the user passes at signUp time. This keeps
     `profiles` in sync with `auth.users` for both seeded and production signups.
   - Seeds the `skills` master list with common technical and soft skills.

2. Security
   - The trigger function runs with SECURITY DEFINER so it can insert into `profiles` on behalf of
     the newly created auth user. It reads role/full_name from `raw_user_meta_data`.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
  v_full_name text;
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'candidate');
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  INSERT INTO public.profiles (id, email, full_name, role, phone)
  VALUES (new.id, new.email, v_full_name, v_role, new.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed skills master list
INSERT INTO skills (name) VALUES
  ('JavaScript'), ('TypeScript'), ('React'), ('Node.js'), ('Python'), ('Java'),
  ('C++'), ('Go'), ('Rust'), ('SQL'), ('PostgreSQL'), ('MongoDB'),
  ('AWS'), ('Docker'), ('Kubernetes'), ('GraphQL'), ('REST APIs'), ('Git'),
  ('HTML'), ('CSS'), ('Tailwind CSS'), ('Next.js'), ('Express'), ('Django'),
  ('Flask'), ('FastAPI'), ('Machine Learning'), ('Data Science'), ('TensorFlow'),
  ('PyTorch'), ('Pandas'), ('NumPy'), ('Communication'), ('Leadership'),
  ('Teamwork'), ('Problem Solving'), ('Time Management'), ('Project Management'),
  ('Agile'), ('Figma'), ('UI/UX Design'), ('Product Management'), ('DevOps'),
  ('CI/CD'), ('Linux'), ('Redis'), ('Elasticsearch'), ('Kafka'), ('Microservices')
ON CONFLICT (name) DO NOTHING;
