// Decorative side-view car illustration shared by the user-facing auth screens
// and the dashboard hero — keeps the visual identity consistent across pages.
export function CarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 220" className={className} role="img" aria-label="Illustration of a car" fill="none">
      {/* road */}
      <line x1="24" y1="208" x2="456" y2="208" stroke="white" strokeOpacity="0.3" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 20" />
      {/* motion lines */}
      <g stroke="white" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round">
        <line x1="14" y1="92" x2="46" y2="92" />
        <line x1="6" y1="114" x2="42" y2="114" />
        <line x1="18" y1="136" x2="50" y2="136" />
      </g>
      {/* body */}
      <path
        d="M62 156 C62 126 88 118 112 114 L156 78 C166 64 180 58 196 58 H296 C314 58 328 66 338 80 L370 114 C398 120 424 130 428 148 V162 C428 169 423 174 416 174 H72 C65 174 62 169 62 162 Z"
        fill="white"
      />
      {/* windows */}
      <path d="M188 68 H240 V106 H164 Z" fill="#bae6fd" />
      <path d="M252 68 H296 C306 68 313 72 318 79 L342 106 H252 Z" fill="#bae6fd" />
      {/* window shine */}
      <path d="M232 68 L206 104" stroke="white" strokeWidth="9" strokeLinecap="round" opacity="0.7" fill="none" />
      <path d="M310 70 L292 102" stroke="white" strokeWidth="5" strokeLinecap="round" opacity="0.6" fill="none" />
      {/* door split + handles */}
      <path d="M246 112 V168" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="206" y="120" width="22" height="6" rx="3" fill="#cbd5e1" />
      <rect x="258" y="120" width="22" height="6" rx="3" fill="#cbd5e1" />
      {/* lights */}
      <path d="M402 122 C416 126 424 132 424 140 C424 146 419 149 412 148 L396 144 Z" fill="#fbbf24" />
      <path d="M64 126 L84 124 L84 142 L64 142 Z" fill="#f87171" />
      {/* flash badge */}
      <circle cx="330" cy="30" r="17" fill="#fbbf24" />
      <path d="M333 21 L322 35 H329 L326 46 L338 31 H331 Z" fill="white" />
      {/* wheels */}
      <circle cx="148" cy="174" r="28" fill="#0f172a" />
      <circle cx="148" cy="174" r="11" fill="#94a3b8" />
      <circle cx="148" cy="174" r="4" fill="#e2e8f0" />
      <circle cx="352" cy="174" r="28" fill="#0f172a" />
      <circle cx="352" cy="174" r="11" fill="#94a3b8" />
      <circle cx="352" cy="174" r="4" fill="#e2e8f0" />
    </svg>
  );
}
