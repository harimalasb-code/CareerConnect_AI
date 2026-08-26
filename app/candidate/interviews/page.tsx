'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useCandidate } from '@/lib/candidate-utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Video, Phone, MapPin, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';

type Interview = {
  id: string;
  scheduled_at: string;
  meeting_link: string | null;
  interview_type: string;
  notes: string | null;
  status: string;
  applications: {
    jobs: {
      id: string;
      title: string;
      companies: { name: string; logo_url: string | null } | null;
    } | null;
  } | null;
};

const typeIcon: Record<string, React.ElementType> = { video: Video, phone: Phone, onsite: MapPin };

export default function InterviewsPage() {
  const { candidate, loading } = useCandidate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [tab, setTab] = useState('upcoming');

  const load = useCallback(async (cpId: string) => {
    const { data } = await supabase
      .from('interviews')
      .select(`id, scheduled_at, meeting_link, interview_type, notes, status, applications!inner ( jobs ( id, title, companies ( name, logo_url ) ) )`)
      .eq('applications.candidate_id', cpId)
      .order('scheduled_at', { ascending: false });
    setInterviews(data as unknown as Interview[] ?? []);
  }, []);

  useEffect(() => {
    if (candidate) load(candidate.id);
  }, [candidate, load]);

  const now = new Date();
  const upcoming = interviews.filter((i) => new Date(i.scheduled_at) >= now && i.status !== 'cancelled');
  const past = interviews.filter((i) => new Date(i.scheduled_at) < now || i.status === 'cancelled');
  const display = tab === 'upcoming' ? upcoming : past;

  const statusBadge: Record<string, { color: string; label: string }> = {
    scheduled: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Scheduled' },
    completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Cancelled' },
    rescheduled: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Rescheduled' },
  };

  if (loading) return <div className="flex h-96 items-center justify-center">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Interviews</h1>
        <p className="mt-1 text-muted-foreground">Your scheduled and past interviews</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {display.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">{tab === 'upcoming' ? 'No upcoming interviews' : 'No past interviews'}</p>
            <p className="text-sm text-muted-foreground">
              {tab === 'upcoming' ? 'Your scheduled interviews will appear here.' : 'Completed interviews will show here.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {display.map((i) => {
            const Icon = typeIcon[i.interview_type] ?? Video;
            const cfg = statusBadge[i.status] ?? { color: 'bg-secondary', label: i.status };
            return (
              <Card key={i.id}>
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{i.applications?.jobs?.title}</p>
                    <p className="text-sm text-muted-foreground">{i.applications?.jobs?.companies?.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(i.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="capitalize">{i.interview_type}</span>
                    </div>
                    {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                    {i.meeting_link && i.status === 'scheduled' && (
                      <a href={i.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm">
                          <ExternalLink className="mr-1 h-3.5 w-3.5" /> Join
                        </Button>
                      </a>
                    )}
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
