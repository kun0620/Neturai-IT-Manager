import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  count?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 4,
  className,
}) => {
  const shimmerClass =
    'bg-[linear-gradient(90deg,hsl(var(--muted))_25%,hsl(var(--accent))_50%,hsl(var(--muted))_75%)] bg-[length:200%_100%] animate-shimmer rounded';

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5 pb-4">
            <div className={`h-4 w-3/4 ${shimmerClass}`}></div>
          </div>
          <div className="space-y-2">
            <div className={`h-3 w-full ${shimmerClass}`}></div>
            <div className={`h-3 w-5/6 ${shimmerClass}`}></div>
            <div className={`h-3 w-1/2 ${shimmerClass}`}></div>
          </div>
        </div>
      ))}
    </div>
  );
};
