'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sparkles, FileText, Users, MessageSquare, Wand2, Loader2,
  Copy, CheckCircle2, ArrowRight, Briefcase, Star, Target,
} from 'lucide-react';
import { toast } from 'sonner';

type JobOption = { id: string; title: string };
type Applicant = {
  id: string;
  status: string;
  candidate_id: string;
  candidates: {
    user_id: string;
    headline: string | null;
    location: string | null;
    profile_completion: number;
    profiles: { full_name: string; avatar_url: string | null; email: string } | null;
    candidate_skills: { skill_id: string; skills: { name: string } | null }[];
    experiences: { id: string; company: string; role: string }[];
  } | null;
};

export default function RecruiterAIPage() {
  const { profile } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'jd' | 'screen' | 'questions'>('jd');
  const [analyzing, setAnalyzing] = useState(false);

  // JD generator
  const [jdJobTitle, setJdJobTitle] = useState('');
  const [jdJobType, setJdJobType] = useState('full_time');
  const [jdWorkMode, setJdWorkMode] = useState('remote');
  const [jdExperience, setJdExperience] = useState('mid');
  const [jdSkills, setJdSkills] = useState('');
  const [generatedJD, setGeneratedJD] = useState('');

  // Screening
  const [screenJobId, setScreenJobId] = useState('');
  const [jobOptions, setJobOptions] = useState<JobOption[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [rankedApplicants, setRankedApplicants] = useState<{ applicant: Applicant; score: number; matchedSkills: string[]; missingSkills: string[]; reasons: string[] }[]>([]);

  // Interview questions
  const [qJobId, setQJobId] = useState('');
  const [qType, setQType] = useState('technical');
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: compList } = await supabase.from('companies').select('id').eq('recruiter_id', profile.id).order('created_at', { ascending: true }).limit(1);
    const comp = compList && compList.length > 0 ? compList[0] : null;
    setCompanyId(comp?.id ?? null);
    if (comp) {
      const { data: jobs } = await supabase.from('jobs').select('id, title').eq('company_id', comp.id).order('created_at', { ascending: false });
      setJobOptions(jobs ?? []);
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  // --- Job Description Generator ---
  const runJDGenerator = async () => {
    if (!jdJobTitle.trim()) { toast.error('Enter a job title'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1000));

    const skillsList = jdSkills.split(',').map((s) => s.trim()).filter(Boolean);
    const typeLabel = { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship' }[jdJobType] ?? 'Full-time';
    const expLabel = { entry: 'Entry-level', junior: 'Junior', mid: 'Mid-level', senior: 'Senior', lead: 'Lead' }[jdExperience] ?? 'Mid-level';

    const desc = `## ${jdJobTitle}

**Job Type:** ${typeLabel}
**Work Mode:** ${jdWorkMode.charAt(0).toUpperCase() + jdWorkMode.slice(1)}
**Experience Level:** ${expLabel}

### About the Role
We are seeking a ${expLabel.toLowerCase()} ${jdJobTitle} to join our growing team. In this role, you will be responsible for delivering high-quality work, collaborating with cross-functional teams, and contributing to key projects that drive our business forward.

### Key Responsibilities
- Lead and contribute to ${jdJobTitle.toLowerCase()} initiatives from concept to delivery
- Collaborate with product, design, and engineering teams to define requirements
- Write clean, maintainable, and well-tested code / deliverables
- Participate in code reviews and provide constructive feedback
- Identify and resolve technical challenges proactively
- Mentor junior team members and share knowledge

### Qualifications
${skillsList.length > 0 ? skillsList.map((s, i) => `${i < 3 ? 'Required' : 'Preferred'}: ${s}`).join('\n') : "- Relevant experience in the field\n- Strong problem-solving skills\n- Excellent communication abilities"}

### What We Offer
- Competitive salary and benefits
- Flexible working arrangements
- Professional development opportunities
- Collaborative and inclusive work environment
- Health, dental, and vision coverage

### How to Apply
Submit your resume and a brief cover letter describing your relevant experience and why you'd be a great fit for this role.`;

    setGeneratedJD(desc);

    if (companyId) {
      await supabase.from('ai_analyses').insert({
        job_id: null,
        analysis_type: 'job_description',
        analysis: { title: jdJobTitle, job_type: jdJobType, work_mode: jdWorkMode, experience: jdExperience, skills: skillsList, generated: desc },
      });
    }

    setAnalyzing(false);
    toast.success('Job description generated');
  };

  // --- Candidate Screening ---
  const loadApplicants = useCallback(async () => {
    if (!screenJobId) return;
    setAnalyzing(true);
    const { data: apps } = await supabase
      .from('applications')
      .select(`id, status, candidate_id, candidates ( user_id, headline, location, profile_completion, profiles ( full_name, avatar_url, email ), candidate_skills ( skill_id, skills ( name ) ), experiences ( id, company, role ) )`)
      .eq('job_id', screenJobId)
      .order('applied_at', { ascending: false });
    setApplicants(apps as unknown as Applicant[] ?? []);

    // Get job skills
    const { data: jobSkills } = await supabase.from('job_skills').select('skill_id, is_required, skills(name)').eq('job_id', screenJobId);
    const requiredSkillNames = (jobSkills ?? []).filter((js) => (js as Record<string, unknown>).is_required).map((js) => ((js as Record<string, unknown>).skills as { name: string })?.name?.toLowerCase()).filter(Boolean) as string[];
    const allJobSkillNames = (jobSkills ?? []).map((js) => ((js as Record<string, unknown>).skills as { name: string })?.name?.toLowerCase()).filter(Boolean) as string[];

    // Rank applicants
    const ranked = (apps as unknown as Applicant[] ?? []).map((app) => {
      const candidateSkills = (app.candidates?.candidate_skills ?? []).map((cs) => cs.skills?.name?.toLowerCase()).filter(Boolean) as string[];
      const matched = allJobSkillNames.filter((s) => candidateSkills.includes(s));
      const missing = requiredSkillNames.filter((s) => !candidateSkills.includes(s));
      const expCount = app.candidates?.experiences?.length ?? 0;
      const completion = app.candidates?.profile_completion ?? 0;

      const skillScore = allJobSkillNames.length > 0 ? (matched.length / allJobSkillNames.length) * 50 : 25;
      const expScore = Math.min(expCount * 10, 25);
      const profileScore = (completion / 100) * 15;
      const statusScore = ['shortlisted', 'interview', 'selected'].includes(app.status) ? 10 : 0;
      const totalScore = Math.round(skillScore + expScore + profileScore + statusScore);

      const reasons: string[] = [];
      if (matched.length > 0) reasons.push(`Matches ${matched.length} skill${matched.length === 1 ? '' : 's'}`);
      if (expCount >= 2) reasons.push(`${expCount} past role${expCount === 1 ? '' : 's'}`);
      if (completion >= 80) reasons.push('Strong profile');
      if (missing.length > 0) reasons.push(`Missing ${missing.length} required skill${missing.length === 1 ? '' : 's'}`);

      return { applicant: app, score: totalScore, matchedSkills: matched, missingSkills: missing, reasons };
    }).sort((a, b) => b.score - a.score);

    setRankedApplicants(ranked);
    setAnalyzing(false);
  }, [screenJobId]);

  useEffect(() => {
    if (screenJobId) loadApplicants();
  }, [screenJobId, loadApplicants]);

  const runScreening = async () => {
    if (!screenJobId) { toast.error('Select a job'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 600));
    await loadApplicants();

    if (companyId) {
      await supabase.from('ai_analyses').insert({
        job_id: screenJobId,
        analysis_type: 'screening',
        analysis: { ranked_count: rankedApplicants.length, top_score: rankedApplicants[0]?.score ?? 0 },
      });
    }
    setAnalyzing(false);
    toast.success('Candidate screening complete');
  };

  // --- Interview Question Generator ---
  const runQuestions = async () => {
    if (!qJobId) { toast.error('Select a job'); return; }
    setAnalyzing(true);
    await new Promise((r) => setTimeout(r, 1000));

    const { data: job } = await supabase.from('jobs').select('title, description, qualifications').eq('id', qJobId).maybeSingle();
    const { data: jobSkills } = await supabase.from('job_skills').select('skill_id, skills(name)').eq('job_id', qJobId);
    const skillNames = (jobSkills ?? []).map((js) => ((js as Record<string, unknown>).skills as { name: string })?.name).filter(Boolean) as string[];
    const jobTitle = job?.title ?? 'this role';

    let questions: string[] = [];
    if (qType === 'technical') {
      questions = [
        `Can you walk us through your experience with ${skillNames.slice(0, 3).join(', ') ?? 'the core technologies'} for this role?`,
        `Describe a challenging technical problem you solved related to ${jobTitle}. What was your approach?`,
        skillNames.length > 0 ? `How would you assess your proficiency in ${skillNames[0]}? Can you give an example of a project where you used it?` : `What technical skills do you bring that are most relevant to the ${jobTitle} position?`,
        `How do you stay current with developments in ${skillNames[0] ?? 'your field'}?`,
        `Tell us about a time you had to learn a new technology quickly. How did you approach it?`,
        `What's your approach to testing and ensuring code quality?`,
        `Describe your experience working in an agile development environment.`,
        `How do you handle technical debt in your projects?`,
      ];
    } else if (qType === 'behavioral') {
      questions = [
        `Tell us about a time you had to work with a difficult team member. How did you handle it?`,
        `Describe a situation where you had to meet a tight deadline. What was your strategy?`,
        `Can you share an example of when you took initiative on a project?`,
        `Tell us about a mistake you made and what you learned from it.`,
        `How do you prioritize tasks when everything seems urgent?`,
        `Describe a time you received critical feedback. How did you respond?`,
        `Tell us about your proudest professional achievement.`,
        `How do you handle ambiguity in project requirements?`,
      ];
    } else {
      questions = [
        `What interests you most about the ${jobTitle} role at our company?`,
        `Where do you see your career heading in the next 3-5 years?`,
        `What makes you stand out from other candidates for this position?`,
        `How does this role align with your long-term career goals?`,
        `What are your salary expectations for this position?`,
        `When would you be available to start if offered this role?`,
        `Do you have any questions about the role or our company?`,
        `What kind of work environment do you thrive in?`,
      ];
    }

    setGeneratedQuestions(questions);

    if (companyId) {
      await supabase.from('ai_analyses').insert({
        job_id: qJobId,
        analysis_type: 'interview_questions',
        analysis: { job_title: jobTitle, question_type: qType, questions },
      });
    }

    setAnalyzing(false);
    toast.success('Interview questions generated');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!companyId) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold md:text-3xl">AI Recruiting Tools</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Sparkles className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">Set up your company first</p>
            <p className="text-sm text-muted-foreground">Create a company profile to access AI recruiting tools.</p>
            <Button asChild className="mt-2"><a href="/recruiter/company">Create company profile</a></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'jd' as const, label: 'Job Description', icon: FileText, desc: 'Generate a professional job posting' },
    { id: 'screen' as const, label: 'Candidate Screening', icon: Users, desc: 'AI-rank applicants by fit score' },
    { id: 'questions' as const, label: 'Interview Questions', icon: MessageSquare, desc: 'Generate tailored interview questions' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">AI Recruiting Tools</h1>
        <p className="mt-1 text-muted-foreground">Generate job descriptions, screen candidates, and prepare interview questions</p>
      </div>

      {/* Tool tabs */}
      <div className="grid gap-3 sm:grid-cols-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
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

      {/* JD Generator */}
      {activeTab === 'jd' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-primary" /> Job Description Generator</CardTitle>
            <CardDescription>Fill in the details and generate a professional job posting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="jdTitle">Job title <span className="text-destructive">*</span></Label>
                <Input id="jdTitle" placeholder="Senior Backend Engineer" value={jdJobTitle} onChange={(e) => setJdJobTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Job type</Label>
                <Select value={jdJobType} onValueChange={setJdJobType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Work mode</Label>
                <Select value={jdWorkMode} onValueChange={setJdWorkMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Experience level</Label>
                <Select value={jdExperience} onValueChange={setJdExperience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entry">Entry-level</SelectItem>
                    <SelectItem value="junior">Junior</SelectItem>
                    <SelectItem value="mid">Mid-level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jdSkills">Key skills (comma-separated)</Label>
              <Input id="jdSkills" placeholder="React, TypeScript, Node.js, AWS, PostgreSQL" value={jdSkills} onChange={(e) => setJdSkills(e.target.value)} />
            </div>
            <Button onClick={runJDGenerator} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate job description
            </Button>
            {generatedJD && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Generated description</p>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedJD)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
                </div>
                <Textarea value={generatedJD} onChange={(e) => setGeneratedJD(e.target.value)} rows={20} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">Edit the text above, then copy it into a new job posting.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Candidate Screening */}
      {activeTab === 'screen' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Users className="h-5 w-5 text-primary" /> AI Candidate Screening</CardTitle>
            <CardDescription>Automatically rank applicants by match score based on skills, experience, and profile strength</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label>Select a job</Label>
                <Select value={screenJobId} onValueChange={setScreenJobId}>
                  <SelectTrigger><SelectValue placeholder="Choose a job posting" /></SelectTrigger>
                  <SelectContent>
                    {jobOptions.length === 0 ? <SelectItem value="none" disabled>No jobs available</SelectItem> : jobOptions.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runScreening} disabled={analyzing || !screenJobId}>
                {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Screen candidates
              </Button>
            </div>

            {rankedApplicants.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  {rankedApplicants.length} candidate{rankedApplicants.length === 1 ? '' : 's'} ranked by AI fit score
                </div>
                {rankedApplicants.map((r, idx) => (
                  <div key={r.applicant.id} className="flex items-center gap-4 rounded-xl border border-border p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {idx + 1}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.applicant.candidates?.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">{r.applicant.candidates?.profiles?.full_name?.[0] ?? 'C'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{r.applicant.candidates?.profiles?.full_name ?? 'Candidate'}</p>
                        {idx === 0 && r.score >= 60 && <Badge variant="secondary" className="gap-1 bg-success/15 text-success"><Star className="h-3 w-3" /> Top pick</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.applicant.candidates?.headline}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {r.reasons.map((reason, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{reason}</Badge>
                        ))}
                      </div>
                      {r.matchedSkills.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {r.matchedSkills.slice(0, 5).map((s, i) => (
                            <Badge key={i} variant="secondary" className="gap-1 bg-success/15 text-success text-xs"><CheckCircle2 className="h-2.5 w-2.5" /> {s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary/20">
                        <span className="font-display text-lg font-bold text-primary">{r.score}</span>
                      </div>
                      <span className="mt-1 text-xs text-muted-foreground">fit score</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {screenJobId && rankedApplicants.length === 0 && !analyzing && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium">No applicants for this job yet</p>
                <p className="text-sm text-muted-foreground">Once candidates apply, run screening to rank them by fit.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interview Questions */}
      {activeTab === 'questions' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MessageSquare className="h-5 w-5 text-primary" /> Interview Question Generator</CardTitle>
            <CardDescription>Generate tailored interview questions based on the job's required skills</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Select a job</Label>
                <Select value={qJobId} onValueChange={setQJobId}>
                  <SelectTrigger><SelectValue placeholder="Choose a job posting" /></SelectTrigger>
                  <SelectContent>
                    {jobOptions.length === 0 ? <SelectItem value="none" disabled>No jobs available</SelectItem> : jobOptions.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Question type</Label>
                <Select value={qType} onValueChange={setQType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="behavioral">Behavioral</SelectItem>
                    <SelectItem value="general">General / Fit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={runQuestions} disabled={analyzing || !qJobId}>
              {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate questions
            </Button>
            {generatedQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{generatedQuestions.length} questions generated</p>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(generatedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'))}>
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy all
                  </Button>
                </div>
                <div className="space-y-2">
                  {generatedQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                      <p className="text-sm">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
