'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { PublicNav } from '@/components/public-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const demoAccounts = [
  { role: 'Admin', email: 'admin@careerconnect.ai', password: 'CareerConnect2026!' },
  { role: 'Recruiter', email: 'sarah@techcorp.com', password: 'CareerConnect2026!' },
  { role: 'Candidate', email: 'alex.kim@student.edu', password: 'CareerConnect2026!' },
];

export default function LoginPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    await refreshProfile();
    toast.success('Welcome back!');
    router.push('/dashboard-redirect');
  };

  const fillDemo = (acc: { email: string; password: string }) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-muted/40 to-background">
      <PublicNav />
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left — brand / value prop */}
          <div className="hidden flex-col gap-6 lg:flex">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Briefcase className="h-6 w-6" />
              </span>
              <span className="font-display text-2xl font-bold">
                CareerConnect <span className="text-accent">AI</span>
              </span>
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance">
              The AI-powered way to <span className="text-primary">hire</span> and{' '}
              <span className="text-accent">get hired</span>.
            </h1>
            <p className="text-lg text-muted-foreground">
              Smart resume analysis, job matching, and interview prep — built for candidates,
              recruiters, and companies.
            </p>
            <div className="flex flex-col gap-3 text-sm">
              {['AI resume & ATS scoring', 'Intelligent job matching', 'Interview scheduling built-in'].map(
                (f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                      ✓
                    </span>
                    <span>{f}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Right — login form */}
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your CareerConnect AI account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={show ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-4 w-4" />
                  )}
                  Sign in
                </Button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-medium text-primary hover:underline">
                  Create one
                </Link>
              </p>

              {/* Demo credentials */}
              <Tabs defaultValue="demo" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  {demoAccounts.map((a) => (
                    <TabsTrigger key={a.role} value={a.role.toLowerCase()}>
                      {a.role}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {demoAccounts.map((a) => (
                  <TabsContent key={a.role} value={a.role.toLowerCase()} className="mt-3">
                    <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Demo {a.role} account — click to fill:
                      </p>
                      <button
                        type="button"
                        onClick={() => fillDemo(a)}
                        className="flex w-full flex-col gap-1 text-left text-sm hover:opacity-80"
                      >
                        <span className="font-medium">{a.email}</span>
                        <span className="text-muted-foreground">{a.password}</span>
                      </button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
