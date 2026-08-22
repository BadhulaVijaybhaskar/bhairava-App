import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-1">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-[108px] rounded-xl" />
        <Skeleton className="h-[108px] rounded-xl" />
        <Skeleton className="col-span-2 h-[108px] rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-56 rounded-xl lg:col-span-3" />
        <Skeleton className="h-56 rounded-xl lg:col-span-2" />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
