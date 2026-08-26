'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BriefcaseBusiness, Search, Flag, ExternalLink, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

type JobRow = {
  id: string;
  title: string;
  status: string;
  job_type: string;
  is_flagged: boolean;
  created_at: string;
  company_name: string | null;
  company_logo: string | null;
  applicant_count: number;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Draft' },
  active: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Active' },
  paused: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Paused' },
  closed: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Closed' },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected' },
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: jobList } = await supabase
      .from('jobs')
      .select(`id, title, status, job_type, is_flagged, created_at, companies ( name, logo_url )`)
      .order('created_at', { ascending: false });

    const jobIds = (jobList ?? []).map((j) => j.id);
    let appCounts: Record<string, number> = {};
    if (jobIds.length > 0) {
      const { data: apps } = await supabase.from('applications').select('job_id').in('job_id', jobIds);
      appCounts = (apps ?? []).reduce((acc, a) => {
        const jid = (a as Record<string, unknown>).job_id as string;
        acc[jid] = (acc[jid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    setJobs(
      (jobList ?? []).map((j) => {
        const comp = (j as Record<string, unknown>).companies as { name: string; logo_url: string | null } | null;
        return {
          id: j.id,
          title: j.title,
          status: j.status,
          job_type: j.job_type,
          is_flagged: j.is_flagged,
          created_at: j.created_at,
          company_name: comp?.name ?? null,
          company_logo: comp?.logo_url ?? null,
          applicant_count: appCounts[j.id] ?? 0,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (jobId: string, newStatus: string) => {
    const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', jobId);
    if (error) { toast.error(error.message); return; }
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: newStatus } : j)));
    toast.success('Status updated');
  };

  const toggleFlag = async (job: JobRow) => {
    const { error } = await supabase.from('jobs').update({ is_flagged: !job.is_flagged }).eq('id', job.id);
    if (error) { toast.error(error.message); return; }
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, is_flagged: !job.is_flagged } : j)));
    toast.success(job.is_flagged ? 'Flag removed' : 'Job flagged');
  };

  const filtered = jobs.filter((j) => {
    const matchesFilter = filter === 'all' || (filter === 'flagged' && j.is_flagged) || j.status === filter;
    const matchesSearch = !search || j.title.toLowerCase().includes(search.toLowerCase()) || j.company_name?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts: Record<string, number> = { all: jobs.length };
  jobs.forEach((j) => {
    counts[j.status] = (counts[j.status] ?? 0) + 1;
    if (j.is_flagged) counts.flagged = (counts.flagged ?? 0) + 1;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Job Moderation</h1>
        <p className="mt-1 text-muted-foreground">Review, flag, and manage all job postings</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="active">Active ({counts.active ?? 0})</TabsTrigger>
            <TabsTrigger value="flagged">Flagged ({counts.flagged ?? 0})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({counts.closed ?? 0})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected ({counts.rejected ?? 0})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs or companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BriefcaseBusiness className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No jobs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((j) => {
            const cfg = statusConfig[j.status] ?? { color: 'bg-secondary', label: j.status };
            return (
              <Card key={j.id} className={j.is_flagged ? 'border-destructive/40' : ''}>
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={j.company_logo ?? undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{j.company_name?.[0] ?? 'C'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Link href={`/jobs/${j.id}`} className="font-medium hover:text-primary">{j.title}</Link>
                    <p className="text-sm text-muted-foreground">{j.company_name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{j.job_type.replace('_', '-')}</span>
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j.applicant_count} applicant{j.applicant_count === 1 ? '' : 's'}</span>
                      <span>Posted {new Date(j.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                    {j.is_flagged && <Badge variant="destructive" className="gap-1"><Flag className="h-3 w-3" /> Flagged</Badge>}
                    <Select onValueChange={(v) => updateStatus(j.id, v)} defaultValue={j.status}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className={`h-8 w-8 ${j.is_flagged ? 'text-destructive' : ''}`} onClick={() => toggleFlag(j)}>
                      <Flag className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <Link href={`/jobs/${j.id}`}><ExternalLink className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
