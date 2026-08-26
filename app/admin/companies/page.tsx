'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Search, CheckCircle2, XCircle, ExternalLink, Loader2, Globe, MapPin } from 'lucide-react';
import { toast } from 'sonner';

type CompanyRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  location: string | null;
  industry: string | null;
  company_size: string | null;
  is_verified: boolean;
  created_at: string;
  job_count: number;
  recruiter_name: string | null;
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data: compList } = await supabase
      .from('companies')
      .select(`id, name, logo_url, website, location, industry, company_size, is_verified, created_at, recruiter_id, profiles!companies_recruiter_id_fkey ( full_name )`)
      .order('created_at', { ascending: false });

    // Get job counts per company
    const compIds = (compList ?? []).map((c) => c.id);
    let jobCounts: Record<string, number> = {};
    if (compIds.length > 0) {
      const { data: jobs } = await supabase.from('jobs').select('company_id').in('company_id', compIds);
      jobCounts = (jobs ?? []).reduce((acc, j) => {
        const cid = (j as Record<string, unknown>).company_id as string;
        acc[cid] = (acc[cid] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    setCompanies(
      (compList ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        logo_url: c.logo_url,
        website: c.website,
        location: c.location,
        industry: c.industry,
        company_size: c.company_size,
        is_verified: c.is_verified,
        created_at: c.created_at,
        job_count: jobCounts[c.id] ?? 0,
        recruiter_name: ((c as Record<string, unknown>).profiles as { full_name: string } | null)?.full_name ?? null,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleVerify = async (company: CompanyRow) => {
    const { error } = await supabase.from('companies').update({ is_verified: !company.is_verified }).eq('id', company.id);
    if (error) { toast.error(error.message); return; }
    setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, is_verified: !company.is_verified } : c)));
    toast.success(company.is_verified ? 'Company unverified' : 'Company verified');
  };

  const filtered = companies.filter((c) => {
    const matchesFilter = filter === 'all' || (filter === 'verified' && c.is_verified) || (filter === 'pending' && !c.is_verified);
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const pendingCount = companies.filter((c) => !c.is_verified).length;
  const verifiedCount = companies.filter((c) => c.is_verified).length;

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Companies</h1>
        <p className="mt-1 text-muted-foreground">Verify and manage all companies on the platform</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({companies.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedCount})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No companies found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id} className="transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarImage src={c.logo_url ?? undefined} />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary">{c.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/companies/${c.id}`} className="font-medium hover:text-primary">{c.name}</Link>
                      {c.recruiter_name && <p className="text-xs text-muted-foreground">by {c.recruiter_name}</p>}
                    </div>
                  </div>
                  {c.is_verified ? (
                    <Badge className="gap-1 bg-success/15 text-success"><CheckCircle2 className="h-3 w-3" /> Verified</Badge>
                  ) : (
                    <Badge className="gap-1 bg-warning/15 text-warning"><XCircle className="h-3 w-3" /> Pending</Badge>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {c.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.location}</span>}
                  {c.industry && <span>{c.industry}</span>}
                  {c.company_size && <span>{c.company_size} employees</span>}
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary"><Globe className="h-3 w-3" /> Website</a>}
                  <span>{c.job_count} job{c.job_count === 1 ? '' : 's'}</span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant={c.is_verified ? 'outline' : 'default'} onClick={() => toggleVerify(c)}>
                    {c.is_verified ? <><XCircle className="mr-1 h-3.5 w-3.5" /> Unverify</> : <><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Verify</>}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href={`/companies/${c.id}`}><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
