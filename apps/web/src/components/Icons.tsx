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

export const FlameIcon = () => (
  <Svg>
    <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 .3 1.2 1 2 2 2 0-3-.5-5 1-8z" />
  </Svg>
);

export const LockIcon = () => (
  <Svg>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const PlayIcon = () => (
  <Svg>
    <path d="M8 5l11 7-11 7z" />
  </Svg>
);
