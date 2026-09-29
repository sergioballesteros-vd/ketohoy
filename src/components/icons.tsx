type IconProps = { size?: number; className?: string; style?: React.CSSProperties }

const icon = (path: React.ReactNode) =>
  function Icon({ size = 20, className, style }: IconProps) {
    return (
      <svg
        width={size} height={size} viewBox="0 0 24 24"
        fill="none" stroke="currentColor"
        strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
        className={className} style={style}
        aria-hidden="true"
      >
        {path}
      </svg>
    )
  }

export const HomeIcon = icon(<>
  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
  <polyline points="9 22 9 12 15 12 15 22"/>
</>)

export const PantryIcon = icon(<>
  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
  <line x1="12" y1="22.08" x2="12" y2="12"/>
</>)

export const MealsIcon = icon(<>
  <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/>
  <path d="M7 2v20"/>
  <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3"/>
  <path d="M21 15v7"/>
</>)

export const CartIcon = icon(<>
  <circle cx="8" cy="21" r="1"/>
  <circle cx="19" cy="21" r="1"/>
  <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
</>)

export const CalendarIcon = icon(<>
  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
  <line x1="16" x2="16" y1="2" y2="6"/>
  <line x1="8" x2="8" y1="2" y2="6"/>
  <line x1="3" x2="21" y1="10" y2="10"/>
  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
</>)

export const ClockIcon = icon(<>
  <circle cx="12" cy="12" r="10"/>
  <polyline points="12 6 12 12 16 14"/>
</>)

export const ZapIcon = icon(
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
)

export const CheckIcon = icon(<>
  <polyline points="20 6 9 17 4 12"/>
</>)

export const CloseIcon = icon(<>
  <path d="M18 6 6 18"/>
  <path d="m6 6 12 12"/>
</>)

export const ChevronRightIcon = icon(
  <path d="m9 18 6-6-6-6"/>
)

export const RefreshIcon = icon(<>
  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
  <path d="M21 3v5h-5"/>
  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
  <path d="M8 16H3v5"/>
</>)

export const SettingsIcon = icon(<>
  <circle cx="12" cy="12" r="3"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</>)

export const ExploreIcon = icon(<>
  <circle cx="12" cy="12" r="10"/>
  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
</>)

/** KetoHoy isotipo (brand pack, public/brand/ketohoy-mark.svg). Geometry must not be altered; `size` is the height. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={(size * 160) / 180} height={size} viewBox="0 0 160 180" fill="none" aria-hidden="true">
      <g stroke="#a3e635" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 30C53 37 42 52 36 69C28 91 29 116 41 137C51 155 68 164 84 164" />
        <path d="M113 40C126 55 134 76 135 98C136 122 126 145 108 156C101 160 93 163 84 164" />
      </g>
      <path d="M67 30C75 12 97 8 116 18C108 36 88 42 67 30Z" fill="#a3e635" />
      <ellipse cx="82" cy="111" rx="24" ry="27" fill="#a3e635" />
      <ellipse cx="82" cy="111" rx="6" ry="6.5" fill="#0c1a0d" />
    </svg>
  )
}
