import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-10" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  );
}

function PlaygroundSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-20" />
      <Skeleton className="flex-1" />
      <Skeleton className="h-24" />
    </div>
  );
}

export { PlaygroundSkeleton, TableSkeleton };
