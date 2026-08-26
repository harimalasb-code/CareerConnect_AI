'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Loader2, Search, MapPin, Star, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type Applicant = {
  id: string;
  status: string;
  applied_at: string;
  recruiter_notes: string | null;
  candidate_id: string;
  candidates: {
    user_id: string;
    headline: string | null;
    location: string | null;
    profile_completion: number;
    profiles: { full_name: string; avatar_url: string | null } | null;
  } | null;
  jobs: {
    id: string;
    title: string;
    companies: { name: string } | null;
  } | null;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  applied: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Applied' },
  under_review: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Under Review' },
  shortlisted: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Shortlisted' },
  interview: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', label: 'Interview' },
  selected: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Selected' },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected' },
  withdrawn: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Withdrawn' },
};

const nextStatuses: Record<string, string[]> = {
  applied: ['under_review', 'shortlisted', 'rejected'],
  under_review: ['shortlisted', 'interview', 'rejected'],
  shortlisted: ['interview', 'selected', 'rejected'],
  interview: ['selected', 'rejected'],
  selected: [],
  rejected: [],
  withdrawn: [],
};

export default function ApplicantsPage() {
  const { profile } = useAuth();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [jobOptions, setJobOptions] = useState<{ id: string; title: string }[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true });
    if (!compList || compList.length === 0) { setLoading(false); return; }
    const compIds = compList.map((c) => c.id);

    const { data: jobList } = await supabase.from('jobs').select('id, title').in('company_id', compIds).order('created_at', { ascending: false });
    setJobOptions(jobList ?? []);

    const jobIds = (jobList ?? []).map((j) => j.id);
    if (jobIds.length === 0) { setLoading(false); return; }

    const { data: appList } = await supabase
      .from('applications')
      .select(`id, status, applied_at, recruiter_notes, candidate_id, candidates ( user_id, headline, location, profile_completion, profiles ( full_name, avatar_url ) ), jobs ( id, title, companies ( name ) )`)
      .in('job_id', jobIds)
      .order('applied_at', { ascending: false });
    setApplicants(appList as unknown as Applicant[] ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (appId: string, newStatus: string, candidateUserId?: string, jobTitle?: string) => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (error) { toast.error(error.message); return; }
    if (candidateUserId) {
      const cfg = statusConfig[newStatus];
      await supabase.from('notifications').insert({
        user_id: candidateUserId,
        title: 'Application status updated',
        message: `Your application for "${jobTitle}" is now ${cfg?.label ?? newStatus}.`,
        type: 'status',
        related_id: appId,
      });
    }
    setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a)));
    toast.success('Status updated');
  };

  const filtered = applicants.filter((a) => {
    const matchesStatus = filter === 'all' || a.status === filter;
    const matchesJob = jobFilter === 'all' || a.jobs?.id === jobFilter;
    const name = a.candidates?.profiles?.full_name ?? '';
    const matchesSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || a.jobs?.title?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesJob && matchesSearch;
  });

  const counts: Record<string, number> = { all: applicants.length };
  applicants.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Applicants</h1>
        <p className="mt-1 text-muted-foreground">All candidates who applied to your job postings</p>
      </div>

      {applicants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No applicants yet</p>
            <p className="text-sm text-muted-foreground">Once candidates apply to your jobs, they&apos;ll appear here.</p>
            <Button asChild className="mt-2">
              <Link href="/recruiter/jobs">View your jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="applied">Applied ({counts.applied ?? 0})</TabsTrigger>
                <TabsTrigger value="under_review">Review ({counts.under_review ?? 0})</TabsTrigger>
                <TabsTrigger value="shortlisted">Shortlisted ({counts.shortlisted ?? 0})</TabsTrigger>
                <TabsTrigger value="interview">Interview ({counts.interview ?? 0})</TabsTrigger>
                <TabsTrigger value="selected">Selected ({counts.selected ?? 0})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2">
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All jobs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {jobOptions.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((a) => {
              const cfg = statusConfig[a.status] ?? { color: 'bg-secondary', label: a.status };
              const next = nextStatuses[a.status] ?? [];
              return (
                <Card key={a.id} className="transition-all hover:border-primary/30">
                  <CardContent className="flex items-start gap-4 p-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={a.candidates?.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{a.candidates?.profiles?.full_name?.[0] ?? 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{a.candidates?.profiles?.full_name ?? 'Candidate'}</p>
                        <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                        {a.candidates?.profile_completion && a.candidates.profile_completion >= 80 && (
                          <Badge variant="outline" className="gap-1 text-success"><Star className="h-3 w-3" /> Top profile</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{a.candidates?.headline}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.candidates?.location}</span>
                        <span>Applied {new Date(a.applied_at).toLocaleDateString()}</span>
                        <span>Profile {a.candidates?.profile_completion ?? 0}%</span>
                        {a.recruiter_notes && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Has notes</span>}
                      </div>
                      <p className="mt-1 text-xs">
                        Applied to: <Link href={`/recruiter/jobs/${a.jobs?.id}`} className="font-medium text-primary hover:underline">{a.jobs?.title}</Link> · {a.jobs?.companies?.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {next.length > 0 && (
                        <Select onValueChange={(v) => updateStatus(a.id, v, a.candidates?.user_id, a.jobs?.title)}>
                          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Update status" /></SelectTrigger>
                          <SelectContent>
                            {next.map((s) => <SelectItem key={s} value={s}>{statusConfig[s]?.label ?? s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/recruiter/jobs/${a.jobs?.id}`}>View details</Link>
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
