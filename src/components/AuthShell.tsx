import { LogoMark } from '@/components/icons'

export const authInput =
  'w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors bg-forest-800 border border-forest-700 text-forest-50 ' +
  'placeholder:text-forest-500 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20'

export const authButton =
  'flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#a3e635] text-[15px] font-bold text-forest-950 transition-opacity disabled:opacity-50'

/** Centered card used by the account-recovery pages. */
export default function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 pt-14 pb-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-center justify-center gap-3">
          <LogoMark size={40} />
          <span className="text-2xl font-extrabold text-forest-50" style={{ fontFamily: 'Syne, sans-serif' }}>
            KetoHoy
          </span>
        </div>
        <div className="mt-8 rounded-3xl border border-forest-700 bg-forest-900/80 p-5">
          <h1 className="text-xl font-extrabold text-forest-50">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  )
}
