/**
 * Shown the moment a dashboard link is clicked, while the next page loads,
 * so the screen always answers the click.
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true">
      <div className="h-11 w-56 animate-pulse rounded-2xl bg-wax/80" />
      <div className="mt-3 h-5 w-80 max-w-full animate-pulse rounded-xl bg-wax/60" />
      <div className="mt-8 space-y-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-2xl bg-wax/70" />
        ))}
      </div>
    </div>
  )
}
