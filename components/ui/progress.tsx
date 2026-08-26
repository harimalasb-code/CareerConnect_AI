'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    role="progressbar"
    aria-valuenow={value ?? 0}
    aria-valuemin={0}
    aria-valuemax={100}
    className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)}
    {...props}
  >
    <div
      className="h-full rounded-full bg-primary transition-all duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };
