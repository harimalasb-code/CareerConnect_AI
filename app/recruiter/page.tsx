'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BriefcaseBusiness,
  Users,
  CalendarClock,
  CheckCircle2,
  Plus,
  ArrowRight,
  Building2,
  Sparkles,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const { profile } = useAuth();
  const [company, setCompany] = useState<{ id: string; name: string; is_verified: boolean } | null>(null);
  const [stats, setStats] = useState({ jobs: 0, activeJobs: 0, applications: 0, interviews: 0, selected: 0 });
  const [recentJobs, setRecentJobs] = useState<
    { id: string; title: string; status: string; created_at: string; _count?: number }[]
  >([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: compList } = await supabase
        .from('companies')
        .select('id, name, is_verified')
        .eq('recruiter_id', profile.id)
        .order('created_at', { ascending: true });
      const comp = (compList && compList.length > 0 ? compList[0] : null) as { id: string; name: string; is_verified: boolean } | null;
      setCompany(comp);
      if (!compList || compList.length === 0) return;

      const compIds = compList.map((c) => c.id);

      const { data: jobList } = await supabase
        .from('jobs')
        .select('id')
        .in('company_id', compIds);
      const jobIds = (jobList ?? []).map((j) => j.id);

      if (jobIds.length === 0) {
        setStats({ jobs: 0, activeJobs: 0, applications: 0, interviews: 0, selected: 0 });
        return;
      }

      const { data: appList } = await supabase
        .from('applications')
        .select('id')
        .in('job_id', jobIds);
      const appIds = (appList ?? []).map((a) => a.id);

      const [jobs, activeJobs, applications, selected] = await Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).in('company_id', compIds),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).in('company_id', compIds).eq('status', 'active'),
        supabase.from('applications').select('id', { count: 'exact', head: true }).in('job_id', jobIds),
        supabase.from('applications').select('id', { count: 'exact', head: true }).in('job_id', jobIds).eq('status', 'selected'),
      ]);

      let interviewCount = 0;
      if (appIds.length > 0) {
        const { count: intCount } = await supabase
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .in('application_id', appIds)
          .gte('scheduled_at', new Date().toISOString())
          .eq('status', 'scheduled');
        interviewCount = intCount ?? 0;
      }

      setStats({
        jobs: jobs.count ?? 0,
        activeJobs: activeJobs.count ?? 0,
        applications: applications.count ?? 0,
        interviews: interviewCount,
        selected: selected.count ?? 0,
      });

      const { data: recentJobList } = await supabase
        .from('jobs')
        .select('id, title, status, created_at')
        .in('company_id', compIds)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentJobs(recentJobList ?? []);
    })();
  }, [profile]);

  const statCards = [
    { label: 'Jobs posted', value: stats.jobs, icon: BriefcaseBusiness, href: '/recruiter/jobs' },
    { label: 'Active jobs', value: stats.activeJobs, icon: CheckCircle2, href: '/recruiter/jobs' },
    { label: 'Applications', value: stats.applications, icon: Users, href: '/recruiter/applicants' },
    { label: 'Upcoming interviews', value: stats.interviews, icon: CalendarClock, href: '/recruiter/interviews' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            {company ? company.name : 'Recruiter Dashboard'}
          </h1>
          <p className="mt-1 text-muted-foreground">Manage your jobs, applicants, and hiring pipeline.</p>
        </div>
        <Button asChild>
          <Link href="/recruiter/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> Post a job
          </Link>
        </Button>
      </div>

      {!company && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">Set up your company profile</p>
                <p className="text-sm text-muted-foreground">Add your company details to start posting jobs.</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/recruiter/company">Set up</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {company && !company.is_verified && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="h-5 w-5 text-warning" />
            <p className="text-sm">
              Your company is pending verification. An admin will review it shortly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent jobs */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent job postings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recruiter/jobs">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BriefcaseBusiness className="h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium">No jobs posted yet</p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/recruiter/jobs/new">Post your first job</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <Link href={`/recruiter/jobs/${j.id}`} className="font-medium hover:text-primary">
                        {j.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {new Date(j.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="capitalize">{j.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI tools CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-accent" /> AI Recruiting Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Generate job descriptions, screen resumes with AI, rank candidates, and create
              interview question sets.
            </p>
            <Button asChild className="w-full">
              <Link href="/recruiter/ai">
                Open AI Tools <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
