/**
 * Every icon in the app, as inline SVG.
 *
 * A whole icon package for two dozen glyphs is not worth the dependency, and
 * inline paths inherit `currentColor` so they theme for free.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      width={18}
      height={18}
      {...props}
    >
      {children}
    </svg>
  );
}

export const ChevronUp = (p: IconProps) => (
  <Icon {...p}><path d="m6 15 6-6 6 6" /></Icon>
);
export const ChevronDown = (p: IconProps) => (
  <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>
);
export const ChevronRight = (p: IconProps) => (
  <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>
);
export const ChevronLeft = (p: IconProps) => (
  <Icon {...p}><path d="m15 6-6 6 6 6" /></Icon>
);
export const Check = (p: IconProps) => (
  <Icon {...p}><path d="m20 6-11 11-5-5" /></Icon>
);
export const Plus = (p: IconProps) => (
  <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>
);
export const Close = (p: IconProps) => (
  <Icon {...p}><path d="M18 6 6 18M6 6l12 12" /></Icon>
);
export const Search = (p: IconProps) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icon>
);
export const Dots = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" />
  </Icon>
);
export const Drag = (p: IconProps) => (
  <Icon {...p} strokeWidth={2}>
    <circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" />
  </Icon>
);
export const Trash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icon>
);
export const Copy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </Icon>
);
export const Link = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </Icon>
);
export const Eye = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </Icon>
);
export const Star = ({ filled, ...p }: IconProps & { filled?: boolean }) => (
  <Icon {...p} fill={filled ? "currentColor" : "none"}>
    <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8Z" />
  </Icon>
);
export const Grid = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Icon>
);
export const List = (p: IconProps) => (
  <Icon {...p}><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" /></Icon>
);
export const Download = (p: IconProps) => (
  <Icon {...p}><path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16" /></Icon>
);
export const Sun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </Icon>
);
export const Moon = (p: IconProps) => (
  <Icon {...p}><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" /></Icon>
);
export const Lock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </Icon>
);
export const Sparkle = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6Z" />
    <path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z" />
  </Icon>
);

/* --- question-type glyphs ------------------------------------------------- */

export const TypeShortText = (p: IconProps) => (
  <Icon {...p}><path d="M4 8h16M4 13h10" /></Icon>
);
export const TypeLongText = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h16M4 12h16M4 17h9" /></Icon>
);
export const TypeChoice = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="8" r="2" /><circle cx="6" cy="16" r="2" />
    <path d="M11 8h9M11 16h9" />
  </Icon>
);
export const TypeDropdown = (p: IconProps) => (
  <Icon {...p}><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="m9 11 3 3 3-3" /></Icon>
);
export const TypeEmail = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.6 7 8.4 6 8.4-6" /></Icon>
);
export const TypeNumber = (p: IconProps) => (
  <Icon {...p}><path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16" /></Icon>
);
export const TypeYesNo = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="7" width="19" height="10" rx="5" /><circle cx="16.5" cy="12" r="3" /></Icon>
);
export const TypeRating = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 4 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4L7.5 17.8l.9-5L4.8 9.3l5-.7Z" />
  </Icon>
);
export const TypeEnding = (p: IconProps) => (
  <Icon {...p}><path d="M5 3v18" /><path d="M5 5h11l-2 3 2 3H5" /></Icon>
);
export const TypeWelcome = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M8 12h8M8 15h5" /></Icon>
);
export const TypePhone = (p: IconProps) => (
  <Icon {...p}><rect x="7" y="3" width="10" height="18" rx="2.5" /><path d="M11 18h2" /></Icon>
);
export const TypeDate = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);
export const TypeFile = (p: IconProps) => (
  <Icon {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" /><path d="M14 3v5h5" /></Icon>
);
export const TypePicture = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" />
    <path d="m4 17 5-4 4 3 3-2 4 3" />
  </Icon>
);
export const TypeScale = (p: IconProps) => (
  <Icon {...p}><path d="M3 16h18M6 16v-4M12 16V8M18 16v-6" /></Icon>
);
export const TypePayment = (p: IconProps) => (
  <Icon {...p}><rect x="2.5" y="6" width="19" height="12" rx="2" /><path d="M2.5 10h19" /></Icon>
);
