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
