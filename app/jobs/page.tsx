'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin, TrendingUp, Briefcase, Filter, X } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  location: string | null;
  job_type: string;
  work_mode: string;
  salary_min: number | null;
  salary_max: number | null;
  experience_level: string;
  created_at: string;
  companies: { name: string; logo_url: string | null } | null;
};

function JobsContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [jobType, setJobType] = useState<string>('all');
  const [workMode, setWorkMode] = useState<string>('all');
  const [experience, setExperience] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    (async () => {
      let query = supabase
        .from('jobs')
        .select(`id, title, location, job_type, work_mode, salary_min, salary_max, experience_level, created_at, companies ( name, logo_url )`)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (q.trim()) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }
      if (jobType !== 'all') query = query.eq('job_type', jobType);
      if (workMode !== 'all') query = query.eq('work_mode', workMode);
      if (experience !== 'all') query = query.eq('experience_level', experience);

      const { data } = await query.limit(50);
      setJobs((data as unknown as Job[]) ?? []);
      setLoading(false);
    })();
  }, [q, jobType, workMode, experience]);

  const fmtSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Competitive';
    const fmt = (n: number) => `$${(n / 1000).toFixed(0)}k`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    return min ? `From ${fmt(min)}` : `Up to ${fmt(max ?? 0)}`;
  };

  const clearFilters = () => {
    setQ('');
    setJobType('all');
    setWorkMode('all');
    setExperience('all');
  };

  const hasFilters = q || jobType !== 'all' || workMode !== 'all' || experience !== 'all';

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <div className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Browse jobs</h1>
          <p className="mt-1 text-muted-foreground">Find your next role or internship</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or keyword"
              className="pl-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Job type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="internship">Internship</SelectItem>
            </SelectContent>
          </Select>
          <Select value={workMode} onValueChange={setWorkMode}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Work mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
            </SelectContent>
          </Select>
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="entry">Entry</SelectItem>
              <SelectItem value="junior">Junior</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="senior">Senior</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-1 h-4 w-4" /> Clear
            </Button>
          )}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {loading ? 'Loading…' : `${jobs.length} job${jobs.length === 1 ? '' : 's'} found`}
        </p>

        {/* Results */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="group h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 rounded-lg">
                        <AvatarImage src={job.companies?.logo_url ?? undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
                          {job.companies?.name?.[0] ?? 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{job.companies?.name}</p>
                        <p className="text-xs text-muted-foreground">{job.location}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                      {job.job_type.replace('_', '-')}
                    </Badge>
                  </div>
                  <h3 className="mt-4 font-semibold group-hover:text-primary">{job.title}</h3>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.work_mode}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" /> {fmtSalary(job.salary_min, job.salary_max)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" /> {job.experience_level}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {!loading && jobs.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Filter className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No jobs match your filters</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search.</p>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <JobsContent />
    </Suspense>
  );
}
