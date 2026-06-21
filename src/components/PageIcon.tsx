import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { clsx } from "clsx";
import { LUCIDE_ICON_MAP } from "./pageIconPack";
import { DEFAULT_PAGE_ICON } from "../constants/icons";
import { isIconUrl, resolveLucideIconName } from "../utils/pageIcon";

const SIZE_MAP = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 22,
  xl: 48,
} as const;

const LINKED_PADDING = {
  xs: 2,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 8,
} as const;

interface PageIconProps {
  icon: string;
  size?: keyof typeof SIZE_MAP;
  className?: string;
  imgClassName?: string;
}

export function PageIcon({
  icon,
  size = "sm",
  className,
  imgClassName,
}: PageIconProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const pixelSize = SIZE_MAP[size];
  const padding = LINKED_PADDING[size];

  useEffect(() => {
    setImageFailed(false);
  }, [icon]);

  if (isIconUrl(icon) && !imageFailed) {
    const innerSize = Math.max(pixelSize - padding * 2, 10);
    return (
      <span
        className={clsx("page-icon-linked", className)}
        style={{
          width: pixelSize + padding * 2,
          height: pixelSize + padding * 2,
        }}
      >
        <img
          src={icon}
          alt=""
          className={imgClassName}
          style={{ width: innerSize, height: innerSize }}
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  const lucideName = resolveLucideIconName(icon || DEFAULT_PAGE_ICON);
  if (lucideName) {
    const LucideIcon = LUCIDE_ICON_MAP[lucideName] ?? FileText;
    return (
      <LucideIcon
        size={pixelSize}
        strokeWidth={1.75}
        className={clsx("page-icon-lucide", className)}
      />
    );
  }

  if (!icon) {
    const Fallback = LUCIDE_ICON_MAP["file-text"] ?? FileText;
    return (
      <Fallback
        size={pixelSize}
        strokeWidth={1.75}
        className={clsx("page-icon-lucide", className)}
      />
    );
  }

  return (
    <span
      className={clsx("flex-shrink-0 leading-none select-none", className)}
      style={{ fontSize: pixelSize }}
    >
      {icon}
    </span>
  );
}
