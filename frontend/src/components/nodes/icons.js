const iconProps = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

export const InputIcon = () => (
  <svg {...iconProps}>
    <path d="M4 12h16M12 4v16" />
  </svg>
);

export const OutputIcon = () => (
  <svg {...iconProps}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const LLMIcon = () => (
  <svg {...iconProps}>
    <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
    <path d="M8 14v2a4 4 0 0 0 8 0v-2" />
    <line x1="12" y1="20" x2="12" y2="22" />
  </svg>
);

export const TextIcon = () => (
  <svg {...iconProps}>
    <path d="M4 7V4h16v3" />
    <line x1="12" y1="4" x2="12" y2="20" />
    <line x1="8" y1="20" x2="16" y2="20" />
  </svg>
);

export const ApiIcon = () => (
  <svg {...iconProps}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

export const ConditionIcon = () => (
  <svg {...iconProps}>
    <path d="M16 3h5v5" />
    <path d="M8 3H3v5" />
    <path d="M21 3l-9 9" />
    <path d="M3 3l9 9" />
  </svg>
);

export const DatabaseIcon = () => (
  <svg {...iconProps}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

export const MathIcon = () => (
  <svg {...iconProps}>
    <line x1="5" y1="9" x2="19" y2="9" />
    <line x1="12" y1="3" x2="12" y2="21" />
  </svg>
);

export const NotificationIcon = () => (
  <svg {...iconProps}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);
