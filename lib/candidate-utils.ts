'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export type CandidateProfile = {
  id: string;
  user_id: string;
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

export function useCandidate() {
  const { profile } = useAuth();
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data } = await supabase
      .from('candidate_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle();
    setCandidate(data as CandidateProfile | null);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { candidate, loading, reload: load };
}

export function calculateCompletion(fields: {
  headline?: string | null;
  bio?: string | null;
  college?: string | null;
  degree?: string | null;
  department?: string | null;
  graduation_year?: number | null;
  location?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  skillsCount?: number;
  educationCount?: number;
  experienceCount?: number;
  projectCount?: number;
  certCount?: number;
  resumeCount?: number;
}): number {
  const checks: boolean[] = [
    !!fields.headline,
    !!fields.bio,
    !!fields.college,
    !!fields.degree,
    !!fields.department,
    !!fields.graduation_year,
    !!fields.location,
    !!fields.github_url,
    !!fields.linkedin_url,
    !!fields.portfolio_url,
    (fields.skillsCount ?? 0) > 0,
    (fields.educationCount ?? 0) > 0,
    (fields.experienceCount ?? 0) > 0,
    (fields.projectCount ?? 0) > 0,
    (fields.certCount ?? 0) > 0,
    (fields.resumeCount ?? 0) > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export async function updateCompletion(candidateId: string) {
  const [cp, skills, edu, exp, proj, cert, resumes] = await Promise.all([
    supabase.from('candidate_profiles').select('*').eq('id', candidateId).maybeSingle(),
    supabase.from('candidate_skills').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('education').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('experiences').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('certifications').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
    supabase.from('resumes').select('id', { count: 'exact', head: true }).eq('candidate_id', candidateId),
  ]);

  const data = cp.data as CandidateProfile | null;
  if (!data) return;

  const score = calculateCompletion({
    headline: data.headline,
    bio: data.bio,
    college: data.college,
    degree: data.degree,
    department: data.department,
    graduation_year: data.graduation_year,
    location: data.location,
    github_url: data.github_url,
    linkedin_url: data.linkedin_url,
    portfolio_url: data.portfolio_url,
    skillsCount: skills.count ?? 0,
    educationCount: edu.count ?? 0,
    experienceCount: exp.count ?? 0,
    projectCount: proj.count ?? 0,
    certCount: cert.count ?? 0,
    resumeCount: resumes.count ?? 0,
  });

  await supabase.from('candidate_profiles').update({ profile_completion: score }).eq('id', candidateId);
}
