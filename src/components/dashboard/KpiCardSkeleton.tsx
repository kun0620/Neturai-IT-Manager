import { Skeleton } from '@/components/ui/skeleton';

interface KpiCardSkeletonProps {
  count?: number;
}

export function KpiCardSkeleton({ count = 8 }: KpiCardSkeletonProps) {
  const patterns = [
    { title: 'w-24', value: 'w-14', desc: 'w-40', trend: 'w-20' },
    { title: 'w-28', value: 'w-16', desc: 'w-36', trend: 'w-24' },
    { title: 'w-20', value: 'w-12', desc: 'w-44', trend: 'w-16' },
    { title: 'w-24', value: 'w-16', desc: 'w-32', trend: 'w-24' },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => {
        const p = patterns[index % patterns.length];
        return (
        <div
          key={index}
          className="h-full min-h-[148px] rounded-xl border border-border/80 bg-card/90 p-6 shadow-sm"
        >
          <div className="mb-4 flex items-start justify-between">
            <Skeleton className={`h-3 ${p.title} rounded-sm`} />
            <div className="rounded-md border border-border/70 bg-muted/40 p-1.5">
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
          </div>

          <div className="flex min-h-[88px] flex-col gap-2">
            <Skeleton className={`h-8 ${p.value}`} />
            <Skeleton className={`h-4 ${p.desc}`} />
            <div className="mt-auto">
              <Skeleton className={`h-6 ${p.trend} rounded-md`} />
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
