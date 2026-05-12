// Read-only timestamp display. Renders the canonical UTC string and
// exposes the viewer's local time via the native `title` tooltip on
// hover — mirroring the dashboard's UtcDate component (which uses a
// custom Tooltip to surface the same info).

import { formatLocal, formatUtc } from "../lib/format";

interface Props {
  unix: bigint | number;
  className?: string;
}

export function UtcDate({ unix, className }: Props) {
  const utc = formatUtc(unix);
  const local = formatLocal(unix);
  return (
    <span
      className={`mono pg-utc-date${className ? ` ${className}` : ""}`}
      data-tooltip={`Local: ${local}`}
    >
      {utc}
    </span>
  );
}
