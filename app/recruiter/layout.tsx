'use client';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardShell } from '@/components/dashboard-shell';

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowed={['recruiter']}>
      <DashboardShell>{children}</DashboardShell>
    </RouteGuard>
  );
}
