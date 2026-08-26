'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, BriefcaseBusiness, Users, Pencil, Eye, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';

type JobRow = {
  id: string;
  title: string;
  status: string;
  job_type: string;
  work_mode: string;
  location: string | null;
  created_at: string;
  applicant_count: number;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Draft' },
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Active' },
  paused: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Paused' },
  closed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Closed' },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected' },
};

export default function RecruiterJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true });
    if (!compList || compList.length === 0) { setLoading(false); return; }
    const compIds = compList.map((c) => c.id);

    const { data: jobList } = await supabase
      .from('jobs')
      .select('id, title, status, job_type, work_mode, location, created_at')
      .in('company_id', compIds)
      .order('created_at', { ascending: false });

    // Get applicant counts per job
    const jobIds = (jobList ?? []).map((j) => j.id);
    let countsMap: Record<string, number> = {};
    if (jobIds.length > 0) {
      const { data: appCounts } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds);
      countsMap = (appCounts ?? []).reduce((acc, a) => {
        const jid = (a as Record<string, unknown>).job_id as string;
        acc[jid] = (acc[jid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    setJobs(
      (jobList ?? []).map((j) => ({
        ...j,
        applicant_count: countsMap[j.id] ?? 0,
      })) as JobRow[],
    );
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (job: JobRow) => {
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', job.id);
    if (error) { toast.error(error.message); return; }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: newStatus } : j)));
    toast.success(newStatus === 'active' ? 'Job published' : 'Job paused');
  };

  const filtered = jobs.filter((j) => {
    const matchesFilter = filter === 'all' || j.status === filter;
    const matchesSearch = !search || j.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts: Record<string, number> = { all: jobs.length };
  jobs.forEach((j) => { counts[j.status] = (counts[j.status] ?? 0) + 1; });

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Manage Jobs</h1>
          <p className="mt-1 text-muted-foreground">Create, edit, and track your job postings</p>
        </div>
        <Button asChild>
          <Link href="/recruiter/jobs/new"><Plus className="mr-2 h-4 w-4" /> Post a job</Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BriefcaseBusiness className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No jobs posted yet</p>
            <p className="text-sm text-muted-foreground">Create your first job posting to start receiving applications.</p>
            <Button asChild className="mt-2">
              <Link href="/recruiter/jobs/new"><Plus className="mr-2 h-4 w-4" /> Post your first job</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="active">Active ({counts.active ?? 0})</TabsTrigger>
                <TabsTrigger value="draft">Drafts ({counts.draft ?? 0})</TabsTrigger>
                <TabsTrigger value="paused">Paused ({counts.paused ?? 0})</TabsTrigger>
                <TabsTrigger value="closed">Closed ({counts.closed ?? 0})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search jobs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((j) => {
              const cfg = statusConfig[j.status] ?? { color: 'bg-secondary', label: j.status };
              return (
                <Card key={j.id} className="transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <Link href={`/recruiter/jobs/${j.id}`} className="font-medium hover:text-primary">{j.title}</Link>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{j.job_type.replace('_', '-')}</span>
                        <span className="capitalize">{j.work_mode}</span>
                        <span>{j.location}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j.applicant_count} applicant{j.applicant_count === 1 ? '' : 's'}</span>
                        <span>Posted {new Date(j.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                      {(j.status === 'active' || j.status === 'paused') && (
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(j)}>
                          {j.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <Link href={`/recruiter/jobs/${j.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <Link href={`/recruiter/jobs/${j.id}?edit=true`}><Pencil className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
