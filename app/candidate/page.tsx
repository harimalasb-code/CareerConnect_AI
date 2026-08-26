'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Send,
  Bookmark,
  CalendarClock,
  FileText,
  Sparkles,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';


type Stat = { label: string; value: number; icon: React.ElementType; href: string };

export default function CandidateDashboard() {
  const { profile } = useAuth();
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [stats, setStats] = useState({ applications: 0, saved: 0, interviews: 0, profileCompletion: 0 });
  const [recentApps, setRecentApps] = useState<
    { id: string; status: string; applied_at: string; jobs: { title: string; companies: { name: string } | null } | null }[]
  >([]);
  const [upcoming, setUpcoming] = useState<
    { id: string; scheduled_at: string; interview_type: string; applications: { jobs: { title: string; companies: { name: string } | null } | null } | null }[]
  >([]);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('id, profile_completion')
        .eq('user_id', profile.id)
        .maybeSingle();
      if (!cp) return;
      setCandidateId(cp.id);

      const [apps, saved, interviews] = await Promise.all([
        supabase
          .from('applications')
          .select(`id, status, applied_at, jobs ( title, companies ( name ) )`)
          .eq('candidate_id', cp.id)
          .order('applied_at', { ascending: false })
          .limit(5),
        supabase.from('saved_jobs').select('id', { count: 'exact', head: true }).eq('candidate_id', cp.id),
        supabase
          .from('interviews')
          .select(`id, scheduled_at, interview_type, applications!inner ( jobs ( title, companies ( name ) ) )`)
          .eq('applications.candidate_id', cp.id)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(3),
      ]);

      setStats({
        applications: apps.data?.length ?? 0,
        saved: saved.count ?? 0,
        interviews: interviews.data?.length ?? 0,
        profileCompletion: cp.profile_completion ?? 0,
      });
      setRecentApps(
        (apps.data ?? []).map((a) => ({
          id: a.id,
          status: a.status,
          applied_at: a.applied_at,
          jobs: a.jobs as unknown as { title: string; companies: { name: string } | null } | null,
        })),
      );
      setUpcoming(
        (interviews.data ?? []).map((i) => ({
          id: i.id,
          scheduled_at: i.scheduled_at,
          interview_type: i.interview_type,
          applications: i.applications as unknown as {
            jobs: { title: string; companies: { name: string } | null } | null;
          } | null,
        })),
      );
    })();
  }, [profile]);

  const statCards: Stat[] = [
    { label: 'Applications', value: stats.applications, icon: Send, href: '/candidate/applications' },
    { label: 'Saved jobs', value: stats.saved, icon: Bookmark, href: '/candidate/saved' },
    { label: 'Interviews', value: stats.interviews, icon: CalendarClock, href: '/candidate/interviews' },
  ];

  const statusColor: Record<string, string> = {
    applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    under_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    shortlisted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    interview: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    selected: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    withdrawn: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">
          Welcome back, {profile?.full_name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s your job search at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
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
        {/* Profile completion */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Profile completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Complete your profile to boost visibility</span>
                <span className="font-semibold">{stats.profileCompletion}%</span>
              </div>
              <Progress value={stats.profileCompletion} className="h-2" />
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/candidate/profile">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete profile
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent applications</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidate/applications">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentApps.length === 0 ? (
              <EmptyState
                icon={Send}
                title="No applications yet"
                desc="Browse jobs and apply to get started."
                href="/jobs"
                cta="Browse jobs"
              />
            ) : (
              <div className="space-y-3">
                {recentApps.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium">{a.jobs?.title ?? 'Job'}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.jobs?.companies?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {new Date(a.applied_at).toLocaleDateString()}
                      </span>
                      <Badge className={statusColor[a.status] ?? 'bg-secondary'} variant="secondary">
                        {a.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming interviews */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming interviews</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/candidate/interviews">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No interviews scheduled"
                desc="Your scheduled interviews will appear here."
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{i.applications?.jobs?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.applications?.jobs?.companies?.name}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-medium">
                        {new Date(i.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(i.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI assistant CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-accent" /> AI Career Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Analyze your resume, find your job match score, generate cover letters, and prep for
              interviews — all powered by AI.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1">
                <FileText className="h-3 w-3" /> Resume Analyzer
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <TrendingUp className="h-3 w-3" /> Match Score
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> Cover Letters
              </Badge>
            </div>
            <Button asChild className="w-full">
              <Link href="/candidate/ai">
                Open AI Assistant <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{desc}</p>
      {href && cta && (
        <Button asChild size="sm" className="mt-2">
          <Link href={href}>{cta}</Link>
        </Button>
      )}
    </div>
  );
}
