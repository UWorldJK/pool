// Icon paths from the v3 prototype, drawn on a 24px grid with a 1.7 stroke.
const paths = {
  lock: "M5 10h14v11H5V10Zm3 0V7a4 4 0 0 1 8 0v3m-4 4v3",
  home: "m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8",
  calendar: "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2ZM7 3v5m10-5v5M3 11h18m-14 4h2m4 0h2",
  users: "M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-3-3.8M16 3a4 4 0 0 1 0 8M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  plus: "M12 5v14M5 12h14",
  close: "m6 6 12 12M6 18 18 6",
  car: "m4 10 2-6h12l2 6M3 10h18v8H3V10Zm2 8v3m14-3v3M6 14h2m8 0h2",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  pin: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0",
  settings: "M12 8v8m-4-4h8M4 4h16v16H4V4Z",
  warning: "m12 3 10 18H2L12 3Zm0 6v5m0 3h.01",
  phone: "m5 3 4 1 1 5-2 2a14 14 0 0 0 5 5l2-2 5 1 1 4C12 24 0 12 5 3Z",
  leaf: "M20 3c-11 0-17 6-14 12s14 4 14-12ZM5 21 16 10",
  chevron: "m9 6 6 6-6 6",
  info: "M12 11v6m0-10h.01M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0",
  link: "M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1m2 5a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  out: "M15 4h4v16h-4M10 8l-4 4 4 4m-4-4h11",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function PoolMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 25V11a5 5 0 0 1 10 0v14M16 25V11a5 5 0 0 1 10 0v14M4 29h24"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
