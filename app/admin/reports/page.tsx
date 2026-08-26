'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Flag, CheckCircle2, XCircle, Loader2, Clock, AlertTriangle, Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

type Report = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter_name: string | null;
};

type Review = {
  id: string;
  company_id: string;
  company_name: string;
  reviewer_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: string;
  created_at: string;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Pending' },
  reviewing: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Reviewing' },
  resolved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Resolved' },
  dismissed: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Dismissed' },
};

const reviewStatusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Pending' },
  approved: { color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', label: 'Approved' },
  rejected: { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Rejected' },
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </div>
  );
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [activeTab, setActiveTab] = useState('reports');

  const load = useCallback(async () => {
    setLoading(true);
    const [repRes, revRes] = await Promise.all([
      supabase
        .from('reports')
        .select(`id, target_type, target_id, reason, status, created_at, reported_by, profiles!reports_reported_by_fkey ( full_name )`)
        .order('created_at', { ascending: false }),
      supabase
        .from('company_reviews')
        .select(`id, company_id, rating, title, body, status, created_at, reviewer_id, profiles!company_reviews_reviewer_id_fkey ( full_name ), companies!company_reviews_company_id_fkey ( name )`)
        .order('created_at', { ascending: false }),
    ]);

    setReports(
      (repRes.data ?? []).map((r) => ({
        id: r.id,
        target_type: r.target_type,
        target_id: r.target_id,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
        reporter_name: ((r as Record<string, unknown>).profiles as { full_name: string } | null)?.full_name ?? null,
      })),
    );

    setReviews(
      (revRes.data ?? []).map((r) => {
        const obj = r as Record<string, unknown>;
        return {
          id: obj.id as string,
          company_id: obj.company_id as string,
          company_name: ((obj.companies as { name: string } | null)?.name) ?? 'Unknown',
          reviewer_name: ((obj.profiles as { full_name: string } | null)?.full_name) ?? null,
          rating: obj.rating as number,
          title: (obj.title as string | null) ?? null,
          body: (obj.body as string | null) ?? null,
          status: obj.status as string,
          created_at: obj.created_at as string,
        };
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateReportStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('reports').update({ status: newStatus }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    toast.success(`Report ${newStatus}`);
  };

  const updateReviewStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('company_reviews').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    toast.success(`Review ${newStatus}`);
  };

  const filteredReports = reports.filter((r) => filter === 'all' || r.status === filter);
  const reportCounts: Record<string, number> = { all: reports.length };
  reports.forEach((r) => { reportCounts[r.status] = (reportCounts[r.status] ?? 0) + 1; });

  const filteredReviews = reviews.filter((r) => reviewFilter === 'all' || r.status === reviewFilter);
  const reviewCounts: Record<string, number> = { all: reviews.length };
  reviews.forEach((r) => { reviewCounts[r.status] = (reviewCounts[r.status] ?? 0) + 1; });

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Reports &amp; Reviews</h1>
        <p className="mt-1 text-muted-foreground">Review user-submitted reports and moderate company reviews</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="reports" className="gap-2"><Flag className="h-4 w-4" /> Reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="reviews" className="gap-2"><MessageSquare className="h-4 w-4" /> Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6 space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Flag className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No reports submitted</p>
                <p className="text-sm text-muted-foreground">User reports will appear here for review.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="pending">Pending ({reportCounts.pending ?? 0})</TabsTrigger>
                  <TabsTrigger value="reviewing">Reviewing ({reportCounts.reviewing ?? 0})</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved ({reportCounts.resolved ?? 0})</TabsTrigger>
                  <TabsTrigger value="dismissed">Dismissed ({reportCounts.dismissed ?? 0})</TabsTrigger>
                  <TabsTrigger value="all">All ({reportCounts.all})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-3">
                {filteredReports.map((r) => {
                  const cfg = statusConfig[r.status] ?? { color: 'bg-secondary', label: r.status };
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">{r.target_type}</Badge>
                              <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                            </div>
                            <p className="mt-2 text-sm font-medium">{r.reason}</p>
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}</span>
                              {r.reporter_name && <span>by {r.reporter_name}</span>}
                              <span className="font-mono">ID: {r.target_id.slice(0, 8)}…</span>
                            </div>
                          </div>
                          {r.status === 'pending' || r.status === 'reviewing' ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => updateReportStatus(r.id, 'reviewing')}>
                                <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Review
                              </Button>
                              <Button size="sm" variant="default" onClick={() => updateReportStatus(r.id, 'resolved')}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
                              </Button>
                              <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => updateReportStatus(r.id, 'dismissed')}>
                                <XCircle className="h-3.5 w-3.5" /> Dismiss
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => updateReportStatus(r.id, 'pending')}>
                              Reopen
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="mt-6 space-y-4">
          {reviews.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium">No reviews submitted</p>
                <p className="text-sm text-muted-foreground">Company reviews will appear here for moderation.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Tabs value={reviewFilter} onValueChange={setReviewFilter}>
                <TabsList className="flex-wrap">
                  <TabsTrigger value="pending">Pending ({reviewCounts.pending ?? 0})</TabsTrigger>
                  <TabsTrigger value="approved">Approved ({reviewCounts.approved ?? 0})</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected ({reviewCounts.rejected ?? 0})</TabsTrigger>
                  <TabsTrigger value="all">All ({reviewCounts.all})</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-3">
                {filteredReviews.map((r) => {
                  const cfg = reviewStatusConfig[r.status] ?? { color: 'bg-secondary', label: r.status };
                  return (
                    <Card key={r.id}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{r.company_name}</span>
                              <Stars rating={r.rating} />
                              <Badge className={cfg.color} variant="secondary">{cfg.label}</Badge>
                            </div>
                            {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                            {r.body && <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>}
                            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}</span>
                              {r.reviewer_name && <span>by {r.reviewer_name}</span>}
                            </div>
                          </div>
                          {r.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="default" onClick={() => updateReviewStatus(r.id, 'approved')}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                              </Button>
                              <Button size="sm" variant="ghost" className="hover:text-destructive" onClick={() => updateReviewStatus(r.id, 'rejected')}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => updateReviewStatus(r.id, 'pending')}>
                              Reopen
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
