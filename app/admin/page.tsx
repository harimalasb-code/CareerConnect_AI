'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  BriefcaseBusiness,
  Send,
  Flag,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    candidates: 0,
    recruiters: 0,
    companies: 0,
    pendingCompanies: 0,
    jobs: 0,
    activeJobs: 0,
    applications: 0,
    reports: 0,
  });
  const [recentUsers, setRecentUsers] = useState<
    { id: string; full_name: string; email: string; role: string; is_active: boolean; created_at: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      const [candidates, recruiters, companies, pendingCompanies, jobs, activeJobs, applications, reports] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'candidate'),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'recruiter'),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_verified', false),
          supabase.from('jobs').select('id', { count: 'exact', head: true }),
          supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('applications').select('id', { count: 'exact', head: true }),
          supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        ]);

      setStats({
        candidates: candidates.count ?? 0,
        recruiters: recruiters.count ?? 0,
        companies: companies.count ?? 0,
        pendingCompanies: pendingCompanies.count ?? 0,
        jobs: jobs.count ?? 0,
        activeJobs: activeJobs.count ?? 0,
        applications: applications.count ?? 0,
        reports: reports.count ?? 0,
      });

      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, created_at')
        .order('created_at', { ascending: false })
        .limit(6);
      setRecentUsers(users ?? []);
    })();
  }, []);

  const statCards = [
    { label: 'Candidates', value: stats.candidates, icon: Users, href: '/admin/users' },
    { label: 'Recruiters', value: stats.recruiters, icon: Users, href: '/admin/users' },
    { label: 'Companies', value: stats.companies, icon: Building2, href: '/admin/companies' },
    { label: 'Jobs', value: stats.jobs, icon: BriefcaseBusiness, href: '/admin/jobs' },
    { label: 'Applications', value: stats.applications, icon: Send, href: '/admin/analytics' },
    { label: 'Pending reports', value: stats.reports, icon: Flag, href: '/admin/reports' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and moderation controls.</p>
      </div>

      {/* Alerts */}
      {stats.pendingCompanies > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-warning" />
              <div>
                <p className="font-medium">{stats.pendingCompanies} compan{stats.pendingCompanies === 1 ? 'y' : 'ies'} pending verification</p>
                <p className="text-sm text-muted-foreground">Review and verify company profiles.</p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link href="/admin/companies">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {stats.reports > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Flag className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium">{stats.reports} report{stats.reports === 1 ? '' : 's'} need attention</p>
                <p className="text-sm text-muted-foreground">Review reported content.</p>
              </div>
            </div>
            <Button asChild size="sm" variant="destructive">
              <Link href="/admin/reports">Review</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {/* Recent users */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent users</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users">
                View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {u.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    {!u.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Analytics CTA */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-accent" /> Platform Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              User growth, job trends, application stats, popular skills, and top companies.
            </p>
            <Button asChild className="w-full">
              <Link href="/admin/analytics">
                View analytics <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
