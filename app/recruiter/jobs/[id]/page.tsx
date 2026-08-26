'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Pencil, Users, CalendarClock, ExternalLink, Trash2,
  Video, Phone, MapPin, Loader2, CheckCircle2, Clock, FileText, Star,
} from 'lucide-react';
import { toast } from 'sonner';

type Applicant = {
  id: string;
  status: string;
  applied_at: string;
  cover_letter: string | null;
  recruiter_notes: string | null;
  candidate_id: string;
  candidates: {
    user_id: string;
    headline: string | null;
    location: string | null;
    profile_completion: number;
    profiles: { full_name: string; avatar_url: string | null; email: string } | null;
  } | null;
};

type JobData = {
  id: string;
  title: string;
  status: string;
  job_type: string;
  work_mode: string;
  location: string | null;
  description: string | null;
  created_at: string;
};

type Interview = {
  id: string;
  scheduled_at: string;
  meeting_link: string | null;
  interview_type: string;
  status: string;
  notes: string | null;
  application_id: string;
};

const statusConfig: Record<string, { color: string; label: string; next: string[] }> = {
  applied: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Applied', next: ['under_review', 'shortlisted', 'rejected'] },
  under_review: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Under Review', next: ['shortlisted', 'interview', 'rejected'] },
  shortlisted: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300', label: 'Shortlisted', next: ['interview', 'selected', 'rejected'] },
  interview: { color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300', label: 'Interview', next: ['selected', 'rejected'] },
  selected: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Selected', next: [] },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected', next: [] },
  withdrawn: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Withdrawn', next: [] },
};

const typeIcon: Record<string, React.ElementType> = { video: Video, phone: Phone, onsite: MapPin };

export default function RecruiterJobDetailPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const [job, setJob] = useState<JobData | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Interview dialog
  const [scheduleFor, setScheduleFor] = useState<Applicant | null>(null);
  const [intDate, setIntDate] = useState('');
  const [intType, setIntType] = useState('video');
  const [intLink, setIntLink] = useState('');
  const [intNotes, setIntNotes] = useState('');
  const [savingInt, setSavingInt] = useState(false);

  // Notes dialog
  const [notesFor, setNotesFor] = useState<Applicant | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: jobData } = await supabase
      .from('jobs')
      .select('id, title, status, job_type, work_mode, location, description, created_at')
      .eq('id', params.id)
      .maybeSingle();
    setJob(jobData as JobData | null);

    const { data: appList } = await supabase
      .from('applications')
      .select(`id, status, applied_at, cover_letter, recruiter_notes, candidate_id, candidates ( user_id, headline, location, profile_completion, profiles ( full_name, avatar_url, email ) )`)
      .eq('job_id', params.id)
      .order('applied_at', { ascending: false });
    setApplicants(appList as unknown as Applicant[] ?? []);

    const appIds = (appList ?? []).map((a) => a.id);
    if (appIds.length > 0) {
      const { data: intList } = await supabase
        .from('interviews')
        .select('id, scheduled_at, meeting_link, interview_type, status, notes, application_id')
        .in('application_id', appIds)
        .order('scheduled_at', { ascending: true });
      setInterviews(intList as Interview[] ?? []);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (appId: string, newStatus: string) => {
    const { error } = await supabase.from('applications').update({ status: newStatus }).eq('id', appId);
    if (error) { toast.error(error.message); return; }

    // Notify candidate
    const app = applicants.find((a) => a.id === appId);
    if (app?.candidates?.user_id) {
      const cfg = statusConfig[newStatus];
      await supabase.from('notifications').insert({
        user_id: app.candidates.user_id,
        title: `Application status updated`,
        message: `Your application for "${job?.title}" is now ${cfg?.label ?? newStatus}.`,
        type: 'status',
        related_id: appId,
      });
    }
    await load();
    toast.success('Status updated');
  };

  const openSchedule = (app: Applicant) => {
    setScheduleFor(app);
    setIntDate('');
    setIntType('video');
    setIntLink('');
    setIntNotes('');
  };

  const handleSchedule = async () => {
    if (!scheduleFor) return;
    if (!intDate) { toast.error('Pick a date and time'); return; }
    setSavingInt(true);
    const { error } = await supabase.from('interviews').insert({
      application_id: scheduleFor.id,
      scheduled_at: new Date(intDate).toISOString(),
      interview_type: intType,
      meeting_link: intLink || null,
      notes: intNotes || null,
      status: 'scheduled',
    });
    if (error) { toast.error(error.message); setSavingInt(false); return; }

    // Update application status to interview
    await supabase.from('applications').update({ status: 'interview' }).eq('id', scheduleFor.id);

    // Notify candidate
    if (scheduleFor.candidates?.user_id) {
      await supabase.from('notifications').insert({
        user_id: scheduleFor.candidates.user_id,
        title: 'Interview scheduled',
        message: `You have an interview for "${job?.title}" on ${new Date(intDate).toLocaleString()}.`,
        type: 'interview',
        related_id: scheduleFor.id,
      });
    }

    setSavingInt(false);
    setScheduleFor(null);
    await load();
    toast.success('Interview scheduled');
  };

  const cancelInterview = async (intId: string) => {
    const { error } = await supabase.from('interviews').update({ status: 'cancelled' }).eq('id', intId);
    if (error) { toast.error(error.message); return; }
    await load();
    toast.success('Interview cancelled');
  };

  const openNotes = (app: Applicant) => {
    setNotesFor(app);
    setNotesText(app.recruiter_notes ?? '');
  };

  const handleSaveNotes = async () => {
    if (!notesFor) return;
    setSavingNotes(true);
    const { error } = await supabase.from('applications').update({ recruiter_notes: notesText || null }).eq('id', notesFor.id);
    setSavingNotes(false);
    if (error) { toast.error(error.message); return; }
    setNotesFor(null);
    await load();
    toast.success('Notes saved');
  };

  const filtered = filter === 'all' ? applicants : applicants.filter((a) => a.status === filter);
  const counts: Record<string, number> = { all: applicants.length };
  applicants.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  const upcomingInterviews = interviews.filter((i) => new Date(i.scheduled_at) >= new Date() && i.status === 'scheduled');

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!job) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild><Link href="/recruiter/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
        <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><p className="font-medium">Job not found</p></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/recruiter/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
      </Button>

      {/* Job header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">{job.title}</h1>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="capitalize">{job.job_type.replace('_', '-')}</span>
                <span className="capitalize">{job.work_mode}</span>
                <span>{job.location}</span>
                <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">{job.status}</Badge>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/recruiter/jobs/new?edit=${job.id}`}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Link>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href={`/jobs/${job.id}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming interviews */}
      {upcomingInterviews.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-5 w-5 text-primary" /> Upcoming interviews ({upcomingInterviews.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingInterviews.map((i) => {
                const Icon = typeIcon[i.interview_type] ?? Video;
                const app = applicants.find((a) => a.id === i.application_id);
                return (
                  <div key={i.id} className="flex items-center gap-4 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon className="h-5 w-5" /></div>
                    <div className="flex-1">
                      <p className="font-medium">{app?.candidates?.profiles?.full_name ?? 'Candidate'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(i.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {i.interview_type}
                      </p>
                    </div>
                    {i.meeting_link && (
                      <a href={i.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Join</Button>
                      </a>
                    )}
                    <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => cancelInterview(i.id)}>Cancel</Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applicants */}
      <div>
        <h2 className="mb-3 font-display text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Applicants ({applicants.length})</h2>
        {applicants.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium">No applications yet</p>
              <p className="text-sm text-muted-foreground">Applications will appear here once candidates apply.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs value={filter} onValueChange={setFilter} className="mb-4">
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

            <div className="space-y-3">
              {filtered.map((a) => {
                const cfg = statusConfig[a.status] ?? { color: 'bg-secondary', label: a.status, next: [] };
                const appInterviews = interviews.filter((i) => i.application_id === a.id);
                return (
                  <Card key={a.id} className="transition-all hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={a.candidates?.profiles?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {a.candidates?.profiles?.full_name?.[0] ?? 'C'}
                          </AvatarFallback>
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
                            <span>{a.candidates?.location}</span>
                            <span>Applied {new Date(a.applied_at).toLocaleDateString()}</span>
                            <span>Profile {a.candidates?.profile_completion ?? 0}%</span>
                            {a.recruiter_notes && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> Has notes</span>}
                          </div>
                          {a.cover_letter && (
                            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.cover_letter}</p>
                          )}
                          {appInterviews.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {appInterviews.map((i) => {
                                const Icon = typeIcon[i.interview_type] ?? Video;
                                return (
                                  <Badge key={i.id} variant="outline" className="gap-1">
                                    <Icon className="h-3 w-3" />
                                    {new Date(i.scheduled_at).toLocaleDateString()} · {i.status}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {cfg.next.length > 0 && (
                            <Select onValueChange={(v) => updateStatus(a.id, v)}>
                              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Update status" /></SelectTrigger>
                              <SelectContent>
                                {cfg.next.map((s) => (
                                  <SelectItem key={s} value={s}>{statusConfig[s]?.label ?? s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => openSchedule(a)}>
                              <CalendarClock className="mr-1 h-3.5 w-3.5" /> Interview
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openNotes(a)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Schedule Interview Dialog */}
      <Dialog open={!!scheduleFor} onOpenChange={(v) => !v && setScheduleFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Schedule interview with {scheduleFor?.candidates?.profiles?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intDate">Date &amp; time</Label>
              <Input id="intDate" type="datetime-local" value={intDate} onChange={(e) => setIntDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Interview type</Label>
              <Select value={intType} onValueChange={setIntType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video">Video call</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intLink">Meeting link (optional)</Label>
              <Input id="intLink" placeholder="https://meet.google.com/…" value={intLink} onChange={(e) => setIntLink(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intNotes">Notes (optional)</Label>
              <Textarea id="intNotes" rows={3} placeholder="Interview instructions or agenda…" value={intNotes} onChange={(e) => setIntNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleFor(null)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={savingInt}>
              {savingInt ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarClock className="mr-2 h-4 w-4" />}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={!!notesFor} onOpenChange={(v) => !v && setNotesFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Notes for {notesFor?.candidates?.profiles?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notesText">Private recruiter notes</Label>
            <Textarea id="notesText" rows={5} placeholder="Your notes about this candidate…" value={notesText} onChange={(e) => setNotesText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesFor(null)}>Close</Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes}>
              {savingNotes ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
