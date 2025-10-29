interface DonkeyLogoProps {
  size?: number;
  className?: string;
}

export default function DonkeyLogo({ size = 32, className = "" }: DonkeyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Logo âne simple et reconnaissable - Design iconique */}
      
      {/* Corps simplifié */}
      <ellipse
        cx="38"
        cy="38"
        rx="18"
        ry="12"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.9"
      />
      
      {/* Cou */}
      <path
        d="M20 38 L18 32 L20 26"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Tête */}
      <ellipse
        cx="18"
        cy="20"
        rx="6"
        ry="8"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.9"
      />
      
      {/* Oreille arrière - TRÈS longue */}
      <path
        d="M16 12 L14 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.75"
      />
      
      {/* Oreille avant - TRÈS longue */}
      <path
        d="M20 12 L22 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Museau */}
      <ellipse
        cx="16"
        cy="26"
        rx="4"
        ry="3"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.85"
      />
      
      {/* Œil */}
      <circle
        cx="18"
        cy="18"
        r="1.5"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Patte avant */}
      <line
        x1="28"
        y1="50"
        x2="28"
        y2="60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Patte arrière */}
      <line
        x1="48"
        y1="50"
        x2="48"
        y2="60"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.9"
      />
      
      {/* Queue */}
      <path
        d="M56 38 Q58 40 60 44"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.8"
      />
      
      {/* Touffe queue */}
      <circle
        cx="61"
        cy="46"
        r="2"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  );
}