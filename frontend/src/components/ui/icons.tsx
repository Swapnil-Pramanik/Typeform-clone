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
      strokeWidth={1.85}
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

/* --- dashboard chrome ------------------------------------------------------ */

export const NavForms = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="M7 10h5M7 14h3M17 9.5v5" />
  </Icon>
);
export const NavContacts = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8.5" r="2.8" /><path d="M3.6 19a5.6 5.6 0 0 1 10.8 0" />
    <path d="M16 6.2a2.8 2.8 0 0 1 0 5.4M17.5 19a5 5 0 0 0-2-4" />
  </Icon>
);
export const NavAutomations = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="17" r="2.2" /><circle cx="17" cy="6.5" r="2.2" />
    <circle cx="17" cy="17" r="2.2" />
    <path d="M8 15.6 15 8.2M8.4 17h6.4" />
  </Icon>
);
export const NavInsights = (p: IconProps) => (
  <Icon {...p}><path d="M4 5v14h16" /><path d="m7 14 3.5-4 3 2.4L19 7" /></Icon>
);
export const NavResearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" /><path d="m20 20-3.4-3.4M11 8.4v5.2M8.4 11h5.2" />
  </Icon>
);
export const Integrations = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
    <path d="M17 14v6M14 17h6" />
  </Icon>
);
export const BrandKit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 9h17v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2Z" />
    <path d="M8.5 9V6.5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2V9" />
  </Icon>
);
export const Help = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.6a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.4" />
    <path d="M12 17h.01" />
  </Icon>
);
export const Workspaces = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" />
    <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" />
  </Icon>
);
export const Invite = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="10" cy="8.5" r="3" /><path d="M4 19a6 6 0 0 1 12 0" />
    <path d="M19 8v5M16.5 10.5h5" />
  </Icon>
);
export const Gem = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3 8 5.5-8 12.5L4 8.5Z" /><path d="m8.5 9 3.5 3 3.5-3" />
  </Icon>
);
export const Calendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 9.5h17M8 3.2v3.4M16 3.2v3.4" />
  </Icon>
);
export const Mic = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9.5" y="3" width="5" height="10" rx="2.5" />
    <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9.5 21h5" />
  </Icon>
);
export const Send = (p: IconProps) => (
  <Icon {...p}><path d="M5 4.5 20 12 5 19.5l3-7.5Z" /></Icon>
);
export const CaretUp = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none"><path d="m12 9 5 6H7Z" /></Icon>
);
export const CaretDown = (p: IconProps) => (
  <Icon {...p} fill="currentColor" stroke="none"><path d="m12 15 5-6H7Z" /></Icon>
);

export const Pencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16Z" /><path d="m14.5 7.5 2 2" />
  </Icon>
);
export const SortAlpha = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 4v15m0 0 3-3m-3 3-3-3" />
    <path d="M5 9h5L5 15h5" /><path d="M6.2 4h2.6l1.2 4H5Z" fill="none" />
  </Icon>
);

export const Palette = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H16a5 5 0 0 0 5-5c0-3.9-4-7-9-7Z" />
    <circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="14.5" cy="7.5" r="1" />
  </Icon>
);
export const Device = (p: IconProps) => (
  <Icon {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 18.5h3" />
  </Icon>
);
export const Play = (p: IconProps) => (
  <Icon {...p}><path d="M7 4.5 19 12 7 19.5Z" /></Icon>
);
// The figure sits inside a ring, as the real toolbar draws it — a bare figure
// at this size reads as a person, not as an accessibility check.
export const Accessibility = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="7.6" r="1.1" />
    <path d="M7.8 10.2h8.4M12 10.4v3.4m0 0-2 4.2m2-4.2 2 4.2" />
  </Icon>
);
/** Undo and redo, so the arrow curls back on itself and trails its history. */
export const Undo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13.5 19a7 7 0 1 0-6.8-8.7" />
    <path d="m3.6 6.2.7 4.6 4.6-.7" />
    <path d="M17.8 19.6h.01M20.6 17.4h.01M21.8 14h.01" />
  </Icon>
);
export const Translate = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 5.5h8M7.5 3.5v2M9.5 5.5c0 4-3 7-6 8" /><path d="M5 9.5c1.2 2.3 3 3.7 5 4.5" />
    <path d="m12.5 20.5 4-9 4 9M13.8 17.8h5.4" />
  </Icon>
);
// A cog, not a sun: the teeth are wedges off the rim, so it stays a gear at
// 17px instead of reading as the theme toggle two buttons away.
export const Settings = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.9 14.6a1.5 1.5 0 0 0 .3 1.65l.05.05a1.8 1.8 0 1 1-2.55 2.55l-.05-.05a1.5 1.5 0 0 0-1.65-.3 1.5 1.5 0 0 0-.9 1.37v.13a1.8 1.8 0 1 1-3.6 0v-.07a1.5 1.5 0 0 0-.98-1.37 1.5 1.5 0 0 0-1.65.3l-.05.05A1.8 1.8 0 1 1 6.27 16.4l.05-.05a1.5 1.5 0 0 0 .3-1.65 1.5 1.5 0 0 0-1.37-.9h-.13a1.8 1.8 0 1 1 0-3.6h.07a1.5 1.5 0 0 0 1.37-.98 1.5 1.5 0 0 0-.3-1.65l-.05-.05A1.8 1.8 0 1 1 8.66 4.97l.05.05a1.5 1.5 0 0 0 1.65.3h.07a1.5 1.5 0 0 0 .9-1.37v-.13a1.8 1.8 0 1 1 3.6 0v.07a1.5 1.5 0 0 0 .9 1.37 1.5 1.5 0 0 0 1.65-.3l.05-.05a1.8 1.8 0 1 1 2.55 2.55l-.05.05a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.9h.13a1.8 1.8 0 1 1 0 3.6h-.07a1.5 1.5 0 0 0-1.37.9Z" />
  </Icon>
);
export const Info = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></Icon>
);
/** The logic sections' glyphs: cut a question out, fork a path, add up a score. */
export const Scissors = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="6.5" r="2.2" />
    <circle cx="6" cy="17.5" r="2.2" />
    <path d="M8 7.6 19 17M8 16.4 19 7" />
  </Icon>
);
export const Branch = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12h4.5M8.5 12c2.5 0 2.5-5 5-5H19M8.5 12c2.5 0 2.5 5 5 5H19" />
    <circle cx="20.5" cy="7" r="1.6" />
    <circle cx="20.5" cy="17" r="1.6" />
  </Icon>
);
export const Calculator = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2.5" />
    <path d="M8.5 7.5h7M8.7 12h.01M12 12h.01M15.3 12h.01M8.7 16.4h.01M12 16.4h.01M15.3 16.4h.01" />
  </Icon>
);
export const Layers = (p: IconProps) => (
  <Icon {...p}><path d="m12 3 8 4.5-8 4.5-8-4.5Z" /><path d="m4 12.5 8 4.5 8-4.5" /></Icon>
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
