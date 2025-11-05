import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5 pb-4">
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-muted rounded"></div>
            <div className="h-3 w-5/6 bg-muted rounded"></div>
            <div className="h-3 w-1/2 bg-muted rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
