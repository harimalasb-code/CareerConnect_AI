'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, ShieldCheck, Building2 } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  location: string | null;
  industry: string | null;
  company_size: string | null;
  is_verified: boolean;
  description: string | null;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, logo_url, location, industry, company_size, is_verified, description')
        .order('created_at', { ascending: false });
      setCompanies(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <div className="container mx-auto flex-1 px-4 py-10">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Companies</h1>
          <p className="mt-1 text-muted-foreground">Discover employers hiring on CareerConnect AI</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link key={c.id} href={`/companies/${c.id}`}>
              <Card className="group h-full transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14 rounded-xl">
                      <AvatarImage src={c.logo_url ?? undefined} />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                        {c.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold group-hover:text-primary">{c.name}</h3>
                        {c.is_verified && (
                          <ShieldCheck className="h-4 w-4 text-success" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{c.industry}</p>
                    </div>
                  </div>
                  <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">
                    {c.description ?? 'No description available.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.location && (
                      <Badge variant="secondary" className="gap-1">
                        <MapPin className="h-3 w-3" /> {c.location}
                      </Badge>
                    )}
                    {c.company_size && (
                      <Badge variant="secondary" className="gap-1">
                        <Building2 className="h-3 w-3" /> {c.company_size}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {!loading && companies.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-medium">No companies yet</p>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
