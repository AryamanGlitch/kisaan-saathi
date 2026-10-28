import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 28, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {children}
    </svg>
  );
}

export const IconBarn = (p: IconProps) => <Base {...p}><path d="M3 21V10l9-6 9 6v11z" /><path d="M9 21v-6h6v6" /></Base>;
export const IconSprout = (p: IconProps) => <Base {...p}><path d="M12 21v-9" /><path d="M12 12C12 8 9 5 4 5c0 4 3 7 8 7z" /><path d="M12 14c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6z" /></Base>;
export const IconSun = (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Base>;
export const IconLeaf = (p: IconProps) => <Base {...p}><path d="M5 19C5 10 11 4 20 4c0 9-6 15-15 15z" /><path d="M5 19l9-9" /></Base>;
export const IconLandmark = (p: IconProps) => <Base {...p}><path d="M3 21h18M5 21v-9M9.5 21v-9M14.5 21v-9M19 21v-9M2 10l10-6 10 6z" /></Base>;
export const IconBolt = (p: IconProps) => <Base {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Base>;
export const IconChat = (p: IconProps) => <Base {...p}><path d="M4 5h16v11H9l-5 4z" /></Base>;
export const IconPin = (p: IconProps) => <Base {...p}><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></Base>;
export const IconChevron = (p: IconProps) => <Base {...p}><path d="M9 6l6 6-6 6" /></Base>;
export const IconBack = (p: IconProps) => <Base {...p}><path d="M15 6l-6 6 6 6" /></Base>;
export const IconPhone = (p: IconProps) => <Base {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></Base>;
export const IconSoil = (p: IconProps) => <Base {...p}><path d="M3 9c3-2 6 2 9 0s6 2 9 0" /><path d="M3 14h18M3 19h18" /><circle cx="7" cy="16.5" r=".5" /><circle cx="15" cy="16.5" r=".5" /><path d="M12 9V3M12 3l-2 2M12 3l2 2" /></Base>;
export const IconCloud = (p: IconProps) => <Base {...p}><path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18z" /></Base>;
export const IconRain = (p: IconProps) => <Base {...p}><path d="M7 14h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.1 5.5 4.25 4.25 0 0 0 7 14z" /><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3" /></Base>;
