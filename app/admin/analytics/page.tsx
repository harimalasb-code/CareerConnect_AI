'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, Building2, BriefcaseBusiness, Send, TrendingUp, CheckCircle2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';

type TrendPoint = { date: string; users: number; jobs: number; applications: number };
type RoleDist = { name: string; value: number };
type TopCompany = { name: string; jobs: number };

const PIE_COLORS = ['#3b82f6', '#a855f7', '#f59e0b'];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ users: 0, candidates: 0, recruiters: 0, companies: 0, jobs: 0, activeJobs: 0, applications: 0, selected: 0 });
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [roleDist, setRoleDist] = useState<RoleDist[]>([]);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [users, candidates, recruiters, companies, jobs, activeJobs, applications, selected] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'candidate'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'recruiter'),
      supabase.from('companies').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('applications').select('id, applied_at', { count: 'exact' }),
      supabase.from('applications').select('id', { count: 'exact', head: true }).eq('status', 'selected'),
    ]);

    setStats({
      users: users.count ?? 0,
      candidates: candidates.count ?? 0,
      recruiters: recruiters.count ?? 0,
      companies: companies.count ?? 0,
      jobs: jobs.count ?? 0,
      activeJobs: activeJobs.count ?? 0,
      applications: applications.count ?? 0,
      selected: selected.count ?? 0,
    });

    const adminCount = (users.count ?? 0) - (candidates.count ?? 0) - (recruiters.count ?? 0);
    setRoleDist([
      { name: 'Candidates', value: candidates.count ?? 0 },
      { name: 'Recruiters', value: recruiters.count ?? 0 },
      { name: 'Admins', value: adminCount },
    ].filter((r) => r.value > 0));

    // Trend (last 14 days)
    const now = new Date();
    const trendMap: Record<string, { users: number; jobs: number; applications: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { users: 0, jobs: 0, applications: 0 };
    }

    const { data: userList } = await supabase.from('profiles').select('created_at');
    (userList ?? []).forEach((u) => {
      const key = (u as Record<string, unknown>).created_at as string;
      if (key) {
        const dayKey = key.slice(0, 10);
        if (dayKey in trendMap) trendMap[dayKey].users++;
      }
    });

    const { data: jobList } = await supabase.from('jobs').select('created_at');
    (jobList ?? []).forEach((j) => {
      const key = (j as Record<string, unknown>).created_at as string;
      if (key) {
        const dayKey = key.slice(0, 10);
        if (dayKey in trendMap) trendMap[dayKey].jobs++;
      }
    });

    (applications.data ?? []).forEach((a) => {
      const key = (a as Record<string, unknown>).applied_at as string;
      if (key) {
        const dayKey = key.slice(0, 10);
        if (dayKey in trendMap) trendMap[dayKey].applications++;
      }
    });

    setTrend(Object.entries(trendMap).map(([date, v]) => ({ date: date.slice(5), ...v })));

    // Top companies by jobs
    const { data: compJobs } = await supabase.from('jobs').select('company_id, companies ( name )');
    const compMap: Record<string, { name: string; jobs: number }> = {};
    (compJobs ?? []).forEach((j) => {
      const comp = (j as Record<string, unknown>).companies as { name: string } | null;
      const cid = (j as Record<string, unknown>).company_id as string;
      if (!compMap[cid]) compMap[cid] = { name: comp?.name ?? 'Unknown', jobs: 0 };
      compMap[cid].jobs++;
    });
    setTopCompanies(Object.values(compMap).sort((a, b) => b.jobs - a.jobs).slice(0, 8));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const statCards = [
    { label: 'Total users', value: stats.users, icon: Users },
    { label: 'Companies', value: stats.companies, icon: Building2 },
    { label: 'Jobs', value: stats.jobs, icon: BriefcaseBusiness },
    { label: 'Applications', value: stats.applications, icon: Send },
    { label: 'Hires', value: stats.selected, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Platform Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform-wide growth and engagement metrics</p>
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

      {/* Growth trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform growth (last 14 days)</CardTitle>
          <CardDescription>New users, jobs, and applications per day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="jobGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="appGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} fill="url(#userGrad)" name="New users" />
              <Area type="monotone" dataKey="jobs" stroke="#22c55e" strokeWidth={2} fill="url(#jobGrad)" name="New jobs" />
              <Area type="monotone" dataKey="applications" stroke="#a855f7" strokeWidth={2} fill="url(#appGrad)" name="Applications" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Role distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User role distribution</CardTitle>
            <CardDescription>Breakdown of users by role</CardDescription>
          </CardHeader>
          <CardContent>
            {roleDist.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roleDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.name}: ${e.value}`}>
                    {roleDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top companies */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top companies by job postings</CardTitle>
            <CardDescription>Most active companies on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topCompanies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="jobs" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Jobs posted" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="font-display text-xl font-bold">{stats.candidates}</p>
                <p className="text-xs text-muted-foreground">Candidates</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="font-display text-xl font-bold">{stats.activeJobs}</p>
                <p className="text-xs text-muted-foreground">Active job postings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="font-display text-xl font-bold">{stats.recruiters}</p>
                <p className="text-xs text-muted-foreground">Recruiters</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
