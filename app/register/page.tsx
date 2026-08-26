'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PublicNav } from '@/components/public-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Loader2, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'candidate' | 'recruiter';

export default function RegisterPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [role, setRole] = useState<Role>('candidate');
  const [loading, setLoading] = useState(false);

  // shared
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // candidate
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [department, setDepartment] = useState('');
  const [gradYear, setGradYear] = useState('');
  const [skills, setSkills] = useState('');

  // recruiter
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyLocation, setCompanyLocation] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setLoading(true);

    const meta: Record<string, string> = {
      full_name: fullName,
      role,
      phone,
    };
    if (role === 'candidate') {
      meta.college = college;
      meta.degree = degree;
      meta.department = department;
      meta.graduation_year = gradYear;
      meta.skills = skills;
    } else {
      meta.company_name = companyName;
      meta.company_website = companyWebsite;
      meta.company_description = companyDescription;
      meta.company_location = companyLocation;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: meta },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (!data.user) {
      toast.error('Sign up failed. Please try again.');
      setLoading(false);
      return;
    }

    // If candidate, also create their candidate_profile row (the trigger only makes profiles row).
    if (role === 'candidate') {
      const { error: cpError } = await supabase.from('candidate_profiles').insert({
        user_id: data.user.id,
        college,
        degree,
        department,
        graduation_year: gradYear ? parseInt(gradYear, 10) : null,
        location: companyLocation || undefined,
      });
      if (cpError) {
        console.error('candidate profile creation', cpError);
      }

      // Insert skills (split comma list, link to skills master table)
      if (skills.trim()) {
        const skillNames = skills.split(',').map((s) => s.trim()).filter(Boolean);
        for (const name of skillNames) {
          // upsert skill
          const { data: skillRow } = await supabase
            .from('skills')
            .upsert({ name }, { onConflict: 'name' })
            .select('id')
            .maybeSingle();
          if (skillRow) {
            const cpId = (await supabase
              .from('candidate_profiles')
              .select('id')
              .eq('user_id', data.user.id)
              .maybeSingle()) as { data: { id: string } | null };
            if (cpId.data?.id) {
              await supabase.from('candidate_skills').upsert(
                { candidate_id: cpId.data.id, skill_id: skillRow.id },
                { onConflict: 'candidate_id,skill_id' },
              );
            }
          }
        }
      }
    }

    // If recruiter, create the company row.
    if (role === 'recruiter' && companyName) {
      const { error: cError } = await supabase.from('companies').insert({
        recruiter_id: data.user.id,
        name: companyName,
        website: companyWebsite || null,
        description: companyDescription || null,
        location: companyLocation || null,
      });
      if (cError) {
        console.error('company creation', cError);
      }
    }

    await refreshProfile();
    toast.success('Account created! Welcome to CareerConnect AI.');
    router.push('/dashboard-redirect');
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/40 to-background">
      <PublicNav />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-2xl border-border/60 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Briefcase className="h-6 w-6" />
            </div>
            <CardTitle className="font-display text-2xl">Create your account</CardTitle>
            <CardDescription>Join CareerConnect AI as a candidate or recruiter</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="candidate">
                  <User className="mr-2 h-4 w-4" /> Candidate
                </TabsTrigger>
                <TabsTrigger value="recruiter">
                  <Building2 className="mr-2 h-4 w-4" /> Recruiter
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
                {/* Shared fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      required
                      placeholder="Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+1 555 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">{role === 'recruiter' ? 'Work email' : 'Email'}</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {/* Candidate-only */}
                <TabsContent value="candidate" className="mt-2 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="college">College</Label>
                      <Input
                        id="college"
                        placeholder="Stanford University"
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="degree">Degree</Label>
                      <Input
                        id="degree"
                        placeholder="B.S."
                        value={degree}
                        onChange={(e) => setDegree(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        placeholder="Computer Science"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gradYear">Graduation year</Label>
                      <Select value={gradYear} onValueChange={setGradYear}>
                        <SelectTrigger id="gradYear">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {['2024', '2025', '2026', '2027', '2028'].map((y) => (
                            <SelectItem key={y} value={y}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Skills (comma-separated)</Label>
                    <Input
                      id="skills"
                      placeholder="React, TypeScript, Node.js"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                    />
                  </div>
                </TabsContent>

                {/* Recruiter-only */}
                <TabsContent value="recruiter" className="mt-2 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company name</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Company website</Label>
                      <Input
                        id="companyWebsite"
                        placeholder="https://acme.com"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyLocation">Company location</Label>
                    <Input
                      id="companyLocation"
                      placeholder="San Francisco, CA"
                      value={companyLocation}
                      onChange={(e) => setCompanyLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyDescription">Company description</Label>
                    <Input
                      id="companyDescription"
                      placeholder="We build developer productivity tools."
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
              </form>
            </Tabs>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
