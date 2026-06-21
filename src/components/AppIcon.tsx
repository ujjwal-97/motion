import { clsx } from "clsx";

interface AppIconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 20, className }: AppIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={clsx("flex-shrink-0", className)}
      aria-hidden
    >
      <rect width="512" height="512" rx="108" fill="#FFFFFF" />
      <path
        fill="#111111"
        d="M118 378V134h62l70 128 70-128h62v244h-56V208l-64 118h-24l-64-118v170H118z"
      />
    </svg>
  );
}
