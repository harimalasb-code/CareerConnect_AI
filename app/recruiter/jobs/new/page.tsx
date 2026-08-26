'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus, X, BriefcaseBusiness } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type SkillOption = { id: string; name: string };
type SelectedSkill = { skill_id: string; name: string; is_required: boolean };

export default function JobFormPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit') || searchParams.get('id');
  const isEdit = !!editId;

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [allSkills, setAllSkills] = useState<SkillOption[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noCompany, setNoCompany] = useState(false);

  // form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [jobType, setJobType] = useState('full_time');
  const [workMode, setWorkMode] = useState('remote');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [experienceLevel, setExperienceLevel] = useState('entry');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const [compRes, skillsRes] = await Promise.all([
        supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true }).limit(1),
        supabase.from('skills').select('id, name').order('name'),
      ]);
      if (!compRes.data || compRes.data.length === 0) { setNoCompany(true); setLoading(false); return; }
      setCompanyId(compRes.data[0].id);
      setAllSkills(skillsRes.data ?? []);

      if (editId) {
        const { data: job } = await supabase.from('jobs').select('*').eq('id', editId).maybeSingle();
        if (job) {
          setTitle(job.title);
          setDescription(job.description ?? '');
          setResponsibilities(job.responsibilities ?? '');
          setQualifications(job.qualifications ?? '');
          setJobType(job.job_type);
          setWorkMode(job.work_mode);
          setLocation(job.location ?? '');
          setSalaryMin(job.salary_min?.toString() ?? '');
          setSalaryMax(job.salary_max?.toString() ?? '');
          setCurrency(job.currency);
          setExperienceLevel(job.experience_level);
          setDeadline(job.application_deadline ? new Date(job.application_deadline).toISOString().slice(0, 16) : '');
          setStatus(job.status);
        }
        const { data: js } = await supabase
          .from('job_skills')
          .select('skill_id, is_required, skills(name)')
          .eq('job_id', editId);
        setSelectedSkills(
          (js ?? []).map((s) => ({
            skill_id: (s as Record<string, unknown>).skill_id as string,
            name: ((s as Record<string, unknown>).skills as { name: string }).name,
            is_required: (s as Record<string, unknown>).is_required as boolean,
          })),
        );
      }
      setLoading(false);
    })();
  }, [profile, editId]);

  const addSkill = (skill: SkillOption) => {
    if (selectedSkills.some((s) => s.skill_id === skill.id)) return;
    setSelectedSkills([...selectedSkills, { skill_id: skill.id, name: skill.name, is_required: true }]);
    setSkillSearch('');
  };

  const removeSkill = (skillId: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skillId));
  };

  const toggleSkillRequired = (skillId: string) => {
    setSelectedSkills(selectedSkills.map((s) => (s.skill_id === skillId ? { ...s, is_required: !s.is_required } : s)));
  };

  const handleSave = async () => {
    if (!companyId || !profile) return;
    if (!title.trim()) { toast.error('Job title is required'); return; }
    setSaving(true);

    const payload = {
      company_id: companyId,
      posted_by: profile.id,
      title: title.trim(),
      description: description || null,
      responsibilities: responsibilities || null,
      qualifications: qualifications || null,
      job_type: jobType,
      work_mode: workMode,
      location: location || null,
      salary_min: salaryMin ? parseInt(salaryMin) : null,
      salary_max: salaryMax ? parseInt(salaryMax) : null,
      currency,
      experience_level: experienceLevel,
      application_deadline: deadline ? new Date(deadline).toISOString() : null,
      status,
    };

    let jobId = editId;
    if (isEdit && jobId) {
      const { error } = await supabase.from('jobs').update(payload).eq('id', jobId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      // Replace skills
      await supabase.from('job_skills').delete().eq('job_id', jobId);
    } else {
      const { data, error } = await supabase.from('jobs').insert(payload).select('id').single();
      if (error) { toast.error(error.message); setSaving(false); return; }
      jobId = data.id;
    }

    if (selectedSkills.length > 0 && jobId) {
      const { error: jsError } = await supabase.from('job_skills').insert(
        selectedSkills.map((s) => ({ job_id: jobId, skill_id: s.skill_id, is_required: s.is_required })),
      );
      if (jsError) { toast.error('Job saved, but skills failed'); setSaving(false); return; }
    }

    setSaving(false);
    toast.success(isEdit ? 'Job updated' : 'Job created');
    router.push('/recruiter/jobs');
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (noCompany) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/recruiter/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
        </Button>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <BriefcaseBusiness className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Set up your company first</p>
            <p className="text-sm text-muted-foreground">You need a company profile before posting jobs.</p>
            <Button asChild className="mt-2">
              <Link href="/recruiter/company">Create company profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredSkills = allSkills
    .filter((s) => !selectedSkills.some((ss) => ss.skill_id === s.id))
    .filter((s) => !skillSearch || s.name.toLowerCase().includes(skillSearch.toLowerCase()))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/recruiter/jobs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs</Link>
      </Button>

      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{isEdit ? 'Edit Job' : 'Post a New Job'}</h1>
        <p className="mt-1 text-muted-foreground">{isEdit ? 'Update your job posting' : 'Create a new job listing to attract candidates'}</p>
      </div>

      <div className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job details</CardTitle>
            <CardDescription>Basic information about the position</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job title <span className="text-destructive">*</span></Label>
              <Input id="title" placeholder="Senior Frontend Engineer" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Job type</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Work mode</Label>
                <Select value={workMode} onValueChange={setWorkMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" placeholder="San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Salary min</Label>
                <Input id="salaryMin" type="number" placeholder="50000" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Salary max</Label>
                <Input id="salaryMax" type="number" placeholder="80000" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deadline">Application deadline</Label>
                <Input id="deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (not visible)</SelectItem>
                    <SelectItem value="active">Active (publish)</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description sections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
            <CardDescription>Detailed information about the role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">About the role</Label>
              <Textarea id="description" rows={4} placeholder="Describe the role and what the candidate will do…" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea id="responsibilities" rows={4} placeholder="Key responsibilities and day-to-day tasks…" value={responsibilities} onChange={(e) => setResponsibilities(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualifications">Qualifications</Label>
              <Textarea id="qualifications" rows={4} placeholder="Required and preferred qualifications…" value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Required skills</CardTitle>
            <CardDescription>Add skills and mark them as required or preferred</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {selectedSkills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
              {selectedSkills.map((s) => (
                <Badge key={s.skill_id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
                  <span className="font-medium">{s.name}</span>
                  <button onClick={() => toggleSkillRequired(s.skill_id)} className={`rounded px-1.5 py-0.5 text-xs ${s.is_required ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {s.is_required ? 'Required' : 'Preferred'}
                  </button>
                  <button onClick={() => removeSkill(s.skill_id)} className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="relative">
              <Input placeholder="Search skills to add…" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} />
              {skillSearch && filteredSkills.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  {filteredSkills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSkill(s)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/10"
                    >
                      <Plus className="h-3.5 w-3.5" /> {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild><Link href="/recruiter/jobs">Cancel</Link></Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEdit ? 'Save changes' : 'Create job'}
          </Button>
        </div>
      </div>
    </div>
  );
}
