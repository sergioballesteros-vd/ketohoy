// Shown by Next while any route segment streams in, so it stays neutral: title + photo block + rows.
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse px-5 pt-12" aria-busy="true">
      <div className="h-7 w-40 rounded-lg bg-forest-800" />
      <div className="mt-6 aspect-[4/3] rounded-3xl bg-forest-800" />
      <div className="mt-4 h-5 w-2/3 rounded-md bg-forest-800" />
      <div className="mt-2 h-4 w-1/2 rounded-md bg-forest-800" />
    </div>
  )
}
