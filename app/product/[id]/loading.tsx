export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 pt-8 sm:px-6" aria-busy="true" aria-label="Loading product">
      <div className="h-4 w-48 rounded bg-surface" />
      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
        <div className="aspect-square rounded-3xl bg-surface" />
        <div className="space-y-4">
          <div className="h-10 w-2/3 rounded-lg bg-surface" />
          <div className="h-5 w-1/2 rounded bg-surface" />
          <div className="h-8 w-24 rounded bg-surface" />
          <div className="mt-8 h-12 w-full rounded-full bg-surface" />
        </div>
      </div>
    </div>
  );
}
