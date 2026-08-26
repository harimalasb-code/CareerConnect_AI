'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { useCandidate, updateCompletion, type CandidateProfile } from '@/lib/candidate-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GraduationCap,
  Briefcase,
  FolderGit2,
  Award,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Github,
  Linkedin,
  Globe,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

type SkillRow = { id: string; name: string; proficiency_level: string };

type EducationRow = {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  start_date: string | null;
  end_date: string | null;
};

type ExperienceRow = {
  id: string;
  company: string;
  role: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

type ProjectRow = {
  id: string;
  title: string;
  description: string | null;
  technologies: string | null;
  github_url: string | null;
  live_url: string | null;
};

type CertRow = {
  id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
  credential_url: string | null;
};

export default function CandidateProfilePage() {
  const { profile } = useAuth();
  const { candidate, loading, reload } = useCandidate();
  const [saving, setSaving] = useState(false);

  // form state
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [github, setGithub] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [portfolio, setPortfolio] = useState('');

  // collections
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [allSkills, setAllSkills] = useState<{ id: string; name: string }[]>([]);
  const [education, setEducation] = useState<EducationRow[]>([]);
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [certs, setCerts] = useState<CertRow[]>([]);

  // skill picker
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState('intermediate');

  const loadCollections = useCallback(async (cpId: string) => {
    const [sk, allSk, edu, exp, proj, cert] = await Promise.all([
      supabase.from('candidate_skills').select('id, proficiency_level, skills(id, name)').eq('candidate_id', cpId),
      supabase.from('skills').select('id, name').order('name'),
      supabase.from('education').select('*').eq('candidate_id', cpId).order('start_date', { ascending: false }),
      supabase.from('experiences').select('*').eq('candidate_id', cpId).order('start_date', { ascending: false }),
      supabase.from('projects').select('*').eq('candidate_id', cpId),
      supabase.from('certifications').select('*').eq('candidate_id', cpId),
    ]);
    setSkills(
      (sk.data ?? []).map((s) => ({
        id: (s as Record<string, unknown>).id as string,
        name: ((s as Record<string, unknown>).skills as { name: string }).name,
        proficiency_level: (s as Record<string, unknown>).proficiency_level as string,
      })),
    );
    setAllSkills(allSk.data ?? []);
    setEducation(edu.data ?? []);
    setExperiences(exp.data ?? []);
    setProjects(proj.data ?? []);
    setCerts(cert.data ?? []);
  }, []);

  useEffect(() => {
    if (candidate) {
      setHeadline(candidate.headline ?? '');
      setBio(candidate.bio ?? '');
      setLocation(candidate.location ?? '');
      setGithub(candidate.github_url ?? '');
      setLinkedin(candidate.linkedin_url ?? '');
      setPortfolio(candidate.portfolio_url ?? '');
      loadCollections(candidate.id);
    }
  }, [candidate, loadCollections]);

  const handleSaveBasic = async () => {
    if (!candidate) return;
    setSaving(true);
    const { error } = await supabase
      .from('candidate_profiles')
      .update({
        headline: headline || null,
        bio: bio || null,
        location: location || null,
        github_url: github || null,
        linkedin_url: linkedin || null,
        portfolio_url: portfolio || null,
      })
      .eq('id', candidate.id);
    setSaving(false);
    if (error) {
      toast.error('Failed to save profile');
      return;
    }
    await updateCompletion(candidate.id);
    await reload();
    toast.success('Profile updated');
  };

  const addSkill = async () => {
    if (!candidate || !newSkillId) return;
    const { error } = await supabase
      .from('candidate_skills')
      .insert({ candidate_id: candidate.id, skill_id: newSkillId, proficiency_level: newSkillLevel });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewSkillId('');
    await loadCollections(candidate.id);
    await updateCompletion(candidate.id);
    await reload();
    toast.success('Skill added');
  };

  const removeSkill = async (skillRowId: string) => {
    if (!candidate) return;
    await supabase.from('candidate_skills').delete().eq('id', skillRowId);
    await loadCollections(candidate.id);
    await updateCompletion(candidate.id);
    await reload();
    toast.success('Skill removed');
  };

  if (loading) {
    return <div className="flex h-96 items-center justify-center">Loading profile…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">My Profile</h1>
          <p className="mt-1 text-muted-foreground">Build a complete profile to boost your visibility to recruiters.</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm text-muted-foreground">Profile completion</p>
          <p className="font-display text-2xl font-bold">{candidate?.profile_completion ?? 0}%</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Progress value={candidate?.profile_completion ?? 0} className="h-2" />
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic information</CardTitle>
          <CardDescription>Headline, bio, location, and social links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="headline">Professional headline</Label>
              <Input id="headline" placeholder="Full-Stack Developer" value={headline} onChange={(e) => setHeadline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="San Francisco, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">About / Bio</Label>
            <Textarea id="bio" rows={4} placeholder="Tell recruiters about yourself…" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="github" className="flex items-center gap-1.5"><Github className="h-4 w-4" /> GitHub</Label>
              <Input id="github" placeholder="https://github.com/username" value={github} onChange={(e) => setGithub(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-1.5"><Linkedin className="h-4 w-4" /> LinkedIn</Label>
              <Input id="linkedin" placeholder="https://linkedin.com/in/username" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio" className="flex items-center gap-1.5"><Globe className="h-4 w-4" /> Portfolio</Label>
              <Input id="portfolio" placeholder="https://your-site.dev" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveBasic} disabled={saving}>
              <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-accent" /> Skills</CardTitle>
          <CardDescription>Add your technical and soft skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {skills.length === 0 && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
            {skills.map((s) => (
              <Badge key={s.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground capitalize">{s.proficiency_level}</span>
                <button onClick={() => removeSkill(s.id)} className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="skillSelect" className="sr-only">Select skill</Label>
              <Select value={newSkillId} onValueChange={setNewSkillId}>
                <SelectTrigger id="skillSelect" className="w-full min-w-[200px]">
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {allSkills
                    .filter((s) => !skills.some((sk) => sk.name === s.name))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[150px]">
              <Select value={newSkillLevel} onValueChange={setNewSkillLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addSkill} disabled={!newSkillId}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <SectionCard
        title="Education"
        icon={GraduationCap}
        description="Your academic background"
        items={education}
        render={(e) => (
          <div>
            <p className="font-medium">{e.degree} in {e.field}</p>
            <p className="text-sm text-muted-foreground">{e.institution}</p>
            {e.start_date && (
              <p className="text-xs text-muted-foreground">
                {e.start_date} — {e.end_date ?? 'Present'}
              </p>
            )}
          </div>
        )}
        fields={[
          { key: 'institution', label: 'Institution', type: 'text', required: true },
          { key: 'degree', label: 'Degree', type: 'text', required: true },
          { key: 'field', label: 'Field of study', type: 'text' },
          { key: 'start_date', label: 'Start date', type: 'date' },
          { key: 'end_date', label: 'End date', type: 'date' },
        ]}
        table="education"
        candidateId={candidate?.id ?? null}
        onReload={async () => {
          if (candidate) {
            await loadCollections(candidate.id);
            await updateCompletion(candidate.id);
            await reload();
          }
        }}
      />

      {/* Experience */}
      <SectionCard
        title="Experience"
        icon={Briefcase}
        description="Work and internship history"
        items={experiences}
        render={(e) => (
          <div>
            <p className="font-medium">{e.role} at {e.company}</p>
            {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
            {e.start_date && (
              <p className="text-xs text-muted-foreground">
                {e.start_date} — {e.is_current ? 'Present' : (e.end_date ?? '—')}
              </p>
            )}
          </div>
        )}
        fields={[
          { key: 'company', label: 'Company', type: 'text', required: true },
          { key: 'role', label: 'Role / Title', type: 'text', required: true },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'start_date', label: 'Start date', type: 'date' },
          { key: 'end_date', label: 'End date', type: 'date' },
          { key: 'is_current', label: 'I currently work here', type: 'checkbox' },
        ]}
        table="experiences"
        candidateId={candidate?.id ?? null}
        onReload={async () => {
          if (candidate) {
            await loadCollections(candidate.id);
            await updateCompletion(candidate.id);
            await reload();
          }
        }}
      />

      {/* Projects */}
      <SectionCard
        title="Projects"
        icon={FolderGit2}
        description="Showcase your portfolio projects"
        items={projects}
        render={(p) => (
          <div>
            <p className="font-medium">{p.title}</p>
            {p.technologies && <p className="text-sm text-muted-foreground">Tech: {p.technologies}</p>}
            {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
          </div>
        )}
        fields={[
          { key: 'title', label: 'Project title', type: 'text', required: true },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'technologies', label: 'Technologies (comma-separated)', type: 'text' },
          { key: 'github_url', label: 'GitHub URL', type: 'text' },
          { key: 'live_url', label: 'Live URL', type: 'text' },
        ]}
        table="projects"
        candidateId={candidate?.id ?? null}
        onReload={async () => {
          if (candidate) {
            await loadCollections(candidate.id);
            await updateCompletion(candidate.id);
            await reload();
          }
        }}
      />

      {/* Certifications */}
      <SectionCard
        title="Certifications"
        icon={Award}
        description="Professional certifications and credentials"
        items={certs}
        render={(c) => (
          <div>
            <p className="font-medium">{c.name}</p>
            {c.issuer && <p className="text-sm text-muted-foreground">{c.issuer}</p>}
            {c.issue_date && <p className="text-xs text-muted-foreground">Issued {c.issue_date}</p>}
          </div>
        )}
        fields={[
          { key: 'name', label: 'Certification name', type: 'text', required: true },
          { key: 'issuer', label: 'Issuing organization', type: 'text' },
          { key: 'issue_date', label: 'Issue date', type: 'date' },
          { key: 'credential_url', label: 'Credential URL', type: 'text' },
        ]}
        table="certifications"
        candidateId={candidate?.id ?? null}
        onReload={async () => {
          if (candidate) {
            await loadCollections(candidate.id);
            await updateCompletion(candidate.id);
            await reload();
          }
        }}
      />
    </div>
  );
}

type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'checkbox';
  required?: boolean;
};

function SectionCard<T extends { id: string }>({
  title,
  icon: Icon,
  description,
  items,
  render,
  fields,
  table,
  candidateId,
  onReload,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  items: T[];
  render: (item: T) => React.ReactNode;
  fields: FieldDef[];
  table: string;
  candidateId: string | null;
  onReload: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setFormValues({});
    setOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    const vals: Record<string, unknown> = {};
    fields.forEach((f) => {
      vals[f.key] = (item as Record<string, unknown>)[f.key] ?? (f.type === 'checkbox' ? false : '');
    });
    setFormValues(vals);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!candidateId) return;
    setSaving(true);
    const payload: Record<string, unknown> = { candidate_id: candidateId, ...formValues };
    // Convert empty strings to null for optional fields
    fields.forEach((f) => {
      if (f.type !== 'checkbox' && payload[f.key] === '') payload[f.key] = null;
    });

    const { error } = editing
      ? await supabase.from(table).update(payload).eq('id', (editing as Record<string, unknown>).id)
      : await supabase.from(table).insert(payload);

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    await onReload();
    toast.success(editing ? 'Updated' : 'Added');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await onReload();
    toast.success('Deleted');
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg"><Icon className="h-5 w-5 text-primary" /> {title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="mr-1 h-4 w-4" /> Add
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No entries yet. Click &ldquo;Add&rdquo; to create one.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between rounded-lg border border-border p-4">
                {render(item)}
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${title}` : `Add ${title}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={f.key}>{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                {f.type === 'textarea' ? (
                  <Textarea
                    id={f.key}
                    rows={3}
                    value={(formValues[f.key] as string) ?? ''}
                    onChange={(e) => setFormValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                ) : f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={(formValues[f.key] as boolean) ?? false}
                      onChange={(e) => setFormValues((p) => ({ ...p, [f.key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm">{f.label}</span>
                  </label>
                ) : (
                  <Input
                    id={f.key}
                    type={f.type}
                    value={(formValues[f.key] as string) ?? ''}
                    onChange={(e) => setFormValues((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
