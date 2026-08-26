// Seed script: creates demo auth users via Supabase signUp.
// The on_auth_user_created trigger auto-creates their profile row with the chosen role.
// Prints a JSON map of email -> userId so the relational data can be seeded next.
// Run: node scripts/seed-users.cjs

// Load .env so the script works without a dotenv dependency.
const fs = require('fs');
const envPath = require('path').join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const PASSWORD = 'CareerConnect2026!';

const users = [
  // Admin
  { email: 'admin@careerconnect.ai', password: PASSWORD, full_name: 'Platform Admin', role: 'admin', phone: '+1-555-0001' },
  // Recruiters
  { email: 'sarah@techcorp.com', password: PASSWORD, full_name: 'Sarah Chen', role: 'recruiter', phone: '+1-555-0101' },
  { email: 'marcus@datavision.io', password: PASSWORD, full_name: 'Marcus Rodriguez', role: 'recruiter', phone: '+1-555-0102' },
  { email: 'priya@finovate.com', password: PASSWORD, full_name: 'Priya Sharma', role: 'recruiter', phone: '+1-555-0103' },
  // Candidates
  { email: 'alex.kim@student.edu', password: PASSWORD, full_name: 'Alex Kim', role: 'candidate', phone: '+1-555-0201' },
  { email: 'jordan.lee@student.edu', password: PASSWORD, full_name: 'Jordan Lee', role: 'candidate', phone: '+1-555-0202' },
  { email: 'taylor.morgan@student.edu', password: PASSWORD, full_name: 'Taylor Morgan', role: 'candidate', phone: '+1-555-0203' },
  { email: 'casey.park@student.edu', password: PASSWORD, full_name: 'Casey Park', role: 'candidate', phone: '+1-555-0204' },
  { email: 'morgan.reed@student.edu', password: PASSWORD, full_name: 'Morgan Reed', role: 'candidate', phone: '+1-555-0205' },
  { email: 'riley.cooper@student.edu', password: PASSWORD, full_name: 'Riley Cooper', role: 'candidate', phone: '+1-555-0206' },
  { email: 'jamie.singh@student.edu', password: PASSWORD, full_name: 'Jamie Singh', role: 'candidate', phone: '+1-555-0207' },
  { email: 'devon.brooks@student.edu', password: PASSWORD, full_name: 'Devon Brooks', role: 'candidate', phone: '+1-555-0208' },
  { email: 'quinn.foster@student.edu', password: PASSWORD, full_name: 'Quinn Foster', role: 'candidate', phone: '+1-555-0209' },
  { email: 'avery.nguyen@student.edu', password: PASSWORD, full_name: 'Avery Nguyen', role: 'candidate', phone: '+1-555-0210' },
];

async function main() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });

  const result = {};
  for (const u of users) {
    // Try to fetch existing user first by signing in
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: u.email,
      password: u.password,
    });
    if (!signInErr && signInData.user) {
      result[u.email] = signInData.user.id;
      await supabase.auth.signOut();
      console.error(`[exists] ${u.email}`);
      continue;
    }

    // Create new user
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: { data: { full_name: u.full_name, role: u.role, phone: u.phone } },
    });
    if (error) {
      console.error(`[FAILED] ${u.email}: ${error.message}`);
      continue;
    }
    if (data.user) {
      result[u.email] = data.user.id;
      console.error(`[created] ${u.email}`);
    }
    await supabase.auth.signOut();
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
