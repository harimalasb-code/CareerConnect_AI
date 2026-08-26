'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Video, Phone, MapPin, ExternalLink, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';

type Interview = {
  id: string;
  scheduled_at: string;
  meeting_link: string | null;
  interview_type: string;
  status: string;
  notes: string | null;
  application_id: string;
  applications: {
    candidate_id: string;
    candidates: {
      user_id: string;
      profiles: { full_name: string; avatar_url: string | null } | null;
    } | null;
    jobs: { id: string; title: string; companies: { name: string } | null } | null;
  } | null;
};

const typeIcon: Record<string, React.ElementType> = { video: Video, phone: Phone, onsite: MapPin };

const statusBadge: Record<string, { color: string; label: string }> = {
  scheduled: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Scheduled' },
  completed: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Cancelled' },
  rescheduled: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Rescheduled' },
};

export default function RecruiterInterviewsPage() {
  const { profile } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true });
    if (!compList || compList.length === 0) { setLoading(false); return; }
    const compIds = compList.map((c) => c.id);

    const { data: jobList } = await supabase.from('jobs').select('id').in('company_id', compIds);
    const jobIds = (jobList ?? []).map((j) => j.id);
    if (jobIds.length === 0) { setLoading(false); return; }

    const { data: appList } = await supabase.from('applications').select('id').in('job_id', jobIds);
    const appIds = (appList ?? []).map((a) => a.id);
    if (appIds.length === 0) { setLoading(false); return; }

    const { data: intList } = await supabase
      .from('interviews')
      .select(`id, scheduled_at, meeting_link, interview_type, status, notes, application_id, applications ( candidate_id, candidates ( user_id, profiles ( full_name, avatar_url ) ), jobs ( id, title, companies ( name ) ) )`)
      .in('application_id', appIds)
      .order('scheduled_at', { ascending: false });
    setInterviews(intList as unknown as Interview[] ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i)));
    toast.success('Interview cancelled');
  };

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'completed' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setInterviews((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'completed' } : i)));
    toast.success('Marked as completed');
  };

  const now = new Date();
  const upcoming = interviews.filter((i) => new Date(i.scheduled_at) >= now && i.status === 'scheduled');
  const past = interviews.filter((i) => new Date(i.scheduled_at) < now || i.status !== 'scheduled');
  const display = tab === 'upcoming' ? upcoming : past;

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Interviews</h1>
        <p className="mt-1 text-muted-foreground">Manage all interviews across your job postings</p>
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
              {tab === 'upcoming' ? 'Schedule interviews from the job details page.' : 'Completed and cancelled interviews will appear here.'}
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={i.applications?.candidates?.profiles?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-xs text-primary">{i.applications?.candidates?.profiles?.full_name?.[0] ?? 'C'}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{i.applications?.candidates?.profiles?.full_name ?? 'Candidate'}</p>
                    </div>
                    <p className="mt-1 text-sm font-medium">{i.applications?.jobs?.title}</p>
                    <p className="text-xs text-muted-foreground">{i.applications?.jobs?.companies?.name}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(i.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      <span className="capitalize">{i.interview_type}</span>
                    </div>
                    {i.notes && <p className="mt-2 text-sm text-muted-foreground">{i.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                    {i.meeting_link && i.status === 'scheduled' && (
                      <a href={i.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Join</Button>
                      </a>
                    )}
                    {i.status === 'scheduled' && tab === 'upcoming' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleComplete(i.id)}>Complete</Button>
                        <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => handleCancel(i.id)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
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
