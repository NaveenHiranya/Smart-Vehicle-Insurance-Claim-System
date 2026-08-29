import { Shield, Camera, Wrench, Zap } from 'lucide-react';
import { CarIllustration } from './CarIllustration';

const features = [
  { icon: Camera, title: 'AI damage assessment', text: 'Snap a few photos and AI prices the repair in minutes.' },
  { icon: Wrench, title: 'Trusted garage network', text: 'Choose a verified garage for the on-site inspection.' },
  { icon: Zap, title: 'Flash-fast settlements', text: 'Track every step until the payout lands.' },
];

// Shared visual identity for the user auth pages: the illustrated brand panel of
// the desktop split screen, plus the compact logo header shown above the form on
// mobile. Used by both LoginPage and RegisterPage so the theme stays identical.
export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 p-8 text-white lg:flex lg:flex-col lg:justify-between xl:p-10">
      {/* soft light blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" />
      {/* dotted texture */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
        <defs>
          <pattern id="auth-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#auth-dots)" />
      </svg>

      {/* brand */}
      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">Flash Claim</p>
          <p className="text-xs text-primary-100">Smart Vehicle Insurance</p>
        </div>
      </div>

      {/* illustration + copy — sized so the panel fits common laptop heights without scrolling */}
      <div className="relative my-auto">
        <h2 className="max-w-md text-2xl font-bold leading-tight xl:text-3xl">
          Your vehicle, protected <span className="text-sky-200">in a flash.</span>
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-primary-100">
          File a claim straight from the roadside, let AI assess the damage, and get back on the road sooner.
        </p>

        <div className="mt-6 animate-float xl:mt-8">
          <div className="flex h-36 justify-center xl:h-40">
            <CarIllustration className="h-full w-auto max-w-full drop-shadow-2xl" />
          </div>
        </div>

        <ul className="mt-6 space-y-3 xl:mt-8">
          {features.map((f) => (
            <li key={f.title} className="flex items-start gap-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-sm text-primary-100/90">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* trust stats — dropped on short viewports so the panel never forces scrolling */}
      <div className="relative hidden items-center gap-6 [@media(min-height:700px)]:flex">
        <div>
          <p className="text-2xl font-bold">3 min</p>
          <p className="text-xs text-primary-100">average claim filing</p>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div>
          <p className="text-2xl font-bold">24/7</p>
          <p className="text-xs text-primary-100">claim tracking</p>
        </div>
        <div className="h-10 w-px bg-white/20" />
        <div>
          <p className="text-2xl font-bold">100%</p>
          <p className="text-xs text-primary-100">digital process</p>
        </div>
      </div>
    </div>
  );
}

// Compact brand header shown above the auth form on mobile screens
export function AuthMobileBrand() {
  return (
    <div className="mb-8 flex flex-col items-center text-center lg:hidden">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-lg shadow-primary-600/30">
        <Shield className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-gray-900">Flash Claim</h1>
      <p className="mt-0.5 text-sm text-gray-500">Smart vehicle insurance claims</p>
    </div>
  );
}
