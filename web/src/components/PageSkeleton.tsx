export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-4 px-4 py-10">
      <div className="h-8 w-1/3 rounded-lg bg-line" />
      <div className="h-4 w-1/2 rounded bg-line" />
      <div className="h-64 rounded-2xl bg-line/70" />
    </div>
  );
}
