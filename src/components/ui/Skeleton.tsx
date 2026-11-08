interface SkeletonProps {
  rows?: number;
}

export function Skeleton({ rows = 3 }: SkeletonProps) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="shimmer h-4 w-full rounded-[var(--radius-small)] bg-surface-2" />
      ))}
    </div>
  );
}
