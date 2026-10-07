export function Bow({ className = "" }: { className?: string }) {
  return <svg className={className} width="56" height="54" viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M32 27C18 9 7 15 12 25c3 6 12 5 20 2Zm0 0C46 9 57 15 52 25c-3 6-12 5-20 2Z" />
      <path d="M30 29C25 41 21 47 16 50l10-3 4 7 4-25M35 29c6 11 10 18 15 22l-10-4-3 7-4-25" />
      <ellipse cx="32" cy="28" rx="3.5" ry="3" />
      <path d="M14 22c5-2 10 0 14 3m22-3c-5-2-10 0-14 3" />
    </g>
  </svg>;
}
