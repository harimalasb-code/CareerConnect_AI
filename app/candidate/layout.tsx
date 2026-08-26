'use client';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardShell } from '@/components/dashboard-shell';

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowed={['candidate']}>
      <DashboardShell>{children}</DashboardShell>
    </RouteGuard>
  );
}
