import Link from 'next/link';
import { Briefcase } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Briefcase className="h-4 w-4" />
              </span>
              <span>
                CareerConnect <span className="text-accent">AI</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              AI-powered job and internship portal for the modern workforce.
            </p>
          </div>
          {[
            { title: 'For Candidates', links: ['Browse Jobs', 'Companies', 'AI Assistant', 'Resume Tools'] },
            { title: 'For Recruiters', links: ['Post a Job', 'Manage Applicants', 'AI Screening', 'Analytics'] },
            { title: 'Company', links: ['About', 'Contact', 'Privacy', 'Terms'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CareerConnect AI. Built for demonstration purposes.
        </div>
      </div>
    </footer>
  );
}
