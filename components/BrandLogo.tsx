import Image from 'next/image';

const LOGO_SRC = '/applymatic-logo.png';
/** Wordmark asset is wide; height drives display size. */
const LOGO_ASPECT = 3.35;

export const LOGO_HEIGHTS = {
  nav: 64,
  footer: 88,
  hero: 72,
} as const;

export type BrandLogoVariant = keyof typeof LOGO_HEIGHTS;

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  /** Display height in px (overrides variant). */
  height?: number;
  /** @deprecated Use `height` or `variant` */
  size?: number;
  className?: string;
  showName?: boolean;
  nameClassName?: string;
};

export default function BrandLogo({
  variant = 'nav',
  height,
  size,
  className = '',
  showName = false,
  nameClassName = '',
}: BrandLogoProps) {
  const displayHeight = height ?? size ?? LOGO_HEIGHTS[variant];
  const displayWidth = Math.round(displayHeight * LOGO_ASPECT);

  const variantClass = `brand-logo--${variant}`;

  return (
    <span
      className={`brand-logo ${variantClass} ${className}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <Image
        src={LOGO_SRC}
        alt="Applymatic"
        width={displayWidth}
        height={displayHeight}
        priority={variant === 'nav' || variant === 'hero'}
        className="brand-logo-image"
        style={{
          height: displayHeight,
          width: 'auto',
          objectFit: 'contain',
          flexShrink: 0,
        }}
      />
      {showName ? <span className={nameClassName}>Applymatic</span> : null}
    </span>
  );
}
