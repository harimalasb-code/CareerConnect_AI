'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  Briefcase,
  CalendarClock,
  Users,
  Building2,
  CheckCircle2,
  Send,
  Bookmark,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

type Job = {
  id: string;
  title: string;
  description: string | null;
  responsibilities: string | null;
  qualifications: string | null;
  job_type: string;
  work_mode: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  experience_level: string;
  application_deadline: string | null;
  created_at: string;
  companies: { id: string; name: string; logo_url: string | null; is_verified: boolean } | null;
};

type JobSkillRow = { skills: { name: string } | null; is_required: boolean };
type ResumeOption = { id: string; file_name: string; version: number; is_primary: boolean };

export default function JobDetailsPage({ params }: { params: { id: string } }) {
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [skills, setSkills] = useState<JobSkillRow[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  // Apply dialog
  const [applyOpen, setApplyOpen] = useState(false);
  const [resumes, setResumes] = useState<ResumeOption[]>([]);
  const [selectedResume, setSelectedResume] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: jobData } = await supabase
        .from('jobs')
        .select(`*, companies ( id, name, logo_url, is_verified )`)
        .eq('id', params.id)
        .maybeSingle();
      setJob(jobData as unknown as Job | null);

      const { data: skillData } = await supabase
        .from('job_skills')
        .select('is_required, skills ( name )')
        .eq('job_id', params.id);
      setSkills((skillData as unknown as JobSkillRow[]) ?? []);

      const { count } = await supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('job_id', params.id);
      setApplicantCount(count ?? 0);

      if (profile?.role === 'candidate') {
        const { data: cp } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();
        if (cp) {
          const [sv, app] = await Promise.all([
            supabase.from('saved_jobs').select('id').eq('candidate_id', cp.id).eq('job_id', params.id).maybeSingle(),
            supabase.from('applications').select('id').eq('candidate_id', cp.id).eq('job_id', params.id).maybeSingle(),
          ]);
          setSaved(!!sv.data);
          setAlreadyApplied(!!app.data);
        }
      }
      setLoading(false);
    })();
  }, [params.id, profile]);

  const fmtSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return 'Competitive';
    const fmt = (n: number) => `${currency === 'USD' ? '$' : currency}${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max ?? 0)}`;
  };

  const toggleSave = async () => {
    if (!profile || profile.role !== 'candidate') { toast.info('Sign in as a candidate to save jobs'); return; }
    const { data: cp } = await supabase.from('candidate_profiles').select('id').eq('user_id', profile.id).maybeSingle();
    if (!cp) return;
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('candidate_id', cp.id).eq('job_id', params.id);
      setSaved(false); toast.success('Removed from saved jobs');
    } else {
      await supabase.from('saved_jobs').insert({ candidate_id: cp.id, job_id: params.id });
      setSaved(true); toast.success('Saved for later');
    }
  };

  const openApplyDialog = async () => {
    if (!profile) { toast.info('Sign in to apply'); return; }
    if (alreadyApplied) { toast.info('You already applied to this job'); return; }
    const { data: cp } = await supabase.from('candidate_profiles').select('id').eq('user_id', profile.id).maybeSingle();
    if (!cp) { toast.error('Please complete your profile first'); return; }
    const { data: resumeList } = await supabase.from('resumes').select('id, file_name, version').eq('candidate_id', cp.id).order('uploaded_at', { ascending: false });
    setResumes((resumeList as ResumeOption[]) ?? []);
    const primary = (resumeList as ResumeOption[])?.find((r) => r.is_primary);
    setSelectedResume(primary?.id ?? (resumeList as ResumeOption[])?.[0]?.id ?? '');
    setApplyOpen(true);
  };

  const handleApply = async () => {
    if (!profile) return;
    const { data: cp } = await supabase.from('candidate_profiles').select('id').eq('user_id', profile.id).maybeSingle();
    if (!cp) { toast.error('Please complete your profile first'); return; }
    setApplying(true);
    const { error } = await supabase.from('applications').insert({
      job_id: params.id,
      candidate_id: cp.id,
      resume_id: selectedResume || null,
      cover_letter: coverLetter || null,
      status: 'applied',
    });
    setApplying(false);
    if (error) { toast.error(error.message); return; }
    setAlreadyApplied(true);
    setApplyOpen(false);
    setCoverLetter('');
    setApplicantCount((c) => c + 1);
    toast.success('Application submitted!');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicNav />
        <div className="flex flex-1 items-center justify-center">Loading…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Briefcase className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Job not found</p>
          <Button asChild variant="outline">
            <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isCandidate = profile?.role === 'candidate';
  const requiredSkills = skills.filter((s) => s.is_required).map((s) => s.skills?.name).filter(Boolean);
  const preferredSkills = skills.filter((s) => !s.is_required).map((s) => s.skills?.name).filter(Boolean);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <div className="container mx-auto flex-1 px-4 py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 rounded-xl">
                    <AvatarImage src={job.companies?.logo_url ?? undefined} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-xl font-bold text-primary">
                      {job.companies?.name?.[0] ?? 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h1 className="font-display text-2xl font-bold md:text-3xl">{job.title}</h1>
                    <Link
                      href={job.companies?.id ? `/companies/${job.companies.id}` : '#'}
                      className="mt-1 flex items-center gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <Building2 className="h-4 w-4" /> {job.companies?.name}
                      {job.companies?.is_verified && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </Link>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" /> {job.location} · {job.work_mode}</span>
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Briefcase className="h-4 w-4" /> {job.job_type.replace('_', '-')}</span>
                      <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-4 w-4" /> {fmtSalary(job.salary_min, job.salary_max, job.currency)}</span>
                      <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" /> {applicantCount} applicant{applicantCount === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {job.description && (
              <Card>
                <CardHeader><CardTitle className="text-lg">About the role</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{job.description}</p></CardContent>
              </Card>
            )}
            {job.responsibilities && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Responsibilities</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{job.responsibilities}</p></CardContent>
              </Card>
            )}
            {job.qualifications && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Qualifications</CardTitle></CardHeader>
                <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{job.qualifications}</p></CardContent>
              </Card>
            )}
            {(requiredSkills.length > 0 || preferredSkills.length > 0) && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Skills</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {requiredSkills.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Required</p>
                      <div className="flex flex-wrap gap-2">
                        {requiredSkills.map((s) => <Badge key={s as string} className="bg-primary/10 text-primary">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {preferredSkills.length > 0 && (
                    <div>
                      <p className="mb-2 text-sm font-medium">Preferred</p>
                      <div className="flex flex-wrap gap-2">
                        {preferredSkills.map((s) => <Badge key={s as string} variant="secondary">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="sticky top-20">
              <CardHeader><CardTitle className="text-lg">Apply for this job</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Experience</span><span className="font-medium capitalize">{job.experience_level}</span></div>
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Salary</span><span className="font-medium">{fmtSalary(job.salary_min, job.salary_max, job.currency)}</span></div>
                  {job.application_deadline && (
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">Deadline</span><span className="font-medium">{new Date(job.application_deadline).toLocaleDateString()}</span></div>
                  )}
                  <div className="flex items-center justify-between"><span className="text-muted-foreground">Posted</span><span className="font-medium">{new Date(job.created_at).toLocaleDateString()}</span></div>
                </div>

                {isCandidate ? (
                  alreadyApplied ? (
                    <Button className="w-full" disabled variant="secondary">
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Already applied
                    </Button>
                  ) : (
                    <Button className="w-full" onClick={openApplyDialog}>
                      <Send className="mr-2 h-4 w-4" /> Apply now
                    </Button>
                  )
                ) : profile ? (
                  <Button className="w-full" disabled>{profile.role === 'recruiter' ? 'Recruiter account' : 'Admin account'}</Button>
                ) : (
                  <Button className="w-full" asChild><Link href="/login">Sign in to apply</Link></Button>
                )}

                <Button variant="outline" className="w-full" onClick={toggleSave}>
                  <Bookmark className={`mr-2 h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                  {saved ? 'Saved' : 'Save for later'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <SiteFooter />

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply for {job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume">Select resume</Label>
              {resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resumes uploaded. You can still apply without one, but adding a resume increases your chances.
                </p>
              ) : (
                <Select value={selectedResume} onValueChange={setSelectedResume}>
                  <SelectTrigger id="resume"><SelectValue placeholder="Choose a resume" /></SelectTrigger>
                  <SelectContent>
                    {resumes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.file_name} (v{r.version})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="coverLetter">Cover letter (optional)</Label>
              <Textarea
                id="coverLetter"
                rows={5}
                placeholder="Tell the employer why you're a great fit…"
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
