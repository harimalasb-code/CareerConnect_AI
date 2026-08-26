'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Building2, ShieldCheck, Briefcase, Star, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type Company = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  location: string | null;
  industry: string | null;
  company_size: string | null;
  is_verified: boolean;
  description: string | null;
};

type Job = { id: string; title: string; job_type: string; work_mode: string; location: string | null };

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
  reviewer_name: string | null;
};

function Stars({ rating, size = 'h-3.5 w-3.5' }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const { user, profile } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [existingReview, setExistingReview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: comp } = await supabase
        .from('companies')
        .select('id, name, logo_url, website, location, industry, company_size, is_verified, description')
        .eq('id', params.id)
        .maybeSingle();
      setCompany(comp as Company | null);

      const { data: jobList } = await supabase
        .from('jobs')
        .select('id, title, job_type, work_mode, location')
        .eq('company_id', params.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      setJobs(jobList ?? []);

      const { data: revList } = await supabase
        .from('company_reviews')
        .select(`id, rating, title, body, created_at, reviewer_id, profiles!company_reviews_reviewer_id_fkey ( full_name )`)
        .eq('company_id', params.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      setReviews(
        (revList ?? []).map((r) => {
          const obj = r as Record<string, unknown>;
          return {
            id: obj.id as string,
            rating: obj.rating as number,
            title: (obj.title as string | null) ?? null,
            body: (obj.body as string | null) ?? null,
            created_at: obj.created_at as string,
            reviewer_name: ((obj.profiles as { full_name: string } | null)?.full_name) ?? 'Anonymous',
          };
        }),
      );

      if (user) {
        const { data: myRev } = await supabase
          .from('company_reviews')
          .select('id')
          .eq('company_id', params.id)
          .eq('reviewer_id', user.id)
          .maybeSingle();
        setExistingReview(!!myRev);
      }

      setLoading(false);
    })();
  }, [params.id, user]);

  const submitReview = async () => {
    if (!user) { toast.error('Please sign in to leave a review'); return; }
    setSubmitting(true);
    const { error } = await supabase.from('company_reviews').insert({
      company_id: params.id,
      reviewer_id: user.id,
      rating,
      title: reviewTitle.trim() || null,
      body: reviewBody.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      if (error.code === '23505') {
        toast.error('You have already reviewed this company');
        setExistingReview(true);
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success('Review submitted! It will appear once approved by moderation.');
    setReviewOpen(false);
    setReviewTitle('');
    setReviewBody('');
    setRating(5);
    setExistingReview(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicNav />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-screen flex-col">
        <PublicNav />
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Building2 className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Company not found</p>
          <Button asChild variant="outline">
            <Link href="/companies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to companies</Link>
          </Button>
        </div>
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <div className="container mx-auto flex-1 px-4 py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/companies"><ArrowLeft className="mr-2 h-4 w-4" /> Back to companies</Link>
        </Button>

        <Card className="mb-8">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-start">
              <Avatar className="h-20 w-20 rounded-2xl">
                <AvatarImage src={company.logo_url ?? undefined} />
                <AvatarFallback className="rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                  {company.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-3xl font-bold">{company.name}</h1>
                  {company.is_verified && (
                    <Badge className="gap-1 bg-success/15 text-success"><ShieldCheck className="h-3.5 w-3.5" /> Verified</Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {company.industry && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" /> {company.industry}</span>}
                  {company.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {company.location}</span>}
                  {company.company_size && <span>{company.company_size} employees</span>}
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Visit website
                    </a>
                  )}
                </div>
                {reviews.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Stars rating={Math.round(avgRating)} size="h-4 w-4" />
                    <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                  </div>
                )}
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  {company.description ?? 'No description available.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> Reviews ({reviews.length})
            </h2>
            {user && profile?.role !== 'recruiter' && (
              existingReview ? (
                <Badge variant="secondary">You&apos;ve reviewed this company</Badge>
              ) : (
                <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><Star className="mr-2 h-4 w-4" /> Write a Review</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Review {company.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Rating</Label>
                        <div className="mt-2 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onMouseEnter={() => setHoverRating(n)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setRating(n)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star className={`h-7 w-7 ${n <= (hoverRating || rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                            </button>
                          ))}
                          <span className="ml-2 text-sm font-medium">{hoverRating || rating}/5</span>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="review-title">Title (optional)</Label>
                        <Input id="review-title" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Summary of your experience" maxLength={100} />
                      </div>
                      <div>
                        <Label htmlFor="review-body">Your review (optional)</Label>
                        <Textarea id="review-body" value={reviewBody} onChange={(e) => setReviewBody(e.target.value)} placeholder="Share your experience working at or with this company..." rows={4} maxLength={1000} />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                      <Button onClick={submitReview} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
                        Submit Review
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )
            )}
            {!user && (
              <Button asChild variant="outline" size="sm">
                <Link href="/login"><Star className="mr-2 h-4 w-4" /> Sign in to review</Link>
              </Button>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {reviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.title && <p className="mt-3 font-medium">{r.title}</p>}
                    {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                    <p className="mt-3 text-xs text-muted-foreground">— {r.reviewer_name}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review this company!</p>
              </CardContent>
            </Card>
          )}
        </div>

        <h2 className="mb-4 font-display text-xl font-bold">Open positions ({jobs.length})</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`}>
              <Card className="group transition-all hover:border-primary/40 hover:shadow-md">
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="font-semibold group-hover:text-primary">{job.title}</p>
                    <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.work_mode}</span>
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {job.job_type.replace('_', '-')}</span>
                    </div>
                  </div>
                  <Badge variant="secondary">{job.location}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">No open positions right now.</p>}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
