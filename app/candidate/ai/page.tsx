'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sparkles, FileText, Target, TrendingUp, PenLine, Loader2,
  CheckCircle2, XCircle, AlertCircle, Wand2, Copy, ArrowRight, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

type CandidateProfile = {
  id: string;
  headline: string | null;
  bio: string | null;
  college: string | null;
  degree: string | null;
  department: string | null;
  graduation_year: number | null;
  location: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  profile_completion: number;
};

type Skill = { skill_id: string; skills: { name: string } | null; proficiency_level: string };
type Experience = { id: string; company: string; role: string; description: string | null; start_date: string | null; end_date: string | null; is_current: boolean };
type Education = { id: string; institution: string; degree: string; field: string | null };
type Project = { id: string; title: string; description: string | null; technologies: string | null };
type Certification = { id: string; name: string; issuer: string | null };
type Resume = { id: string; file_name: string; is_primary: boolean };

type JobOption = { id: string; title: string; company_name: string };
type AnalysisRecord = {
  id: string;
  analysis_type: string;
  match_score: number | null;
  ats_score: number | null;
  analysis: Record<string, unknown>;
  created_at: string;
};

export default function CandidateAIPage() {
  const { profile } = useAuth();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'ats' | 'match' | 'gap' | 'cover'>('ats');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [history, setHistory] = useState<AnalysisRecord[]>([]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: cp } = await supabase.from('candidate_profiles').select('*').eq('user_id', profile.id).maybeSingle();
    setCandidate(cp as CandidateProfile | null);
    if (!cp) { setLoading(false); return; }

    const [sk, ex, ed, pr, ce, re] = await Promise.all([
      supabase.from('candidate_skills').select('skill_id, proficiency_level, skills(name)').eq('candidate_id', cp.id),
      supabase.from('experiences').select('id, company, role, description, start_date, end_date, is_current').eq('candidate_id', cp.id).order('start_date', { ascending: false }),
      supabase.from('education').select('id, institution, degree, field').eq('candidate_id', cp.id),
      supabase.from('projects').select('id, title, description, technologies').eq('candidate_id', cp.id),
      supabase.from('certifications').select('id, name, issuer').eq('candidate_id', cp.id),
      supabase.from('resumes').select('id, file_name, is_primary').eq('candidate_id', cp.id).order('is_primary', { ascending: false }),
    ]);
    setSkills(sk.data as unknown as Skill[] ?? []);
    setExperiences(ex.data as Experience[] ?? []);
    setEducation(ed.data as Education[] ?? []);
    setProjects(pr.data as Project[] ?? []);
    setCertifications(ce.data as Certification[] ?? []);
    setResumes(re.data as Resume[] ?? []);

    const { data: jobs } = await supabase
      .from('jobs')
      .select(`id, title, companies ( name )`)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);
    setJobOptions((jobs ?? []).map((j) => ({ id: j.id, title: j.title, company_name: ((j as Record<string, unknown>).companies as { name: string } | null)?.name ?? '' })));

    const { data: hist } = await supabase
      .from('ai_analyses')
      .select('id, analysis_type, match_score, ats_score, analysis, created_at')
      .eq('candidate_id', cp.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory(hist as AnalysisRecord[] ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  const persistAnalysis = async (analysisType: string, data: Record<string, unknown>, scores?: { match?: number; ats?: number }) => {
    if (!candidate) return;
    const { data: inserted } = await supabase.from('ai_analyses').insert({
      candidate_id: candidate.id,
      analysis_type: analysisType,
      match_score: scores?.match ?? null,
      ats_score: scores?.ats ?? null,
      analysis: data,
    }).select('id, analysis_type, match_score, ats_score, analysis, created_at').single();
    if (inserted) {
      setResult(inserted as AnalysisRecord);
      setHistory((prev) => [inserted as AnalysisRecord, ...prev].slice(0, 10));
    }
  };

  // --- ATS Score Analysis ---
  const runATS = async () => {
    if (!candidate) return;
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 800));

    const checks: { label: string; passed: boolean; weight: number }[] = [
      { label: 'Professional headline', passed: !!candidate.headline, weight: 10 },
      { label: 'Bio / summary', passed: !!candidate.bio && candidate.bio.length > 50, weight: 10 },
      { label: 'Location listed', passed: !!candidate.location, weight: 5 },
      { label: 'At least 3 skills', passed: skills.length >= 3, weight: 15 },
      { label: 'At least 5 skills', passed: skills.length >= 5, weight: 5 },
      { label: 'Education history', passed: education.length > 0, weight: 10 },
      { label: 'Work experience', passed: experiences.length > 0, weight: 15 },
      { label: 'At least 2 experiences', passed: experiences.length >= 2, weight: 5 },
      { label: 'Projects portfolio', passed: projects.length > 0, weight: 10 },
      { label: 'Certifications', passed: certifications.length > 0, weight: 5 },
      { label: 'Resume uploaded', passed: resumes.length > 0, weight: 5 },
      { label: 'GitHub link', passed: !!candidate.github_url, weight: 3 },
      { label: 'LinkedIn link', passed: !!candidate.linkedin_url, weight: 3 },
      { label: 'Portfolio link', passed: !!candidate.portfolio_url, weight: 3 },
    ];

    const totalWeight = checks.reduce((a, c) => a + c.weight, 0);
    const earnedWeight = checks.filter((c) => c.passed).reduce((a, c) => a + c.weight, 0);
    const score = Math.round((earnedWeight / totalWeight) * 100);

    const analysis = {
      score,
      checks,
      missing: checks.filter((c) => !c.passed).map((c) => c.label),
      recommendations: checks.filter((c) => !c.passed).map((c) => `Add ${c.label.toLowerCase()} to improve your ATS score`),
    };

    await persistAnalysis('resume', analysis, { ats: score });
    setAnalyzing(false);
    toast.success('ATS analysis complete');
  };

  // --- Job Match Analysis ---
  const runMatch = async () => {
    if (!candidate || !selectedJobId) { toast.error('Select a job to analyze'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 800));

    const { data: job } = await supabase.from('jobs').select('title, description, qualifications, responsibilities').eq('id', selectedJobId).maybeSingle();
    const { data: jobSkills } = await supabase.from('job_skills').select('skill_id, is_required, skills(name)').eq('job_id', selectedJobId);

    const candidateSkillNames = skills.map((s) => s.skills?.name?.toLowerCase()).filter(Boolean) as string[];
    const jobSkillList = (jobSkills ?? []).map((js) => ({
      name: ((js as Record<string, unknown>).skills as { name: string })?.name ?? '',
      is_required: (js as Record<string, unknown>).is_required as boolean,
    }));

    const requiredSkills = jobSkillList.filter((s) => s.is_required);
    const preferredSkills = jobSkillList.filter((s) => !s.is_required);
    const matchedRequired = requiredSkills.filter((s) => candidateSkillNames.includes(s.name.toLowerCase()));
    const matchedPreferred = preferredSkills.filter((s) => candidateSkillNames.includes(s.name.toLowerCase()));
    const missingRequired = requiredSkills.filter((s) => !candidateSkillNames.includes(s.name.toLowerCase()));
    const missingPreferred = preferredSkills.filter((s) => !candidateSkillNames.includes(s.name.toLowerCase()));

    const reqScore = requiredSkills.length > 0 ? (matchedRequired.length / requiredSkills.length) * 60 : 60;
    const prefScore = preferredSkills.length > 0 ? (matchedPreferred.length / preferredSkills.length) * 20 : 20;
    const expScore = experiences.length >= 2 ? 20 : experiences.length * 10;
    const matchScore = Math.round(reqScore + prefScore + expScore);

    const analysis = {
      job_title: job?.title,
      match_score: matchScore,
      matched_required: matchedRequired.map((s) => s.name),
      matched_preferred: matchedPreferred.map((s) => s.name),
      missing_required: missingRequired.map((s) => s.name),
      missing_preferred: missingPreferred.map((s) => s.name),
      has_experience: experiences.length,
      recommendation: matchScore >= 75 ? 'Strong match — apply with confidence' : matchScore >= 50 ? 'Good match — consider upskilling in missing areas' : 'Gap detected — focus on developing the missing required skills',
    };

    await persistAnalysis('job_match', analysis, { match: matchScore });
    setAnalyzing(false);
    toast.success('Job match analysis complete');
  };

  // --- Skill Gap Analysis ---
  const runGap = async () => {
    if (!candidate || !selectedJobId) { toast.error('Select a job to analyze'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 600));

    const { data: jobSkills } = await supabase.from('job_skills').select('skill_id, is_required, skills(name)').eq('job_id', selectedJobId);
    const candidateSkillNames = skills.map((s) => s.skills?.name?.toLowerCase()).filter(Boolean) as string[];
    const jobSkillList = (jobSkills ?? []).map((js) => ({
      name: ((js as Record<string, unknown>).skills as { name: string })?.name ?? '',
      is_required: (js as Record<string, unknown>).is_required as boolean,
    }));

    const gaps = jobSkillList.filter((s) => !candidateSkillNames.includes(s.name.toLowerCase()));
    const have = jobSkillList.filter((s) => candidateSkillNames.includes(s.name.toLowerCase()));

    const analysis = {
      gaps: gaps.map((s) => ({ skill: s.name, required: s.is_required })),
      have: have.map((s) => s.name),
      gap_count: gaps.length,
      critical_gaps: gaps.filter((s) => s.is_required).map((s) => s.name),
      suggestion: gaps.length === 0 ? 'You have all the skills required for this job!' : `You're missing ${gaps.length} skill${gaps.length === 1 ? '' : 's'}. Focus on: ${gaps.filter((g) => g.is_required).map((g) => g.name).join(', ')}`,
    };

    await persistAnalysis('skill_gap', analysis);
    setAnalyzing(false);
    toast.success('Skill gap analysis complete');
  };

  // --- Cover Letter Generator ---
  const runCoverLetter = async () => {
    if (!candidate || !selectedJobId) { toast.error('Select a job to generate a cover letter'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1000));

    const { data: job } = await supabase.from('jobs').select('title, description, companies ( name )').eq('id', selectedJobId).maybeSingle();
    const companyName = ((job as Record<string, unknown>)?.companies as { name: string } | null)?.name ?? 'the company';
    const jobTitle = job?.title ?? 'the position';

    const topSkills = skills.slice(0, 5).map((s) => s.skills?.name).filter(Boolean).join(', ');
    const recentExp = experiences[0];
    const hasProjects = projects.length > 0;
    const hasCerts = certifications.length > 0;

    const letter = `Dear Hiring Manager,

I am excited to apply for the ${jobTitle} position at ${companyName}. With ${experiences.length} year${experiences.length === 1 ? '' : 's'} of experience${recentExp ? ` as a ${recentExp.role} at ${recentExp.company}` : ''}${candidate.degree ? ` and a ${candidate.degree} in ${candidate.department ?? 'my field'}` : ''}, I am confident that my background aligns well with this role.

${topSkills ? `My core skills include ${topSkills}. ` : ''}${hasProjects ? `I have built ${projects.length} project${projects.length === 1 ? '' : 's'} that demonstrate my ability to apply these skills in practice. ` : ''}${hasCerts ? `I hold ${certifications.length} certification${certifications.length === 1 ? '' : 's'} including ${certifications[0].name}, which reinforces my expertise. ` : ''}

I am particularly drawn to ${companyName} because of the opportunity to contribute meaningfully while growing professionally. I would welcome the chance to discuss how my experience and skills can add value to your team.

Thank you for your consideration. I look forward to hearing from you.

Sincerely,
${profile?.full_name}`;

    setCoverLetter(letter);
    await persistAnalysis('cover_letter', { job_title: jobTitle, company: companyName, letter });
    setAnalyzing(false);
    toast.success('Cover letter generated');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!candidate) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">AI Career Assistant</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Complete your profile first</p>
            <p className="text-sm text-muted-foreground">Set up your candidate profile to unlock AI-powered career tools.</p>
            <Button asChild className="mt-2"><Link href="/candidate/profile">Create profile</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'ats' as const, label: 'Resume ATS Score', icon: FileText, desc: 'Evaluate your profile against ATS criteria' },
    { id: 'match' as const, label: 'Job Match', icon: Target, desc: 'See how well you match a specific job' },
    { id: 'gap' as const, label: 'Skill Gap', icon: TrendingUp, desc: 'Identify missing skills for a target job' },
    { id: 'cover' as const, label: 'Cover Letter', icon: PenLine, desc: 'Generate a tailored cover letter' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">AI Career Assistant</h1>
        <p className="mt-1 text-muted-foreground">Analyze your profile, match with jobs, and generate application materials</p>
      </div>

      {/* Tool tabs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setResult(null); setCoverLetter(''); }}
              className={`text-left rounded-xl border p-4 transition-all ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30 hover:shadow-sm'}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 font-medium">{t.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Job selector for match/gap/cover */}
      {(activeTab === 'match' || activeTab === 'gap' || activeTab === 'cover') && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1 space-y-2">
                <Label>Select a job to analyze</Label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger><SelectValue placeholder="Choose from active job postings" /></SelectTrigger>
                  <SelectContent>
                    {jobOptions.length === 0 ? (
                      <SelectItem value="none" disabled>No active jobs available</SelectItem>
                    ) : jobOptions.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title} — {j.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={activeTab === 'match' ? runMatch : activeTab === 'gap' ? runGap : runCoverLetter} disabled={analyzing || !selectedJobId} className="sm:mt-8">
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {activeTab === 'match' ? 'Analyze match' : activeTab === 'gap' ? 'Analyze gaps' : 'Generate letter'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ATS tab */}
      {activeTab === 'ats' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> Resume ATS Score</CardTitle>
            <CardDescription>Evaluate your profile against standard Applicant Tracking System criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={runATS} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Run ATS analysis
            </Button>
            {result?.ats_score != null && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/20">
                    <span className="font-display text-2xl font-bold text-primary">{result.ats_score}</span>
                  </div>
                  <div>
                    <p className="font-medium">
                      {result.ats_score >= 80 ? 'Excellent ATS score' : result.ats_score >= 60 ? 'Good ATS score' : 'Needs improvement'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.ats_score >= 80 ? 'Your profile passes most ATS checks.' : 'Fill in the missing sections below to improve.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {((result.analysis as { checks: { label: string; passed: boolean }[] }).checks ?? []).map((c, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      {c.passed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-destructive" />}
                      <span className="flex-1 text-sm">{c.label}</span>
                    </div>
                  ))}
                </div>
                {((result.analysis as { missing: string[] }).missing ?? []).length > 0 && (
                  <div className="rounded-lg border border-warning/40 bg-warning/5 p-4">
                    <p className="flex items-center gap-2 font-medium text-sm"><AlertCircle className="h-4 w-4 text-warning" /> Missing sections</p>
                    <p className="mt-1 text-sm text-muted-foreground">{(result.analysis as { missing: string[] }).missing.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Match tab */}
      {activeTab === 'match' && result?.match_score != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> Job Match Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-5">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary/20">
                <span className="font-display text-2xl font-bold text-primary">{result.match_score}%</span>
              </div>
              <div>
                <p className="font-medium">
                  {result.match_score >= 75 ? 'Strong match' : result.match_score >= 50 ? 'Good match' : 'Gap detected'}
                </p>
                <p className="text-sm text-muted-foreground">{(result.analysis as { recommendation: string }).recommendation}</p>
              </div>
            </div>
            <Progress value={result.match_score} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-success">Matched skills</p>
                {((result.analysis as { matched_required: string[] }).matched_required ?? []).map((s, i) => (
                  <Badge key={i} variant="secondary" className="mr-1.5 gap-1 bg-success/15 text-success"><CheckCircle2 className="h-3 w-3" /> {s}</Badge>
                ))}
                {((result.analysis as { matched_preferred: string[] }).matched_preferred ?? []).map((s, i) => (
                  <Badge key={`p${i}`} variant="secondary" className="mr-1.5 gap-1 bg-primary/15 text-primary"><CheckCircle2 className="h-3 w-3" /> {s}</Badge>
                ))}
                {((result.analysis as { matched_required: string[] }).matched_required ?? []).length === 0 && ((result.analysis as { matched_preferred: string[] }).matched_preferred ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No matching skills found.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Missing skills</p>
                {((result.analysis as { missing_required: string[] }).missing_required ?? []).map((s, i) => (
                  <Badge key={i} variant="secondary" className="mr-1.5 gap-1 bg-destructive/15 text-destructive"><XCircle className="h-3 w-3" /> {s}</Badge>
                ))}
                {((result.analysis as { missing_preferred: string[] }).missing_preferred ?? []).map((s, i) => (
                  <Badge key={`p${i}`} variant="secondary" className="mr-1.5 gap-1 bg-warning/15 text-warning"><AlertCircle className="h-3 w-3" /> {s}</Badge>
                ))}
                {((result.analysis as { missing_required: string[] }).missing_required ?? []).length === 0 && ((result.analysis as { missing_preferred: string[] }).missing_preferred ?? []).length === 0 && (
                  <p className="text-sm text-success">You have all required and preferred skills!</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gap tab */}
      {activeTab === 'gap' && result?.analysis_type === 'skill_gap' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" /> Skill Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm">{(result.analysis as { suggestion: string }).suggestion}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium text-success">Skills you have ({((result.analysis as { have: string[] }).have ?? []).length})</p>
                <div className="flex flex-wrap gap-2">
                  {((result.analysis as { have: string[] }).have ?? []).map((s, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 bg-success/15 text-success"><CheckCircle2 className="h-3 w-3" /> {s}</Badge>
                  ))}
                  {((result.analysis as { have: string[] }).have ?? []).length === 0 && <p className="text-sm text-muted-foreground">None matched.</p>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">Skills to develop ({((result.analysis as { gaps: { skill: string; required: boolean }[] }).gaps ?? []).length})</p>
                <div className="flex flex-wrap gap-2">
                  {((result.analysis as { gaps: { skill: string; required: boolean }[] }).gaps ?? []).map((g, i) => (
                    <Badge key={i} variant="secondary" className={g.required ? 'gap-1 bg-destructive/15 text-destructive' : 'gap-1 bg-warning/15 text-warning'}>
                      <XCircle className="h-3 w-3" /> {g.skill} {g.required ? '(required)' : '(preferred)'}
                    </Badge>
                  ))}
                  {((result.analysis as { gaps: { skill: string; required: boolean }[] }).gaps ?? []).length === 0 && <p className="text-sm text-success">No gaps — you have everything!</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cover letter tab */}
      {activeTab === 'cover' && coverLetter && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg"><PenLine className="h-5 w-5 text-primary" /> Generated Cover Letter</CardTitle>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(coverLetter)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={18} className="font-mono text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">Edit the letter above before using it in your application.</p>
          </CardContent>
        </Card>
      )}

      {/* Profile strength summary */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-5 w-5 text-accent" /> Your profile at a glance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary">{candidate.profile_completion}%</p>
              <p className="text-xs text-muted-foreground">Profile completion</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary">{skills.length}</p>
              <p className="text-xs text-muted-foreground">Skills</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary">{experiences.length}</p>
              <p className="text-xs text-muted-foreground">Experiences</p>
            </div>
            <div className="text-center">
              <p className="font-display text-2xl font-bold text-primary">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent AI analyses</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {h.analysis_type === 'resume' ? <FileText className="h-4 w-4" /> : h.analysis_type === 'job_match' ? <Target className="h-4 w-4" /> : h.analysis_type === 'skill_gap' ? <TrendingUp className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium capitalize">{h.analysis_type.replace('_', ' ')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {h.match_score != null && <Badge variant="secondary" className="bg-primary/15 text-primary">{h.match_score}% match</Badge>}
                    {h.ats_score != null && <Badge variant="secondary" className="bg-accent/15 text-accent">{h.ats_score} ATS</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
