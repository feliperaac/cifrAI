import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const PathIcon = () => (
  <Svg>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-4h6" />
  </Svg>
);

export const TunerIcon = () => (
  <Svg>
    <path d="M4 18a8 8 0 0 1 16 0" />
    <path d="M12 18l4-6" />
  </Svg>
);

export const ProfileIcon = () => (
  <Svg>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
);
