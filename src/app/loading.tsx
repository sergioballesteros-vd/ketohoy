export default function Loading() {
  return (
    <div className="min-h-screen px-5 pt-12 pb-8 animate-pulse">
      {/* Hero Skeleton */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="h-8 bg-forest-800 rounded-lg w-32 mb-4"></div>
          <div className="h-6 bg-forest-800 rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-forest-800 rounded-lg w-40"></div>
        </div>
        <div className="w-10 h-10 bg-forest-800 rounded-xl"></div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-4 bg-forest-800 border border-forest-700 h-24"></div>
        ))}
      </div>

      {/* Primary CTA Skeleton */}
      <div className="mb-3">
        <div className="h-24 bg-forest-800 rounded-2xl border border-forest-700"></div>
      </div>

      {/* Secondary CTAs Skeleton */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-forest-800 rounded-2xl border border-forest-700"></div>
        ))}
      </div>
    </div>
  )
}
