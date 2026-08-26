'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, BriefcaseBusiness, CheckCircle2, CalendarClock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

type AppTrend = { date: string; count: number };
type JobPerf = { title: string; applicants: number; shortlisted: number; selected: number };
type StatusDist = { name: string; value: number };

const PIE_COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#6366f1', '#22c55e', '#ef4444'];

export default function RecruiterAnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalApps: 0, selected: 0, interviews: 0 });
  const [appTrend, setAppTrend] = useState<AppTrend[]>([]);
  const [jobPerf, setJobPerf] = useState<JobPerf[]>([]);
  const [statusDist, setStatusDist] = useState<StatusDist[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true });
    if (!compList || compList.length === 0) { setLoading(false); return; }
    const compIds = compList.map((c) => c.id);

    const { data: jobList } = await supabase.from('jobs').select('id, title, status').in('company_id', compIds);
    const jobIds = (jobList ?? []).map((j) => j.id);

    if (jobIds.length === 0) { setLoading(false); return; }

    const { data: appList } = await supabase
      .from('applications')
      .select('id, status, applied_at, job_id')
      .in('job_id', jobIds)
      .order('applied_at', { ascending: true });

    const apps = appList ?? [];

    // Stats
    setStats({
      totalJobs: jobList?.length ?? 0,
      activeJobs: jobList?.filter((j) => j.status === 'active').length ?? 0,
      totalApps: apps.length,
      selected: apps.filter((a) => a.status === 'selected').length,
      interviews: 0,
    });

    // Get interview count
    const appIds = apps.map((a) => a.id);
    if (appIds.length > 0) {
      const { count } = await supabase.from('interviews').select('id', { count: 'exact', head: true }).in('application_id', appIds);
      setStats((s) => ({ ...s, interviews: count ?? 0 }));
    }

    // Application trend (last 14 days)
    const trendMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = 0;
    }
    apps.forEach((a) => {
      const key = (a.applied_at as string).slice(0, 10);
      if (key in trendMap) trendMap[key]++;
    });
    setAppTrend(Object.entries(trendMap).map(([date, count]) => ({ date: date.slice(5), count })));

    // Job performance
    const perf: JobPerf[] = (jobList ?? []).map((j) => {
      const jobApps = apps.filter((a) => a.job_id === j.id);
      return {
        title: j.title.length > 25 ? j.title.slice(0, 25) + '…' : j.title,
        applicants: jobApps.length,
        shortlisted: jobApps.filter((a) => ['shortlisted', 'interview', 'selected'].includes(a.status)).length,
        selected: jobApps.filter((a) => a.status === 'selected').length,
      };
    }).sort((a, b) => b.applicants - a.applicants).slice(0, 8);
    setJobPerf(perf);

    // Status distribution
    const statusMap: Record<string, number> = {};
    apps.forEach((a) => { statusMap[a.status] = (statusMap[a.status] ?? 0) + 1; });
    setStatusDist(Object.entries(statusMap).map(([name, value]) => ({ name: name.replace('_', ' '), value })));

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const statCards = [
    { label: 'Total jobs', value: stats.totalJobs, icon: BriefcaseBusiness },
    { label: 'Active jobs', value: stats.activeJobs, icon: TrendingUp },
    { label: 'Applications', value: stats.totalApps, icon: Users },
    { label: 'Interviews', value: stats.interviews, icon: CalendarClock },
    { label: 'Hires', value: stats.selected, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Track your hiring performance and application trends</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.totalApps === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No data yet</p>
            <p className="text-sm text-muted-foreground">Analytics will appear once you receive applications.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Application trend */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Application trend (last 14 days)</CardTitle>
              <CardDescription>How many applications you&apos;ve received per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={appTrend}>
                  <defs>
                    <linearGradient id="appGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#appGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Job performance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top jobs by applicants</CardTitle>
              <CardDescription>Application funnel per job posting</CardDescription>
            </CardHeader>
            <CardContent>
              {jobPerf.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={jobPerf} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="title" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="applicants" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Applicants" />
                    <Bar dataKey="shortlisted" fill="#a855f7" radius={[0, 4, 4, 0]} name="Shortlisted" />
                    <Bar dataKey="selected" fill="#22c55e" radius={[0, 4, 4, 0]} name="Selected" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application status breakdown</CardTitle>
              <CardDescription>Distribution of all applications by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                    {statusDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
