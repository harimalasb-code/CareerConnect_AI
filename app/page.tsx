'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Briefcase,
  Search,
  Sparkles,
  Building2,
  MapPin,
  ArrowRight,
  FileText,
  Target,
  MessageSquare,
  Brain,
  TrendingUp,
  Users,
  CheckCircle2,
  Star,
} from 'lucide-react';

type FeaturedJob = {
  id: string;
  title: string;
  location: string | null;
  job_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  companies: { name: string; logo_url: string | null } | null;
};

type FeaturedCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
  industry: string | null;
  job_count: number;
};

export default function LandingPage() {
  const [jobs, setJobs] = useState<FeaturedJob[]>([]);
  const [companies, setCompanies] = useState<FeaturedCompany[]>([]);
  const [stats, setStats] = useState({ jobs: 0, companies: 0, candidates: 0 });
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data: jobData } = await supabase
        .from('jobs')
        .select(`id, title, location, job_type, work_mode, salary_min, salary_max, companies ( name, logo_url )`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(6);
      setJobs(jobData as unknown as FeaturedJob[] ?? []);

      const { data: companyData } = await supabase
        .from('companies')
        .select('id, name, logo_url, location, industry')
        .eq('is_verified', true)
        .limit(5);
      const companiesWithCounts: FeaturedCompany[] = [];
      for (const c of companyData ?? []) {
        const { count } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', c.id)
          .eq('status', 'active');
        companiesWithCounts.push({ ...c, job_count: count ?? 0 });
      }
      setCompanies(companiesWithCounts);

      const [{ count: jobCount }, { count: companyCount }, { count: candidateCount }] =
        await Promise.all([
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('candidate_profiles').select('id', { count: 'exact', head: true }),
        ]);
      setStats({ jobs: jobCount ?? 0, companies: companyCount ?? 0, candidates: candidateCount ?? 0 });
    })();
  }, []);

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Competitive';
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max ?? 0)}`;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-32 top-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> AI-powered hiring platform
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-balance md:text-6xl">
              Find your next role with <span className="text-primary">AI</span> on your side
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl text-balance">
              CareerConnect AI matches candidates with the right jobs, scores resumes for ATS
              compatibility, and helps recruiters hire faster — all in one place.
            </p>

            {/* Search */}
            <div className="mx-auto mt-8 flex max-w-2xl items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="w-full bg-transparent py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Search job titles, companies, or skills"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter')
                      window.location.href = `/jobs?q=${encodeURIComponent(query)}`;
                  }}
                />
              </div>
              <Button asChild>
                <Link href={`/jobs?q=${encodeURIComponent(query)}`}>
                  Search <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4">
              {[
                { label: 'Open jobs', value: stats.jobs, icon: Briefcase },
                { label: 'Companies', value: stats.companies, icon: Building2 },
                { label: 'Candidates', value: stats.candidates, icon: Users },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center gap-1">
                  <s.icon className="h-5 w-5 text-primary" />
                  <span className="font-display text-2xl font-bold md:text-3xl">{s.value}</span>
                  <span className="text-xs text-muted-foreground md:text-sm">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured jobs */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured jobs</h2>
            <p className="mt-1 text-muted-foreground">Hand-picked roles from top companies</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/jobs">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="group h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={job.companies?.logo_url ?? undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {job.companies?.name?.[0] ?? 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {job.companies?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{job.location}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {job.job_type.replace('_', '-')}
                    </Badge>
                  </div>
                  <h3 className="mt-4 font-semibold group-hover:text-primary">{job.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.work_mode}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* AI features */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Brain className="h-3.5 w-3.5 text-accent" /> AI Career Assistant
            </Badge>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              AI that works for both sides
            </h2>
            <p className="mt-3 text-muted-foreground">
              Candidates get smarter applications. Recruiters get faster screening.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FileText, title: 'Resume Analyzer', desc: 'ATS scoring and section-wise feedback on your resume.' },
              { icon: Target, title: 'Job Match Score', desc: 'See how well your skills align with any job listing.' },
              { icon: MessageSquare, title: 'Cover Letter AI', desc: 'Generate tailored cover letters in seconds.' },
              { icon: Sparkles, title: 'Interview Prep', desc: 'Practice with AI-generated role-specific questions.' },
            ].map((f) => (
              <Card key={f.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured companies */}
      <section className="container mx-auto px-4 py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Featured companies</h2>
            <p className="mt-1 text-muted-foreground">Verified employers hiring now</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/companies">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="group h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Avatar className="h-14 w-14 rounded-xl">
                    <AvatarImage src={c.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                      {c.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="mt-3 font-semibold group-hover:text-primary">{c.name}</h3>
                  <p className="text-xs text-muted-foreground">{c.industry}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.location}
                    </span>
                  </div>
                  <Badge variant="secondary" className="mt-3">
                    {c.job_count} open {c.job_count === 1 ? 'role' : 'roles'}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: 'Create your profile', desc: 'Sign up as a candidate or recruiter and build out your profile in minutes.' },
              { step: '02', title: 'Get AI insights', desc: 'Upload your resume for ATS scoring, or post a job with AI-generated descriptions.' },
              { step: '03', title: 'Connect & hire', desc: 'Apply with one click, track applications, schedule interviews, and hire.' },
            ].map((s) => (
              <div key={s.step} className="relative">
                <span className="font-display text-5xl font-bold text-primary/20">{s.step}</span>
                <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-center font-display text-3xl font-bold md:text-4xl">Loved by job seekers</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { name: 'Alex K.', role: 'Software Engineer', quote: 'The AI resume analyzer caught gaps I never noticed. Got 3 interviews in a week.' },
            { name: 'Sarah C.', role: 'Tech Recruiter', quote: 'Candidate ranking saved me hours of screening. The match scores are surprisingly accurate.' },
            { name: 'Taylor M.', role: 'Data Scientist', quote: 'The job match feature pointed me to roles I actually fit. Landed my dream ML job.' },
          ].map((t) => (
            <Card key={t.name} className="border-border/60">
              <CardContent className="p-6">
                <div className="flex gap-1 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-4 flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary">{t.name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl text-balance">
            Ready to find your next opportunity?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Join thousands of candidates and recruiters using AI to hire and get hired faster.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Create free account
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
