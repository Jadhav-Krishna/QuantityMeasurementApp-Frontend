type BalanceLogoProps = {
  className?: string;
};

export function BalanceLogo({ className = "" }: BalanceLogoProps) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true" focusable="false">
      <circle cx="120" cy="18" r="12" fill="#0b0b0b" />
      <rect x="112" y="30" width="16" height="18" rx="7" fill="#0b0b0b" />
      <rect x="108" y="48" width="24" height="58" rx="8" fill="#2c78d0" />
      <path d="M38 72c12-12 28-14 48-8 24 8 38 8 68-2 17-6 31-4 48 10" fill="none" stroke="#0b0b0b" strokeWidth="12" strokeLinecap="round" />
      <path d="M40 72c2 10 2 16-4 24" fill="none" stroke="#0b0b0b" strokeWidth="8" strokeLinecap="round" />
      <path d="M201 73c-2 10-2 16 4 24" fill="none" stroke="#0b0b0b" strokeWidth="8" strokeLinecap="round" />
      <rect x="112" y="98" width="16" height="102" rx="8" fill="#0b0b0b" />
      <path d="M112 98c4-9 12-9 16 0" fill="#0b0b0b" />
      <path d="M44 98v16" stroke="#18b837" strokeWidth="4" strokeLinecap="round" />
      <path d="M196 98v16" stroke="#0b0b0b" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 114v18M34 114l-8 48M54 114l28 48" stroke="#1c1c1c" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M196 114v18M186 114l-28 48M206 114l8 48" stroke="#1c1c1c" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M20 164c16 10 49 10 65 0-7 19-17 28-32 28s-26-9-33-28Z" fill="#0b0b0b" />
      <path d="M157 164c16 10 49 10 65 0-7 19-17 28-32 28s-26-9-33-28Z" fill="#0b0b0b" />
      <path d="M20 164c22-4 44-4 65 0" fill="#2c78d0" />
      <path d="M157 164c22-4 44-4 65 0" fill="#2c78d0" />
      <path d="M96 200h48c10 0 16 4 16 10v12H80v-12c0-6 6-10 16-10Z" fill="#0b0b0b" />
      <path d="M90 222h60c14 0 24 4 24 10v8H66v-8c0-6 10-10 24-10Z" fill="#0b0b0b" />
      <path d="M105 201h30l-6 10h-18l-6-10Z" fill="#2c78d0" />
    </svg>
  );
}
