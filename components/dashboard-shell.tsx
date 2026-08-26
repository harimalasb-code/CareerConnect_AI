'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Briefcase,
  LayoutDashboard,
  User,
  FileText,
  Search,
  Bookmark,
  Send,
  CalendarClock,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Building2,
  BriefcaseBusiness,
  Users,
  ShieldCheck,
  BarChart3,
  Flag,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NavItem = { href: string; label: string; icon: React.ElementType };

const navByRole: Record<string, NavItem[]> = {
  candidate: [
    { href: '/candidate', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/candidate/profile', label: 'My Profile', icon: User },
    { href: '/candidate/resume', label: 'Resume Manager', icon: FileText },
    { href: '/jobs', label: 'Browse Jobs', icon: Search },
    { href: '/candidate/saved', label: 'Saved Jobs', icon: Bookmark },
    { href: '/candidate/applications', label: 'Applications', icon: Send },
    { href: '/candidate/interviews', label: 'Interviews', icon: CalendarClock },
    { href: '/candidate/ai', label: 'AI Assistant', icon: Sparkles },
    { href: '/candidate/notifications', label: 'Notifications', icon: Bell },
    { href: '/candidate/settings', label: 'Settings', icon: Settings },
  ],
  recruiter: [
    { href: '/recruiter', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/recruiter/company', label: 'Company Profile', icon: Building2 },
    { href: '/recruiter/jobs', label: 'Manage Jobs', icon: BriefcaseBusiness },
    { href: '/recruiter/applicants', label: 'Applicants', icon: Users },
    { href: '/recruiter/interviews', label: 'Interviews', icon: CalendarClock },
    { href: '/recruiter/ai', label: 'AI Tools', icon: Sparkles },
    { href: '/recruiter/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/recruiter/notifications', label: 'Notifications', icon: Bell },
    { href: '/recruiter/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/companies', label: 'Companies', icon: Building2 },
    { href: '/admin/jobs', label: 'Job Moderation', icon: BriefcaseBusiness },
    { href: '/admin/reports', label: 'Reports', icon: Flag },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

const roleLabel: Record<string, string> = {
  candidate: 'Candidate',
  recruiter: 'Recruiter',
  admin: 'Admin',
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!profile) return null;

  const items = navByRole[profile.role] ?? [];
  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <SidebarContent
          items={items}
          pathname={pathname}
          role={profile.role}
          onNavigate={() => {}}
        />
      </aside>

      {/* Sidebar — mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setOpen(false)}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent
          items={items}
          pathname={pathname}
          role={profile.role}
          onNavigate={() => setOpen(false)}
        />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
          <button
            className="rounded-md p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full border border-border p-1 pr-3 transition-colors hover:bg-secondary">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:block">{profile.full_name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{profile.full_name}</span>
                  <span className="text-xs text-muted-foreground">{profile.email}</span>
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {roleLabel[profile.role]}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/${profile.role}/settings`)}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  items,
  pathname,
  role,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  role: string;
  onNavigate: () => void;
}) {
  return (
    <>
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Briefcase className="h-4 w-4" />
          </span>
          <span>
            CareerConnect <span className="text-accent">AI</span>
          </span>
        </Link>
        <button className="rounded-md p-1 lg:hidden" onClick={onNavigate} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {roleLabel[role]} Workspace
        </p>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2.5">
          {role === 'admin' ? (
            <ShieldCheck className="h-5 w-5 text-primary" />
          ) : role === 'recruiter' ? (
            <Building2 className="h-5 w-5 text-primary" />
          ) : (
            <User className="h-5 w-5 text-primary" />
          )}
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{roleLabel[role]} Account</span>
            <span className="text-xs text-muted-foreground">Secure session active</span>
          </div>
        </div>
      </div>
    </>
  );
}
