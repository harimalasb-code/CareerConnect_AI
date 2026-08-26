'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCandidate } from '@/lib/candidate-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Ban, Search, ExternalLink, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type App = {
  id: string;
  status: string;
  applied_at: string;
  cover_letter: string | null;
  jobs: {
    id: string;
    title: string;
    location: string | null;
    job_type: string;
    companies: { name: string; logo_url: string | null } | null;
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

export default function ApplicationsPage() {
  const { candidate, loading } = useCandidate();
  const [apps, setApps] = useState<App[]>([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async (cpId: string) => {
    const { data } = await supabase
      .from('applications')
      .select(`id, status, applied_at, cover_letter, jobs ( id, title, location, job_type, companies ( name, logo_url ) )`)
      .eq('candidate_id', cpId)
      .order('applied_at', { ascending: false });
    setApps(data as unknown as App[] ?? []);
  }, []);

  useEffect(() => {
    if (candidate) load(candidate.id);
  }, [candidate, load]);

  const handleWithdraw = async (id: string) => {
    const { error } = await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (candidate) await load(candidate.id);
    toast.success('Application withdrawn');
  };

  const filtered = filter === 'all' ? apps : apps.filter((a) => a.status === filter);
  const counts: Record<string, number> = { all: apps.length };
  apps.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  if (loading) return <div className="flex h-96 items-center justify-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">My Applications</h1>
        <p className="mt-1 text-muted-foreground">Track the status of all your job applications</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="applied">Applied ({counts.applied ?? 0})</TabsTrigger>
          <TabsTrigger value="under_review">Review ({counts.under_review ?? 0})</TabsTrigger>
          <TabsTrigger value="shortlisted">Shortlisted ({counts.shortlisted ?? 0})</TabsTrigger>
          <TabsTrigger value="interview">Interview ({counts.interview ?? 0})</TabsTrigger>
          <TabsTrigger value="selected">Selected ({counts.selected ?? 0})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({counts.rejected ?? 0})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Send className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No applications in this category</p>
            <Button asChild className="mt-2">
              <Link href="/jobs"><Search className="mr-2 h-4 w-4" /> Browse jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const cfg = statusConfig[a.status] ?? { color: 'bg-secondary', label: a.status };
            return (
              <Card key={a.id} className="transition-all hover:border-primary/30">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage src={a.jobs?.companies?.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                      {a.jobs?.companies?.name?.[0] ?? 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Link href={`/jobs/${a.jobs?.id}`} className="font-medium hover:text-primary">
                      {a.jobs?.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{a.jobs?.companies?.name}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(a.applied_at).toLocaleDateString()}</span>
                      <span>{a.jobs?.location}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/jobs/${a.jobs?.id}`}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                      {(a.status === 'applied' || a.status === 'under_review' || a.status === 'shortlisted') && (
                        <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => handleWithdraw(a.id)}>
                          <Ban className="h-4 w-4" /> Withdraw
                        </Button>
                      )}
                    </div>
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
