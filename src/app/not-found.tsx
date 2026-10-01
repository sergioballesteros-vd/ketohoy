import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="px-4 py-10">

      <h1 className="text-xl font-semibold text-forest-50">No encontramos esa página</h1>
      <p className="mt-1 text-sm text-forest-300">Puede que el enlace esté mal o que la receta ya no exista.</p>
      <Link
        href="/"
        className="mt-5 inline-flex h-11 items-center rounded-full bg-[#a3e635] px-5 text-sm font-semibold text-forest-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3e635]"
      >
        Volver al inicio
      </Link>
    </main>
  )
}
