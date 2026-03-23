import { Skeleton } from "@/components/ui/skeleton";

export const StatCardSkeleton = () => (
  <div className="p-3 sm:p-4 rounded-xl bg-card border border-border">
    <div className="flex items-center gap-3">
      <Skeleton className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-6 w-16 mb-1" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
    <Skeleton className="h-2.5 w-20 mt-2" />
  </div>
);

export const ProjectCardSkeleton = () => (
  <div className="rounded-xl overflow-hidden bg-card border border-border">
    <Skeleton className="aspect-[4/3] w-full" />
    <div className="p-4">
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/3 mb-3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="rounded-xl bg-card border border-border p-4">
    <Skeleton className="h-3 w-32 mb-4" />
    <Skeleton className="h-[180px] w-full rounded-lg" />
  </div>
);
