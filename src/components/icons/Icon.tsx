// Named SVG icon set. Stroke-based, 1.3-1.5 stroke width, mirrors the
// v2 dashboard's RowIcon vocabulary so the visual language reads as
// the same family.

export type IconName =
  | "market"
  | "questionId"
  | "collateral"
  | "curve"
  | "oracle"
  | "creator"
  | "start"
  | "end"
  | "image"
  | "outcomes"
  | "time"
  | "ancillary"
  | "edit"
  | "copy"
  | "close"
  | "plus"
  | "external"
  | "arrowLeft"
  | "check"
  | "chevronDown";

interface Props {
  name: IconName;
  size?: number;
  className?: string;
}

export function Icon({ name, size = 14, className }: Props) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (name) {
    case "market":
      return (
        <svg {...props}>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
          <path d="M2.5 6.5h11" />
        </svg>
      );
    case "questionId":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M6 6.5a2 2 0 014 0c0 1-1 1.3-1.6 1.7-.3.2-.4.5-.4.8" />
          <circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "collateral":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="5.5" />
          <text
            x="8"
            y="11"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fill="currentColor"
            stroke="none"
          >
            $
          </text>
        </svg>
      );
    case "curve":
      return (
        <svg {...props}>
          <path d="M2 13C 5 13, 5 4, 14 3" />
        </svg>
      );
    case "oracle":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="2.5" />
          <circle cx="8" cy="8" r="5.5" opacity="0.4" />
        </svg>
      );
    case "creator":
      return (
        <svg {...props}>
          <circle cx="8" cy="6" r="2.5" />
          <path d="M3 13.5c.6-2.5 2.7-3.5 5-3.5s4.4 1 5 3.5" />
        </svg>
      );
    case "start":
      return (
        <svg {...props}>
          <polygon points="4,3 13,8 4,13" fill="currentColor" stroke="none" />
        </svg>
      );
    case "end":
      return (
        <svg {...props}>
          <rect x="4" y="3" width="8" height="10" fill="currentColor" stroke="none" />
        </svg>
      );
    case "image":
      return (
        <svg {...props}>
          <rect x="2.5" y="3.5" width="11" height="9" rx="1" />
          <circle cx="6" cy="7" r="1.2" fill="currentColor" stroke="none" />
          <path d="M3 12L7 8L13 12" />
        </svg>
      );
    case "outcomes":
      return (
        <svg {...props}>
          <circle cx="4" cy="4" r="2" />
          <circle cx="12" cy="4" r="2" />
          <circle cx="8" cy="12" r="2" />
        </svg>
      );
    case "time":
      return (
        <svg {...props}>
          <circle cx="8" cy="8" r="6" />
          <path d="M8 4v4l3 2" />
        </svg>
      );
    case "ancillary":
      return (
        <svg {...props}>
          <path
            d="M3 3h10v3H3z M3 8h10v2H3z M3 11h7v2H3z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path d="M11 2L14 5L5 14L2 14L2 11Z" />
        </svg>
      );
    case "copy":
      return (
        <svg {...props}>
          <rect x="5" y="5" width="8" height="9" rx="1" />
          <path d="M11 5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v8a1 1 0 001 1h2" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M8 3v10M3 8h10" />
        </svg>
      );
    case "external":
      return (
        <svg {...props}>
          <path d="M9 3h4v4M13 3L7 9" />
          <path d="M11 9v4H3V5h4" />
        </svg>
      );
    case "arrowLeft":
      return (
        <svg {...props}>
          <path d="M10 4L6 8l4 4" />
          <path d="M6 8h7" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M3 8l3 3 7-7" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg {...props}>
          <path d="M4 6l4 4 4-4" />
        </svg>
      );
  }
}
