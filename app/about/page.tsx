'use client';

import Link from 'next/link';
import { PublicNav } from '@/components/public-nav';
import { SiteFooter } from '@/components/site-footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sparkles, Target, FileText, MessageSquare, Users, Building2,
  Brain, TrendingUp, ShieldCheck, Zap, Heart, Globe,
  ArrowRight, CheckCircle2, Briefcase, BarChart3,
} from 'lucide-react';

export default function AboutPage() {
  const values = [
    { icon: Brain, title: 'AI-first', desc: 'We believe artificial intelligence should augment human decisions, not replace them. Every feature is designed to make hiring more efficient and fair.' },
    { icon: ShieldCheck, title: 'Trust & Safety', desc: 'Verified companies, secure data handling, and admin moderation keep the platform safe for everyone.' },
    { icon: Heart, title: 'Candidate-centric', desc: 'Job seekers deserve tools that help them put their best foot forward — not gatekeepers that filter them out.' },
    { icon: Zap, title: 'Speed', desc: 'From application to interview, we eliminate friction at every step so connections happen faster.' },
    { icon: Globe, title: 'Accessibility', desc: 'Remote, hybrid, on-site — we support every work model and connect talent across geographies.' },
    { icon: TrendingUp, title: 'Transparency', desc: 'Match scores, ATS feedback, and screening criteria are visible to everyone, not hidden behind black boxes.' },
  ];

  const features = [
    { icon: FileText, title: 'Resume ATS Scoring', desc: 'Candidates get instant feedback on how their profile performs against applicant tracking systems, with actionable recommendations.' },
    { icon: Target, title: 'AI Job Matching', desc: 'Our matching engine compares candidate skills against job requirements and produces a fit score, so both sides know if it\'s worth pursuing.' },
    { icon: MessageSquare, title: 'Cover Letter Generator', desc: 'Generate personalized cover letters in seconds, pulled directly from your profile data and tailored to each job.' },
    { icon: Users, title: 'AI Candidate Screening', desc: 'Recruiters get applicants automatically ranked by fit score — combining skill match, experience, and profile strength.' },
    { icon: Brain, title: 'Interview Question Generator', desc: 'Generate technical, behavioral, or general interview questions tailored to any job posting\'s required skills.' },
    { icon: BarChart3, title: 'Platform Analytics', desc: 'Admins get real-time insights into user growth, job trends, application volumes, and top companies.' },
  ];

  const stats = [
    { label: 'AI tools', value: '6+' },
    { label: 'User roles', value: '3' },
    { label: 'Database tables', value: '15+' },
    { label: 'Full-stack routes', value: '40' },
  ];

  const steps = [
    { step: '01', title: 'Sign up & build your profile', desc: 'Choose your role — candidate or recruiter — and fill out your profile with skills, experience, education, and projects.' },
    { step: '02', title: 'Let AI analyze & match', desc: 'Our AI tools score your resume, match you with jobs, identify skill gaps, and generate application materials automatically.' },
    { step: '03', title: 'Apply, screen & connect', desc: 'Candidates apply with one click. Recruiters screen with AI-ranked lists. Both sides schedule interviews and move forward.' },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="container relative mx-auto px-4 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> Our Story
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-balance md:text-6xl">
              Reimagining hiring with <span className="text-primary">AI</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl text-balance">
              CareerConnect AI is a full-stack job portal built on the idea that hiring should be
              faster, fairer, and smarter — for candidates and recruiters alike.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Get started free
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/jobs">
                  Browse jobs <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-bold text-primary md:text-4xl">{s.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Our mission</h2>
          <p className="mt-6 text-lg text-muted-foreground text-balance">
            Traditional hiring is broken. Resumes disappear into black holes, recruiters drown in
            applications, and great candidates get filtered out by rigid software. We built
            CareerConnect AI to fix that — by making AI work for both sides of the table.
          </p>
          <p className="mt-4 text-lg text-muted-foreground text-balance">
            Candidates get tools that help them understand and improve their chances. Recruiters get
            automation that surfaces the right people. Everyone gets transparency.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Brain className="h-3.5 w-3.5 text-accent" /> What we built
            </Badge>
            <h2 className="font-display text-3xl font-bold md:text-4xl">AI tools for everyone</h2>
            <p className="mt-3 text-muted-foreground">
              Six AI-powered features that span the entire hiring journey — from resume to interview.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/60 transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">Three steps from sign-up to hired.</p>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.step} className="relative">
              <span className="font-display text-5xl font-bold text-primary/20">{s.step}</span>
              <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-border/60 bg-muted/30">
        <div className="container mx-auto px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Heart className="h-3.5 w-3.5 text-accent" /> What we value
            </Badge>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Principles behind the platform</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{v.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Built with modern technology</h2>
          <p className="mt-3 text-muted-foreground">
            A production-grade full-stack application using industry-standard tools.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Briefcase, name: 'Next.js 14', desc: 'App Router, Server Components' },
            { icon: Building2, name: 'Supabase', desc: 'Postgres, Auth, RLS, Storage' },
            { icon: Sparkles, name: 'Tailwind CSS', desc: 'Design system, dark mode' },
            { icon: BarChart3, name: 'Recharts', desc: 'Analytics & data visualization' },
          ].map((t) => (
            <Card key={t.name} className="text-center">
              <CardContent className="flex flex-col items-center p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <t.icon className="h-6 w-6" />
                </div>
                <p className="mt-3 font-medium">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl text-balance">
            Ready to experience AI-powered hiring?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/80">
            Join the platform that works for both sides. Create your free account today.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Create free account
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
