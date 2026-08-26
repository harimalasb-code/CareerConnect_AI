'use client';

import { RouteGuard } from '@/components/auth/route-guard';
import { DashboardShell } from '@/components/dashboard-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RouteGuard allowed={['admin']}>
      <DashboardShell>{children}</DashboardShell>
    </RouteGuard>
  );
}
