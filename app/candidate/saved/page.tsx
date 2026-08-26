'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCandidate } from '@/lib/candidate-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bookmark, Trash2, MapPin, Briefcase, TrendingUp, Search } from 'lucide-react';
import { toast } from 'sonner';

type SavedJob = {
  id: string;
  job_id: string;
  created_at: string;
  jobs: {
    id: string;
    title: string;
    location: string | null;
    job_type: string;
    work_mode: string;
    salary_min: number | null;
    salary_max: number | null;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
};

export default function SavedJobsPage() {
  const { candidate, loading } = useCandidate();
  const [saved, setSaved] = useState<SavedJob[]>([]);

  const load = useCallback(async (cpId: string) => {
    const { data } = await supabase
      .from('saved_jobs')
      .select(`id, job_id, created_at, jobs ( id, title, location, job_type, work_mode, salary_min, salary_max, companies ( name, logo_url ) )`)
      .eq('candidate_id', cpId)
      .order('created_at', { ascending: false });
    setSaved(data as unknown as SavedJob[] ?? []);
  }, []);

  useEffect(() => {
    if (candidate) load(candidate.id);
  }, [candidate, load]);

  const handleRemove = async (id: string) => {
    await supabase.from('saved_jobs').delete().eq('id', id);
    if (candidate) await load(candidate.id);
    toast.success('Removed from saved');
  };

  const fmtSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Competitive';
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max ?? 0)}`;
  };

  if (loading) return <div className="flex h-96 items-center justify-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Saved Jobs</h1>
        <p className="mt-1 text-muted-foreground">Jobs you&apos;ve bookmarked for later</p>
      </div>

      {saved.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bookmark className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No saved jobs yet</p>
            <p className="text-sm text-muted-foreground">Browse jobs and click the bookmark icon to save them.</p>
            <Button asChild className="mt-2">
              <Link href="/jobs"><Search className="mr-2 h-4 w-4" /> Browse jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {saved.map((s) => (
            <Card key={s.id} className="transition-all hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/jobs/${s.jobs?.id ?? s.job_id}`} className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-lg">
                      <AvatarImage src={s.jobs?.companies?.logo_url ?? undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                        {s.jobs?.companies?.name?.[0] ?? 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">{s.jobs?.companies?.name}</p>
                      <p className="text-xs text-muted-foreground">{s.jobs?.location}</p>
                    </div>
                  </Link>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => handleRemove(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Link href={`/jobs/${s.jobs?.id ?? s.job_id}`}>
                  <h3 className="mt-4 font-semibold hover:text-primary">{s.jobs?.title}</h3>
                </Link>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {s.jobs?.work_mode}</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {s.jobs?.job_type.replace('_', '-')}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" /> {fmtSalary(s.jobs?.salary_min ?? null, s.jobs?.salary_max ?? null)}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Saved {new Date(s.created_at).toLocaleDateString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
